import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = 'http://localhost:5000/api';

async function request(url: string, options: any = {}): Promise<{ status: number; ok: boolean; data: any }> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('====================================================');
  console.log('TEACHER SEARCH & DIRECT MESSAGING INTEGRATION AUDIT');
  console.log('====================================================\n');

  // Health check
  const health = await request(`${BASE_URL}/health`);
  if (!health.ok || health.data?.database?.status !== 'connected') {
    throw new Error('Backend database not connected');
  }
  console.log('[System Health] Backend API is UP and connected to MongoDB Atlas.\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set');
  const dbConn = await mongoose.createConnection(mongoUri).asPromise();
  const db: any = dbConn.db;

  // 1. Ensure Teacher B (Marcus Vance) and a second distinct Teacher C exist in MongoDB
  console.log('[Setup] Verifying test accounts in MongoDB Atlas...');
  const usersColl = db.collection('users');
  const skillsColl = db.collection('skills');

  // Ensure Teacher C: Dr. Claire Dupont
  const correctPasswordHash = await bcrypt.hash('password123', 10);
  let teacherC = await usersColl.findOne({ email: 'claire.dupont@skillexchange.io' });
  if (teacherC) {
    await usersColl.updateOne({ _id: teacherC._id }, { $set: { isSuspended: false, password: correctPasswordHash } });
  }
  if (!teacherC) {
    const inserted = await usersColl.insertOne({
      name: 'Dr. Claire Dupont',
      email: 'claire.dupont@skillexchange.io',
      password: correctPasswordHash,
      role: 'teacher',
      headline: 'Professor of Computational Linguistics & French Phonetics',
      bio: 'Bilingual educator specializing in conversational fluency, accent reduction, and linguistic syntax.',
      location: 'Montreal, Canada',
      languages: ['English', 'French'],
      isProfileVerified: true,
      isSuspended: false,
      accountVerificationStatus: 'Verified',
      rating: 4.98,
      reviewCount: 42,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    teacherC = await usersColl.findOne({ _id: inserted.insertedId });
    await skillsColl.insertOne({
      userId: teacherC._id,
      name: 'Conversational French & Accent Reduction',
      title: 'Conversational French & Accent Reduction',
      category: 'Languages',
      proficiency: 'Expert',
      hourlyPrice: 55,
      isTeaching: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created second test teacher: Dr. Claire Dupont');
  }

  // Ensure Student B: Alex Thorne (to verify students are excluded from teacher search)
  let studentB = await usersColl.findOne({ email: 'alex.thorne@skillexchange.io' });
  if (!studentB) {
    const inserted = await usersColl.insertOne({
      name: 'Alex Thorne',
      email: 'alex.thorne@skillexchange.io',
      password: '$2a$10$wE99qIe8iK9zL18fE3E43.nBq/i5t79YI/JmXbVpD4q.7C59B1b1S',
      role: 'learner',
      headline: 'Student of Machine Learning & Robotics',
      bio: 'Lifelong learner.',
      location: 'Seattle, WA',
      languages: ['English'],
      isProfileVerified: true,
      isSuspended: false,
      accountVerificationStatus: 'Verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    studentB = await usersColl.findOne({ _id: inserted.insertedId });
    console.log('Created test student: Alex Thorne');
  }

  // 2. Authenticate Student A (Elena Rostova)
  console.log('\n[Step 1] Authenticating Student A (learner@skillexchange.io)...');
  const studentLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'learner@skillexchange.io', password: 'password123' }),
  });
  if (!studentLogin.ok || !studentLogin.data?.data?.token) {
    throw new Error('Student A login failed: ' + JSON.stringify(studentLogin.data));
  }
  const studentToken = studentLogin.data.data.token;
  const studentUser = studentLogin.data.data.user;
  console.log(`✓ Student A authenticated: ID=${studentUser.id || studentUser._id}, Name="${studentUser.name}"`);

  // =========================================================================
  // TEST SUITE: TEACHER SEARCH CAPABILITIES & EDGE CASES
  // =========================================================================
  console.log('\n====================================================');
  console.log('TEST SUITE: TEACHER SEARCH ENDPOINT VERIFICATION');
  console.log('====================================================');

  // Case 1: Search by full name (case insensitive)
  console.log('\n[Search Case 1] Search by complete name: "Marcus Vance"...');
  const searchFullName = await request(`${BASE_URL}/messages/teachers?search=Marcus%20Vance`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!searchFullName.ok || !Array.isArray(searchFullName.data?.data)) {
    throw new Error('Search failed: ' + JSON.stringify(searchFullName.data));
  }
  console.log(`Found ${searchFullName.data.data.length} teacher(s).`);
  const foundMarcus = searchFullName.data.data.find((t: any) => t.name === 'Marcus Vance');
  if (!foundMarcus) throw new Error('Marcus Vance not found by full name!');
  console.log(`✓ Found Marcus Vance: ID=${foundMarcus.id}, Role=${foundMarcus.role}, Headline="${foundMarcus.headline}"`);

  // Case 2: Search by partial name and lower case: "marcus"
  console.log('\n[Search Case 2] Search by lower case partial name: "marcus"...');
  const searchLower = await request(`${BASE_URL}/messages/teachers?search=marcus`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!searchLower.ok || !searchLower.data.data.some((t: any) => t.name === 'Marcus Vance')) {
    throw new Error('Case-insensitive search for "marcus" failed!');
  }
  console.log('✓ Case-insensitive search "marcus" successfully matched Marcus Vance.');

  // Case 3: Search by UPPERCASE name: "MARCUS"
  console.log('\n[Search Case 3] Search by UPPERCASE name: "MARCUS"...');
  const searchUpper = await request(`${BASE_URL}/messages/teachers?search=MARCUS`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!searchUpper.ok || !searchUpper.data.data.some((t: any) => t.name === 'Marcus Vance')) {
    throw new Error('Uppercase search for "MARCUS" failed!');
  }
  console.log('✓ Uppercase search "MARCUS" successfully matched Marcus Vance.');

  // Case 4: Search by teaching skill: "TypeScript"
  console.log('\n[Search Case 4] Search by teaching skill: "TypeScript"...');
  const searchSkill = await request(`${BASE_URL}/messages/teachers?search=TypeScript`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!searchSkill.ok || !searchSkill.data.data.some((t: any) => t.name === 'Marcus Vance')) {
    throw new Error('Skill search for "TypeScript" failed to match Marcus Vance!');
  }
  console.log('✓ Skill search "TypeScript" successfully matched Marcus Vance.');

  // Case 5: Search for distinct Teacher C: "Claire" or "French"
  console.log('\n[Search Case 5] Search for second teacher: "Claire"...');
  const searchClaire = await request(`${BASE_URL}/messages/teachers?search=Claire`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const foundClaire = searchClaire.data?.data?.find((t: any) => t.name === 'Dr. Claire Dupont');
  if (!foundClaire) throw new Error('Dr. Claire Dupont not found by name!');
  console.log(`✓ Found Dr. Claire Dupont: ID=${foundClaire.id}, Skills=${foundClaire.teachingSkills?.map((s: any) => s.name).join(', ')}`);

  // Case 6: Verify Learners and Admins are EXCLUDED
  console.log('\n[Search Case 6] Verifying student "Alex Thorne" is EXCLUDED from teacher search...');
  const searchStudent = await request(`${BASE_URL}/messages/teachers?search=Alex%20Thorne`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (searchStudent.data?.data?.length > 0) {
    throw new Error('Security violation: Student appeared in teacher search results!');
  }
  console.log('✓ Verified: Non-teachers (Learners/Admins) are strictly excluded from teacher search.');

  // Case 7: Search with empty or non-matching query
  console.log('\n[Search Case 7] Search non-existent teacher: "ZzzNonExistentTeacherName"...');
  const searchNone = await request(`${BASE_URL}/messages/teachers?search=ZzzNonExistentTeacherName`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (searchNone.data?.data?.length !== 0) {
    throw new Error('Non-existent search should return 0 results!');
  }
  console.log('✓ Verified: Non-matching search returns empty array (triggers "No teachers found" UI).');

  // Case 8: Verify currently authenticated teacher cannot search themselves
  console.log('\n[Search Case 8] Authenticating as Teacher B and searching own name...');
  const teacherLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'teacher@skillexchange.io', password: 'password123' }),
  });
  const teacherToken = teacherLogin.data?.data?.token;
  const teacherSelfSearch = await request(`${BASE_URL}/messages/teachers?search=Marcus`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const selfFound = teacherSelfSearch.data?.data?.find((t: any) => t.email === 'teacher@skillexchange.io');
  if (selfFound) {
    throw new Error('Security violation: Teacher was able to find themselves in teacher search!');
  }
  console.log('✓ Verified: Currently authenticated user is excluded from search (cannot message self).');

  // =========================================================================
  // TEST SUITE: START DIRECT CONVERSATION & BIDIRECTIONAL MESSAGING
  // =========================================================================
  console.log('\n====================================================');
  console.log('TEST SUITE: START DIRECT CONVERSATION & BIDIRECTIONAL MESSAGING');
  console.log('====================================================');

  // Student A starts a brand new conversation with Teacher C (Dr. Claire Dupont)
  console.log('\n[Direct Chat 1] Student A initiates direct message to Dr. Claire Dupont (ID=' + foundClaire.id + ')...');
  const firstMsgText = `Bonjour Dr. Dupont! I found your profile via teacher search and would like to learn French phonetics. Sent at ${new Date().toISOString()}`;

  const sendDirectRes = await request(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      receiverId: foundClaire.id,
      text: firstMsgText,
    }),
  });

  if (!sendDirectRes.ok || !sendDirectRes.data?.data?.message) {
    throw new Error('Failed to send direct message to searched teacher: ' + JSON.stringify(sendDirectRes.data));
  }
  const directMsg = sendDirectRes.data.data.message;
  const directConv = sendDirectRes.data.data.conversation;
  console.log(`✓ Direct message sent successfully: MsgID=${directMsg.id}, ConversationID=${directConv.id}`);

  // Inspect MongoDB Atlas directly for persistence
  const dbConv = await db.collection('conversations').findOne({ _id: new mongoose.Types.ObjectId(directConv.id) });
  if (!dbConv) throw new Error('Conversation document not saved in MongoDB!');
  console.log('✓ Conversation verified in MongoDB:', {
    _id: dbConv._id.toString(),
    participantIds: dbConv.participantIds.map((p: any) => p.toString()),
    lastMessageText: dbConv.lastMessageText,
  });

  // Verify Dr. Claire Dupont logs in and sees the new conversation and message
  console.log('\n[Direct Chat 2] Dr. Claire Dupont logs in and checks inbox...');
  const claireLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'claire.dupont@skillexchange.io', password: 'password123' }),
  });
  if (!claireLogin.ok || !claireLogin.data?.data?.token) {
    throw new Error('Claire Dupont login failed: ' + JSON.stringify(claireLogin.data));
  }
  const claireToken = claireLogin.data.data.token;

  const claireConvsRes = await request(`${BASE_URL}/messages/conversations`, {
    headers: { Authorization: `Bearer ${claireToken}` },
  });
  const foundConvInInbox = claireConvsRes.data?.data?.find((c: any) => c.id === directConv.id);
  if (!foundConvInInbox) throw new Error('Direct conversation not found in Teacher C inbox!');
  console.log('✓ Found conversation in Dr. Dupont inbox:', {
    convId: foundConvInInbox.id,
    lastMessageText: foundConvInInbox.lastMessageText,
    unreadCount: foundConvInInbox.unreadCountForUser?.[foundClaire.id],
  });

  // Dr. Claire Dupont reads the message history
  const claireMsgsRes = await request(`${BASE_URL}/messages/conversations/${directConv.id}`, {
    headers: { Authorization: `Bearer ${claireToken}` },
  });
  const foundMsg = claireMsgsRes.data?.data?.find((m: any) => m.id === directMsg.id || m.text === firstMsgText);
  if (!foundMsg) throw new Error('Student message not found in teacher message history!');
  console.log(`✓ Teacher C read student message: "${foundMsg.text}" (Sender: ${foundMsg.senderName})`);

  // Dr. Claire Dupont replies to Student A
  console.log('\n[Direct Chat 3] Dr. Claire Dupont sends reply to Student A...');
  const replyText = `Bonjour Elena! Enchantée. I would be delighted to work with you on conversational French phonetics.`;
  const replyRes = await request(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${claireToken}` },
    body: JSON.stringify({
      conversationId: directConv.id,
      receiverId: studentUser.id || studentUser._id,
      text: replyText,
    }),
  });
  if (!replyRes.ok || !replyRes.data?.data?.message) {
    throw new Error('Teacher C reply failed: ' + JSON.stringify(replyRes.data));
  }
  console.log(`✓ Teacher C reply sent: MsgID=${replyRes.data.data.message.id}`);

  // Student A receives reply
  console.log('\n[Direct Chat 4] Student A fetches messages and confirms receipt of reply...');
  const studentMsgsRes = await request(`${BASE_URL}/messages/conversations/${directConv.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const receivedReply = studentMsgsRes.data?.data?.find((m: any) => m.text === replyText);
  if (!receivedReply) throw new Error('Student A did not receive Dr. Dupont reply!');
  console.log(`✓ Student A verified receipt of reply: "${receivedReply.text}" from ${receivedReply.senderName}`);

  // Verify no duplicate conversations are created if Student A messages Dr. Claire Dupont again
  console.log('\n[Direct Chat 5] Verifying no duplicate conversation is created upon subsequent messages...');
  const secondMsgRes = await request(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      receiverId: foundClaire.id,
      text: 'Thank you Dr. Dupont! When are you free for a 1-on-1 swap or session?',
    }),
  });
  if (secondMsgRes.data?.data?.conversation?.id !== directConv.id) {
    throw new Error('Duplicate conversation created! Expected conversationId=' + directConv.id);
  }
  console.log(`✓ Duplicate check passed: Conversation ID remained ${directConv.id}.`);

  await dbConn.close();

  console.log('\n====================================================');
  console.log('ALL TEACHER SEARCH & DIRECT MESSAGING TESTS PASSED!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
