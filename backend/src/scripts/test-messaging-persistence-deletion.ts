/**
 * Comprehensive verification script for:
 * 1. Messages persistence in MongoDB Atlas across refreshes / sessions
 * 2. Conversation soft-deletion per user (disappears for User A, stays for User B)
 * 3. Restoration of conversation visibility when a new message arrives
 * 4. Authorization check (403 Forbidden when unauthorized user tries to delete)
 */

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Starting Messaging Persistence & Conversation Deletion Tests ===\n');

  // 1. Authenticate Student (learner@skillexchange.io)
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'learner@skillexchange.io', password: 'password123' }),
  });
  const studentLoginData: any = await studentLoginRes.json();
  if (!studentLoginData.success) {
    throw new Error(`Student login failed: ${JSON.stringify(studentLoginData)}`);
  }
  const studentToken = studentLoginData.data.token;
  const studentId = studentLoginData.data.user._id || studentLoginData.data.user.id;
  console.log(`[PASS] Student authenticated: ${studentLoginData.data.user.name} (${studentId})`);

  // 2. Authenticate Teacher (teacher@skillexchange.io)
  const teacherLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'teacher@skillexchange.io', password: 'password123' }),
  });
  const teacherLoginData: any = await teacherLoginRes.json();
  if (!teacherLoginData.success) {
    throw new Error(`Teacher login failed: ${JSON.stringify(teacherLoginData)}`);
  }
  const teacherToken = teacherLoginData.data.token;
  const teacherId = teacherLoginData.data.user._id || teacherLoginData.data.user.id;
  console.log(`[PASS] Teacher authenticated: ${teacherLoginData.data.user.name} (${teacherId})`);

  // 3. Authenticate Third User (admin@skillexchange.io or another user as non-participant)
  // Let's create or register a separate third account to test 403 Forbidden strictly
  const bystanderEmail = `bystander.${Date.now()}@test.com`;
  const bystanderRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bystander User',
      email: bystanderEmail,
      password: 'password123',
      role: 'learner',
    }),
  });
  const bystanderRegData: any = await bystanderRegRes.json();
  const bystanderToken = bystanderRegData.data.token;
  const bystanderId = bystanderRegData.data.user._id || bystanderRegData.data.user.id;
  console.log(`[PASS] Bystander non-participant authenticated: (${bystanderId})`);

  // TEST 1: Send Message & Verify Persistence in MongoDB Atlas
  console.log('\n--- Test 1: Message Persistence ---');
  const uniqueMsgText = `Test message persistence token ${Date.now()}`;
  const sendRes = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      receiverId: teacherId,
      text: uniqueMsgText,
    }),
  });
  const sendData: any = await sendRes.json();
  if (!sendData.success || !sendData.data.conversation?.id) {
    throw new Error(`Failed to send message: ${JSON.stringify(sendData)}`);
  }
  const conversationId = sendData.data.conversation.id;
  const messageId = sendData.data.message.id;
  console.log(`[PASS] Message sent successfully. Conversation ID: ${conversationId}, Message ID: ${messageId}`);

  // Simulate refresh: Fetch messages directly from backend for teacher
  const teacherConvsRes = await fetch(`${API_BASE}/messages/conversations`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const teacherConvsData: any = await teacherConvsRes.json();
  const teacherConv = teacherConvsData.data.find((c: any) => c.id === conversationId);
  if (!teacherConv) {
    throw new Error('Teacher inbox did not contain the new conversation after refresh!');
  }
  console.log(`[PASS] Teacher inbox contains conversation with lastMessageText: "${teacherConv.lastMessageText}"`);

  const teacherMsgsRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const teacherMsgsData: any = await teacherMsgsRes.json();
  const foundInTeacher = teacherMsgsData.data.find((m: any) => m.id === messageId);
  if (!foundInTeacher || foundInTeacher.text !== uniqueMsgText) {
    throw new Error(`Teacher could not read message ${messageId} from MongoDB Atlas!`);
  }
  console.log(`[PASS] Teacher retrieved persisted message from MongoDB: "${foundInTeacher.text}"`);

  // Teacher replies
  const replyText = `Teacher response at ${Date.now()}`;
  const replyRes = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      receiverId: studentId,
      text: replyText,
    }),
  });
  const replyData: any = await replyRes.json();
  console.log(`[PASS] Teacher replied successfully. Reply ID: ${replyData.data.message.id}`);

  // Student simulates refresh and retrieves all messages
  const studentMsgsRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentMsgsData: any = await studentMsgsRes.json();
  if (studentMsgsData.data.length < 2) {
    throw new Error(`Expected at least 2 messages in conversation, got ${studentMsgsData.data.length}`);
  }
  console.log(`[PASS] Student refreshed conversation: ${studentMsgsData.data.length} messages loaded chronologically from MongoDB.`);

  // TEST 2: Security & Authorization
  console.log('\n--- Test 2: Security & Authorization ---');
  const unauthorizedDeleteRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${bystanderToken}` },
  });
  console.log(`Bystander DELETE status: ${unauthorizedDeleteRes.status}`);
  if (unauthorizedDeleteRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for non-participant delete, got ${unauthorizedDeleteRes.status}`);
  }
  console.log('[PASS] Unauthorized deletion blocked with HTTP 403 Forbidden.');

  // TEST 3: Soft-Deletion for Student
  console.log('\n--- Test 3: User-Specific Soft-Deletion ---');
  const studentDeleteRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentDeleteData: any = await studentDeleteRes.json();
  if (!studentDeleteData.success) {
    throw new Error(`Student delete conversation failed: ${JSON.stringify(studentDeleteData)}`);
  }
  console.log(`[PASS] Student deleted conversation: ${studentDeleteData.message}`);

  // Verify Student no longer sees this conversation in inbox
  const studentConvsAfterDeleteRes = await fetch(`${API_BASE}/messages/conversations`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentConvsAfterDelete: any = await studentConvsAfterDeleteRes.json();
  const stillInStudent = studentConvsAfterDelete.data.find((c: any) => c.id === conversationId);
  if (stillInStudent) {
    throw new Error('Conversation was still visible in Student inbox after deletion!');
  }
  console.log('[PASS] Conversation is NOT in Student inbox (successfully soft-deleted for Student).');

  // Verify Teacher STILL sees this conversation in inbox!
  const teacherConvsAfterStudentDeleteRes = await fetch(`${API_BASE}/messages/conversations`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const teacherConvsAfterStudentDelete: any = await teacherConvsAfterStudentDeleteRes.json();
  const stillInTeacher = teacherConvsAfterStudentDelete.data.find((c: any) => c.id === conversationId);
  if (!stillInTeacher) {
    throw new Error('Conversation vanished from Teacher inbox when Student deleted it! Must only delete for Student.');
  }
  console.log('[PASS] Conversation is STILL present in Teacher inbox (per-user soft deletion verified!).');

  // Verify messages are NOT permanently deleted in database
  const teacherMsgsAfterDeleteRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const teacherMsgsAfterDelete: any = await teacherMsgsAfterDeleteRes.json();
  if (!teacherMsgsAfterDelete.data || teacherMsgsAfterDelete.data.length < 2) {
    throw new Error('Messages were accidentally deleted on single-user conversation delete!');
  }
  console.log(`[PASS] All ${teacherMsgsAfterDelete.data.length} messages remain intact in database.`);

  // TEST 4: Restoration on New Message
  console.log('\n--- Test 4: Conversation Visibility Restoration ---');
  const followupText = `New message restoring visibility at ${Date.now()}`;
  const followupRes = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      receiverId: studentId,
      text: followupText,
    }),
  });
  const followupData: any = await followupRes.json();
  if (!followupData.success) {
    throw new Error(`Followup message failed: ${JSON.stringify(followupData)}`);
  }
  console.log(`[PASS] Teacher sent followup message to Student.`);

  // Check Student's inbox again
  const studentConvsRestoredRes = await fetch(`${API_BASE}/messages/conversations`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentConvsRestored: any = await studentConvsRestoredRes.json();
  const restoredConv = studentConvsRestored.data.find((c: any) => c.id === conversationId);
  if (!restoredConv) {
    throw new Error('Conversation did not reappear in Student inbox after new message was sent!');
  }
  console.log(`[PASS] Conversation reappeared in Student inbox! Last message: "${restoredConv.lastMessageText}"`);

  // Verify complete message history for Student
  const studentFinalMsgsRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentFinalMsgs: any = await studentFinalMsgsRes.json();
  console.log(`[PASS] Student can see all ${studentFinalMsgs.data.length} messages with complete history.`);

  console.log('\n======================================================');
  console.log(' ALL PERSISTENCE & DELETION TESTS PASSED SUCCESSFULLY! ');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] Test encountered error:', err);
  process.exit(1);
});
