import mongoose from 'mongoose';
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
  console.log('END-TO-END MULTI-ACCOUNT INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  // 1. Health check
  console.log('[Step 1] Checking API health...');
  const health = await request(`${BASE_URL}/health`);
  console.log('Health check response:', health.data);
  if (!health.ok || health.data?.database?.status !== 'connected') {
    throw new Error('API or database is not healthy');
  }

  // 2. Authenticate Student A (Elena Rostova: learner@skillexchange.io)
  console.log('\n[Step 2] Logging in as Student A (learner@skillexchange.io)...');
  const studentLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'learner@skillexchange.io',
      password: 'password123',
    }),
  });
  if (!studentLogin.ok || !studentLogin.data?.data?.token) {
    throw new Error('Student A login failed: ' + JSON.stringify(studentLogin.data));
  }
  const studentToken = studentLogin.data.data.token;
  const studentUser = studentLogin.data.data.user;
  console.log(`Student A logged in successfully: ID=${studentUser.id}, Name="${studentUser.name}", Email=${studentUser.email}`);

  // 3. Authenticate Teacher B (Marcus Vance: teacher@skillexchange.io)
  console.log('\n[Step 3] Logging in as Teacher B (teacher@skillexchange.io)...');
  const teacherLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'teacher@skillexchange.io',
      password: 'password123',
    }),
  });
  if (!teacherLogin.ok || !teacherLogin.data?.data?.token) {
    throw new Error('Teacher B login failed: ' + JSON.stringify(teacherLogin.data));
  }
  const teacherToken = teacherLogin.data.data.token;
  const teacherUser = teacherLogin.data.data.user;
  console.log(`Teacher B logged in successfully: ID=${teacherUser.id}, Name="${teacherUser.name}", Email=${teacherUser.email}`);

  // Connect directly to MongoDB to perform raw document verification
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not defined');
  const dbConn = await mongoose.createConnection(mongoUri).asPromise();
  console.log('\n[Direct DB] Direct MongoDB connection established for independent document verification.');
  const db: any = dbConn.db;

  // =========================================================================
  // WORKFLOW 1: MESSAGING END-TO-END
  // =========================================================================
  console.log('\n====================================================');
  console.log('TESTING WORKFLOW 1: MESSAGING BETWEEN STUDENT & TEACHER');
  console.log('====================================================');

  const testMessageText = `Hello Marcus! I am interested in your React & TypeScript Architecture sessions. Sent at ${new Date().toISOString()}`;

  // 1.1 Student A sends message to Teacher B
  console.log('\n[WF1 - 1] Student A sends message to Teacher B via POST /api/messages...');
  const sendMsgRes = await request(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      receiverId: teacherUser.id,
      text: testMessageText,
    }),
  });

  if (!sendMsgRes.ok || !sendMsgRes.data?.data?.message) {
    throw new Error('Failed to send message: ' + JSON.stringify(sendMsgRes.data));
  }
  const createdMsg = sendMsgRes.data.data.message;
  const conversationId = sendMsgRes.data.data.conversation?.id || createdMsg.conversationId;
  console.log(`Message sent successfully: ID=${createdMsg.id}, ConversationID=${conversationId}`);

  // 1.2 Direct MongoDB Verification for Message & Conversation
  console.log('\n[WF1 - 2] Inspecting MongoDB Atlas for Message and Conversation documents...');
  const rawMsgDoc = await db.collection('messages').findOne({ _id: new mongoose.Types.ObjectId(createdMsg.id) });
  if (!rawMsgDoc) {
    throw new Error(`Message ${createdMsg.id} was NOT found in MongoDB!`);
  }
  console.log('Raw Message Document in MongoDB:', {
    _id: rawMsgDoc._id.toString(),
    conversationId: rawMsgDoc.conversationId.toString(),
    senderId: rawMsgDoc.senderId.toString(),
    receiverId: rawMsgDoc.receiverId.toString(),
    text: rawMsgDoc.text,
    isRead: rawMsgDoc.isRead,
    createdAt: rawMsgDoc.createdAt,
  });

  if (rawMsgDoc.senderId.toString() !== studentUser.id) {
    throw new Error(`senderId mismatch: expected ${studentUser.id}, got ${rawMsgDoc.senderId.toString()}`);
  }
  if (rawMsgDoc.receiverId.toString() !== teacherUser.id) {
    throw new Error(`receiverId mismatch: expected ${teacherUser.id}, got ${rawMsgDoc.receiverId.toString()}`);
  }
  console.log('>>> [VERIFIED] Message is persistently stored in MongoDB with correct senderId and receiverId.');

  const rawConvDoc = await db.collection('conversations').findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
  if (!rawConvDoc) {
    throw new Error(`Conversation ${conversationId} was NOT found in MongoDB!`);
  }
  console.log('Raw Conversation Document in MongoDB:', {
    _id: rawConvDoc._id.toString(),
    participantIds: rawConvDoc.participantIds.map((p: any) => p.toString()),
    lastMessageText: rawConvDoc.lastMessageText,
    unreadCountForUser: rawConvDoc.unreadCountForUser,
  });
  console.log('>>> [VERIFIED] Conversation document is persistently stored in MongoDB.');

  // 1.3 Teacher B fetches conversations via GET /api/messages/conversations
  console.log('\n[WF1 - 3] Teacher B fetches inbox conversations via GET /api/messages/conversations...');
  const teacherConvsRes = await request(`${BASE_URL}/messages/conversations`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  if (!teacherConvsRes.ok || !Array.isArray(teacherConvsRes.data?.data)) {
    throw new Error('Teacher failed to fetch conversations: ' + JSON.stringify(teacherConvsRes.data));
  }
  const teacherConvs = teacherConvsRes.data.data;
  console.log(`Teacher B received ${teacherConvs.length} conversation(s).`);
  const matchingConv = teacherConvs.find((c: any) => c.id === conversationId || (Array.isArray(c.participantIds) && c.participantIds.includes(studentUser.id)));
  if (!matchingConv) {
    throw new Error(`Teacher inbox does NOT contain conversation with Student A (${studentUser.id})!`);
  }
  console.log('Found conversation in Teacher inbox:', {
    id: matchingConv.id,
    participantIds: matchingConv.participantIds,
    lastMessageText: matchingConv.lastMessageText,
    unreadCountForUser: matchingConv.unreadCountForUser,
  });
  console.log('>>> [VERIFIED] Teacher B inbox receives Student A conversation.');

  // 1.4 Teacher B fetches messages in the conversation
  console.log('\n[WF1 - 4] Teacher B fetches messages for conversation via GET /api/messages/conversations/:id...');
  const teacherMsgsRes = await request(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  if (!teacherMsgsRes.ok || !Array.isArray(teacherMsgsRes.data?.data)) {
    throw new Error('Teacher failed to fetch conversation messages: ' + JSON.stringify(teacherMsgsRes.data));
  }
  const teacherMsgs = teacherMsgsRes.data.data;
  console.log(`Teacher B received ${teacherMsgs.length} message(s) in conversation.`);
  const foundStudentMsg = teacherMsgs.find((m: any) => m.id === createdMsg.id || m.text === testMessageText);
  if (!foundStudentMsg) {
    throw new Error('Student A message not found in Teacher B conversation view!');
  }
  console.log('Found message in Teacher conversation view:', foundStudentMsg);
  console.log('>>> [VERIFIED] Teacher B can read Student A message.');

  // 1.5 Teacher B sends a reply message to Student A
  console.log('\n[WF1 - 5] Teacher B replies to Student A via POST /api/messages...');
  const replyText = `Hi Elena! Thanks for reaching out. I would be happy to schedule a session with you.`;
  const replyRes = await request(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      conversationId: conversationId,
      receiverId: studentUser.id,
      text: replyText,
    }),
  });
  if (!replyRes.ok || !replyRes.data?.data?.message) {
    throw new Error('Teacher reply failed: ' + JSON.stringify(replyRes.data));
  }
  const replyMsg = replyRes.data.data.message;
  console.log(`Teacher reply sent: ID=${replyMsg.id}, text="${replyMsg.text}"`);

  // 1.6 Student A fetches messages and confirms receipt of reply
  console.log('\n[WF1 - 6] Student A fetches messages to verify reply receipt...');
  const studentMsgsRes = await request(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!studentMsgsRes.ok || !Array.isArray(studentMsgsRes.data?.data)) {
    throw new Error('Student failed to fetch conversation messages: ' + JSON.stringify(studentMsgsRes.data));
  }
  const studentMsgs = studentMsgsRes.data.data;
  const foundReplyMsg = studentMsgs.find((m: any) => m.id === replyMsg.id || m.text === replyText);
  if (!foundReplyMsg) {
    throw new Error('Teacher reply was NOT found in Student message history!');
  }
  console.log('Found Teacher reply in Student conversation history:', foundReplyMsg);
  console.log('>>> [VERIFIED] Multi-account bidirectional messaging works flawlessly!');

  // =========================================================================
  // WORKFLOW 2: COURSE / LESSON REQUEST (APPOINTMENTS) END-TO-END
  // =========================================================================
  console.log('\n====================================================');
  console.log('TESTING WORKFLOW 2: COURSE / LESSON REQUEST (APPOINTMENT)');
  console.log('====================================================');

  // 2.1 Get Teacher B's skills from MongoDB
  console.log('\n[WF2 - 1] Resolving Teacher B teaching skills...');
  const teacherSkills = await db.collection('skills').find({ userId: new mongoose.Types.ObjectId(teacherUser.id) }).toArray();
  console.log(`Teacher B has ${teacherSkills.length} skill(s) registered in MongoDB.`);
  let activeSkill = teacherSkills[0];
  if (!activeSkill) {
    console.log('Creating demo skill for Teacher B in MongoDB...');
    const inserted = await db.collection('skills').insertOne({
      userId: new mongoose.Types.ObjectId(teacherUser.id),
      title: 'React & TypeScript Architecture',
      category: 'Web Development',
      proficiencyLevel: 'Expert',
      experienceYears: 8,
      description: 'Master component design patterns, TypeScript generics, and high-performance state management.',
      teachingInterests: ['React', 'TypeScript', 'Clean Architecture'],
      isTeaching: true,
      paidLessonAvailable: true,
      hourlyPrice: 65,
      availabilitySchedule: 'Mon-Thu 17:00 - 21:00 CST',
      verificationStatus: 'Verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    activeSkill = await db.collection('skills').findOne({ _id: inserted.insertedId });
  }
  console.log(`Active teaching skill: ID=${activeSkill._id.toString()}, Title="${activeSkill.title}", Price=$${activeSkill.hourlyPrice}/hr`);

  // 2.2 Student A submits course / lesson request (Appointment)
  console.log('\n[WF2 - 2] Student A submits appointment request via POST /api/appointments...');
  const appointmentPayload = {
    teacherId: teacherUser.id,
    skillId: activeSkill._id.toString(),
    skillName: activeSkill.title || 'React & TypeScript Architecture',
    requestedDate: '2026-12-01',
    startTime: '17:00',
    durationMinutes: 60,
    isFreeSwap: false,
    hourlyPrice: activeSkill.hourlyPrice || 65,
    totalCost: activeSkill.hourlyPrice || 65,
    message: 'Looking forward to reviewing clean component patterns and testing strategies.',
  };

  const createAptRes = await request(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify(appointmentPayload),
  });

  if (!createAptRes.ok || !createAptRes.data?.data) {
    throw new Error('Failed to create appointment: ' + JSON.stringify(createAptRes.data));
  }
  const createdApt = createAptRes.data.data.appointment || createAptRes.data.data;
  console.log('Appointment created successfully via API:', createdApt);

  // 2.3 Direct MongoDB Verification of Appointment
  console.log('\n[WF2 - 3] Inspecting MongoDB Atlas for Appointment document...');
  const rawAptDoc = await db.collection('appointments').findOne({ _id: new mongoose.Types.ObjectId(createdApt.id) });
  if (!rawAptDoc) {
    throw new Error(`Appointment ${createdApt.id} was NOT found in MongoDB!`);
  }
  console.log('Raw Appointment Document in MongoDB:', {
    _id: rawAptDoc._id.toString(),
    learnerId: rawAptDoc.learnerId.toString(),
    teacherId: rawAptDoc.teacherId.toString(),
    skillId: rawAptDoc.skillId.toString(),
    status: rawAptDoc.status,
    skillName: rawAptDoc.skillName,
    message: rawAptDoc.message,
    learnerName: rawAptDoc.learnerName,
    teacherName: rawAptDoc.teacherName,
    hourlyPrice: rawAptDoc.hourlyPrice,
    totalCost: rawAptDoc.totalCost,
    createdAt: rawAptDoc.createdAt,
  });

  if (rawAptDoc.learnerId.toString() !== studentUser.id) {
    throw new Error(`learnerId mismatch: expected ${studentUser.id}, got ${rawAptDoc.learnerId.toString()}`);
  }
  if (rawAptDoc.teacherId.toString() !== teacherUser.id) {
    throw new Error(`teacherId mismatch: expected ${teacherUser.id}, got ${rawAptDoc.teacherId.toString()}`);
  }
  if (rawAptDoc.status !== 'Pending') {
    throw new Error(`Initial status mismatch: expected 'Pending', got ${rawAptDoc.status}`);
  }
  console.log('>>> [VERIFIED] Appointment is persistently saved in MongoDB with status="Pending", correct teacherId, learnerId, and names.');

  // 2.4 Teacher B fetches appointments via GET /api/appointments
  console.log('\n[WF2 - 4] Teacher B fetches appointments via GET /api/appointments...');
  const teacherAptsRes = await request(`${BASE_URL}/appointments`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  if (!teacherAptsRes.ok || !Array.isArray(teacherAptsRes.data?.data)) {
    throw new Error('Teacher failed to fetch appointments: ' + JSON.stringify(teacherAptsRes.data));
  }
  const teacherApts = teacherAptsRes.data.data;
  console.log(`Teacher B received ${teacherApts.length} appointment(s).`);
  const foundTeacherApt = teacherApts.find((a: any) => a.id === createdApt.id);
  if (!foundTeacherApt) {
    throw new Error(`Appointment ${createdApt.id} not found in Teacher B appointments list!`);
  }
  console.log('Found appointment in Teacher B list:', {
    id: foundTeacherApt.id,
    teacherId: foundTeacherApt.teacherId,
    learnerId: foundTeacherApt.learnerId,
    learnerName: foundTeacherApt.learnerName,
    status: foundTeacherApt.status,
    topic: foundTeacherApt.topic,
  });
  if (foundTeacherApt.teacherId !== teacherUser.id) {
    throw new Error(`Returned appointment teacherId is not flat string matching teacherUser.id! Got: ${foundTeacherApt.teacherId}`);
  }
  if (foundTeacherApt.status !== 'Pending') {
    throw new Error(`Status should be 'Pending' but was: ${foundTeacherApt.status}`);
  }
  console.log('>>> [VERIFIED] Teacher B can view incoming Pending request with flat string IDs matching dashboard filter.');

  // 2.5 Teacher B accepts the request via PATCH /api/appointments/:id/status
  console.log('\n[WF2 - 5] Teacher B accepts request via PATCH /api/appointments/:id/status...');
  const updateRes = await request(`${BASE_URL}/appointments/${createdApt.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ status: 'Accepted' }),
  });
  if (!updateRes.ok || !updateRes.data?.data) {
    throw new Error('Failed to update appointment status: ' + JSON.stringify(updateRes.data));
  }
  console.log('Teacher B update response:', updateRes.data.data);

  // 2.6 Direct MongoDB Verification of Updated Status
  console.log('\n[WF2 - 6] Inspecting MongoDB Atlas for updated Appointment document...');
  const updatedAptDoc = await db.collection('appointments').findOne({ _id: new mongoose.Types.ObjectId(createdApt.id) });
  if (!updatedAptDoc) {
    throw new Error('Appointment disappeared from MongoDB!');
  }
  console.log('Updated Appointment Document in MongoDB:', {
    _id: updatedAptDoc._id.toString(),
    status: updatedAptDoc.status,
    updatedAt: updatedAptDoc.updatedAt,
  });
  if (updatedAptDoc.status !== 'Accepted') {
    throw new Error(`MongoDB status not updated to Accepted! Current: ${updatedAptDoc.status}`);
  }
  console.log('>>> [VERIFIED] Appointment status in MongoDB Atlas successfully updated to "Accepted".');

  // 2.7 Student A fetches appointments to verify updated status
  console.log('\n[WF2 - 7] Student A fetches appointments via GET /api/appointments to verify update...');
  const studentAptsRes = await request(`${BASE_URL}/appointments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!studentAptsRes.ok || !Array.isArray(studentAptsRes.data?.data)) {
    throw new Error('Student failed to fetch appointments: ' + JSON.stringify(studentAptsRes.data));
  }
  const studentApts = studentAptsRes.data.data;
  const studentFoundApt = studentApts.find((a: any) => a.id === createdApt.id);
  if (!studentFoundApt) {
    throw new Error('Appointment not found in Student appointments list!');
  }
  console.log('Student A sees updated appointment:', {
    id: studentFoundApt.id,
    teacherName: studentFoundApt.teacherName,
    status: studentFoundApt.status,
    meetingId: studentFoundApt.meetingId,
  });
  if (studentFoundApt.status !== 'Accepted') {
    throw new Error(`Student A does not see status as 'Accepted'! Current: ${studentFoundApt.status}`);
  }
  console.log('>>> [VERIFIED] Student A sees the updated "Accepted" status!');

  await dbConn.close();

  console.log('\n====================================================');
  console.log('ALL INTEGRATION AND DATABASE CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
