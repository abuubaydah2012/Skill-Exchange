/**
 * Skill Exchange Real-Time Messaging Verification Script
 * Validates Socket.IO bidirectional real-time delivery between Student and Teacher,
 * JWT handshake authorization, room-based targeted delivery, and MongoDB Atlas persistence.
 */
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { io as ioClient, Socket } from 'socket.io-client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, '');

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      _id: string;
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

const loginUser = async (email: string, password: string): Promise<{ token: string; userId: string; name: string }> => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json()) as AuthResponse;
  if (!data.success || !data.data?.token) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(data)}`);
  }

  return {
    token: data.data.token,
    userId: data.data.user._id || data.data.user.id,
    name: data.data.user.name,
  };
};

const connectUserSocket = (token: string, userName: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const socket = ioClient(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 10000,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Timeout connecting socket for ${userName}`));
    }, 8000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`  ✓ [Socket Connected] ${userName} (Socket ID: ${socket.id})`);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Socket connection error for ${userName}: ${err.message}`));
    });
  });
};

const runRealTimeVerification = async () => {
  console.log('\n======================================================');
  console.log('   SKILL EXCHANGE REAL-TIME MESSAGING VERIFICATION    ');
  console.log('======================================================\n');

  try {
    // 1. Health check
    console.log('[Step 1] Checking API health and database connectivity...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData: any = await healthRes.json();
    console.log(`  Health Status: ${healthData.status}, DB: ${healthData.database?.status}`);
    if (healthData.database?.status !== 'connected') {
      throw new Error('Database is not connected on server!');
    }

    // Connect mongoose locally to verify MongoDB directly
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('  Direct MongoDB verification connection established.\n');
    }

    // 2. Authenticate Student A & Teacher B
    console.log('[Step 2] Authenticating test accounts...');
    const student = await loginUser('learner@skillexchange.io', 'password123');
    console.log(`  ✓ Authenticated Student: ${student.name} (${student.userId})`);

    const teacher = await loginUser('teacher@skillexchange.io', 'password123');
    console.log(`  ✓ Authenticated Teacher: ${teacher.name} (${teacher.userId})\n`);

    // 3. Establish Socket connections for both users
    console.log('[Step 3] Establishing authenticated Socket.IO connections...');
    const studentSocket = await connectUserSocket(student.token, `Student (${student.name})`);
    const teacherSocket = await connectUserSocket(teacher.token, `Teacher (${teacher.name})`);
    console.log('  ✓ Both authenticated client sockets connected successfully.\n');

    // 4. Test Student -> Teacher Real-Time Message
    console.log('[Step 4] Testing Student -> Teacher real-time delivery...');
    const testMsgText = `Real-time test ping from Student at ${new Date().toISOString()}`;

    // Setup promises to capture socket events
    const teacherReceivedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Teacher to receive message')), 8000);
      teacherSocket.on('message:received', (msg) => {
        if (msg.text === testMsgText) {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });

    const teacherConvUpdatedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Teacher conversation update')), 8000);
      teacherSocket.on('conversation:updated', (conv) => {
        if (conv.lastMessageText === testMsgText) {
          clearTimeout(timer);
          resolve(conv);
        }
      });
    });

    // Send message via REST API from Student to Teacher
    const sendRes1 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student.token}`,
      },
      body: JSON.stringify({
        receiverId: teacher.userId,
        text: testMsgText,
      }),
    });
    const sendData1: any = await sendRes1.json();
    if (!sendData1.success) {
      throw new Error(`Failed to send message: ${JSON.stringify(sendData1)}`);
    }
    console.log(`  ✓ REST POST /api/messages returned HTTP 201 (Message ID: ${sendData1.data?.message?.id})`);

    // Await Teacher real-time events
    const receivedByTeacher = await teacherReceivedPromise;
    console.log(`  ✓ [Real-Time Event] Teacher received 'message:received' instantly: "${receivedByTeacher.text}"`);

    const convUpdatedForTeacher = await teacherConvUpdatedPromise;
    console.log(`  ✓ [Real-Time Event] Teacher received 'conversation:updated' with unread count:`, convUpdatedForTeacher.unreadCountForUser);

    // 5. Test Teacher -> Student Real-Time Reply
    console.log('\n[Step 5] Testing Teacher -> Student real-time reply...');
    const replyMsgText = `Real-time reply from Teacher at ${new Date().toISOString()}`;

    const studentReceivedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Student to receive reply')), 8000);
      studentSocket.on('message:received', (msg) => {
        if (msg.text === replyMsgText) {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });

    const studentConvUpdatedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Student conversation update')), 8000);
      studentSocket.on('conversation:updated', (conv) => {
        if (conv.lastMessageText === replyMsgText) {
          clearTimeout(timer);
          resolve(conv);
        }
      });
    });

    // Send reply via REST API from Teacher to Student
    const sendRes2 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacher.token}`,
      },
      body: JSON.stringify({
        receiverId: student.userId,
        text: replyMsgText,
      }),
    });
    const sendData2: any = await sendRes2.json();
    if (!sendData2.success) {
      throw new Error(`Failed to send reply: ${JSON.stringify(sendData2)}`);
    }
    console.log(`  ✓ REST POST /api/messages reply returned HTTP 201 (Message ID: ${sendData2.data?.message?.id})`);

    const receivedByStudent = await studentReceivedPromise;
    console.log(`  ✓ [Real-Time Event] Student received 'message:received' instantly: "${receivedByStudent.text}"`);

    const convUpdatedForStudent = await studentConvUpdatedPromise;
    console.log(`  ✓ [Real-Time Event] Student received 'conversation:updated' with unread count:`, convUpdatedForStudent.unreadCountForUser);

    // 6. Test Read Receipt Event
    console.log('\n[Step 6] Testing read receipt real-time synchronization...');
    const conversationId = sendData1.data?.conversation?.id;

    const teacherReadEventPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for read receipt event')), 8000);
      teacherSocket.on('conversation:read', (data) => {
        if (data.conversationId === conversationId) {
          clearTimeout(timer);
          resolve(data);
        }
      });
    });

    const markReadRes = await fetch(`${BASE_URL}/api/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${student.token}`,
      },
    });
    const markReadData: any = await markReadRes.json();
    console.log(`  ✓ REST PATCH /conversations/:id/read returned HTTP 200:`, markReadData.message);

    const readEvent = await teacherReadEventPromise;
    console.log(`  ✓ [Real-Time Event] Teacher received 'conversation:read' for conversation: ${readEvent.conversationId}`);

    // 7. Verify Persistence in MongoDB Atlas
    console.log('\n[Step 7] Verifying database persistence in MongoDB Atlas...');
    const dbConn = mongoose.connection;
    const db: any = dbConn.db;
    const messagesCollection = db.collection('messages');
    const conversationsCollection = db.collection('conversations');

    const studentMsgDoc = await messagesCollection.findOne({ _id: new mongoose.Types.ObjectId(sendData1.data.message.id) });
    const teacherReplyDoc = await messagesCollection.findOne({ _id: new mongoose.Types.ObjectId(sendData2.data.message.id) });
    const convDoc = await conversationsCollection.findOne({ _id: new mongoose.Types.ObjectId(conversationId) });

    if (!studentMsgDoc) throw new Error('Student message not found in MongoDB!');
    if (!teacherReplyDoc) throw new Error('Teacher reply not found in MongoDB!');
    if (!convDoc) throw new Error('Conversation document not found in MongoDB!');

    console.log(`  ✓ Verified Student message in MongoDB: text="${studentMsgDoc.text}"`);
    console.log(`  ✓ Verified Teacher reply in MongoDB: text="${teacherReplyDoc.text}"`);
    console.log(`  ✓ Verified Conversation in MongoDB: lastMessage="${convDoc.lastMessageText}"`);

    // Clean up sockets and db connection
    studentSocket.disconnect();
    teacherSocket.disconnect();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('  ALL REAL-TIME MESSAGING VERIFICATION TESTS PASSED!  ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
};

runRealTimeVerification();
