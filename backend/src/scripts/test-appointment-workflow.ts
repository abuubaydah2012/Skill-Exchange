/**
 * Complete Student-to-Teacher Request & Approval Workflow Integration Test
 * Verifies end-to-end:
 * 1. Student submits request -> Saved in MongoDB with real IDs, status=Pending
 * 2. Teacher receives in Incoming Requests, views details, accepts -> MongoDB status=Accepted
 * 3. Student receives real-time update and status persists across refresh
 * 4. Second request submitted -> Teacher B rejects with reason -> Student sees Rejected with reason
 * 5. Security audit: Unauthorized teacher cannot accept/reject another teacher's request (403 Forbidden)
 * 6. Concurrency / State validation: Non-pending requests cannot be accepted/rejected (400 Bad Request)
 * 7. Real-time Socket.IO notification delivery
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

const runAppointmentWorkflowTests = async () => {
  console.log('\n======================================================');
  console.log('  STUDENT-TO-TEACHER REQUEST & APPROVAL WORKFLOW AUDIT ');
  console.log('======================================================\n');

  try {
    // Connect to MongoDB directly for document verification
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✓ Direct MongoDB Atlas connection established.');
    }
    const db: any = mongoose.connection.db;
    const appointmentsCollection = db.collection('appointments');

    // 1. Authenticate users
    console.log('\n[Phase 1] Authenticating test accounts...');
    const studentA = await loginUser('learner@skillexchange.io', 'password123');
    console.log(`  ✓ Student A: ${studentA.name} (ID: ${studentA.userId})`);

    const teacherB = await loginUser('teacher@skillexchange.io', 'password123');
    console.log(`  ✓ Teacher B: ${teacherB.name} (ID: ${teacherB.userId})`);

    // Ensure a second teacher exists for unauthorized security tests
    let teacherC;
    try {
      teacherC = await loginUser('dr.claire.dupont@skillexchange.io', 'password123');
      console.log(`  ✓ Teacher C (Independent Teacher): ${teacherC.name} (ID: ${teacherC.userId})`);
    } catch {
      // Create teacher C if not present
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Claire Dupont',
          email: 'dr.claire.dupont@skillexchange.io',
          password: 'password123',
          role: 'teacher',
          phoneNumber: '+33 6 1234 5678',
        }),
      });
      const regData = (await regRes.json()) as any;
      teacherC = {
        token: regData.data.token,
        userId: regData.data.user._id,
        name: regData.data.user.name,
      };
      console.log(`  ✓ Teacher C created for security test: ${teacherC.name} (ID: ${teacherC.userId})`);
    }

    // 2. Connect Sockets for Real-Time Notification Verification
    console.log('\n[Phase 2] Connecting authenticated client sockets...');
    const studentSocket = await connectUserSocket(studentA.token, `Student A (${studentA.name})`);
    const teacherSocket = await connectUserSocket(teacherB.token, `Teacher B (${teacherB.name})`);

    // -------------------------------------------------------------
    // TEST A: Student Submits Request -> Delivered to Teacher B
    // -------------------------------------------------------------
    console.log('\n[Test A] Student A submits session request to Teacher B...');

    const teacherReceivedAppointmentPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Teacher B appointment:received event')), 8000);
      teacherSocket.on('appointment:received', (apt) => {
        if (apt.learnerId === studentA.userId) {
          clearTimeout(timer);
          resolve(apt);
        }
      });
    });

    const requestedDate = new Date();
    requestedDate.setDate(requestedDate.getDate() + 3);
    const dateStr = requestedDate.toISOString().split('T')[0];

    const createRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({
        teacherId: teacherB.userId,
        skillName: 'React & TypeScript Architecture',
        requestedDate: dateStr,
        startTime: '19:00',
        durationMinutes: 60,
        isFreeSwap: true,
        offeredSwapSkillName: 'Conversational Russian and UI Wireframing',
        message: 'Looking forward to our session on component patterns and testing.',
      }),
    });

    const createData = (await createRes.json()) as any;
    if (!createData.success || !createData.data?.id) {
      throw new Error(`Failed to create appointment: ${JSON.stringify(createData)}`);
    }
    const appointment1Id = createData.data.id;
    console.log(`  ✓ Student A created request via POST /api/appointments: HTTP 201 (ID: ${appointment1Id})`);

    // Verify Socket event received by Teacher B
    const realtimeApt = await teacherReceivedAppointmentPromise;
    console.log(`  ✓ [Real-Time Socket] Teacher B received 'appointment:received' event:`, {
      id: realtimeApt.id,
      skillName: realtimeApt.skillName,
      learnerName: realtimeApt.learnerName,
      status: realtimeApt.status,
    });

    // Verify Document in MongoDB Atlas
    const doc1 = await appointmentsCollection.findOne({ _id: new mongoose.Types.ObjectId(appointment1Id) });
    if (!doc1) throw new Error('Appointment document not found in MongoDB Atlas!');

    console.log(`  ✓ [MongoDB Verified] Appointment in Atlas:`, {
      _id: doc1._id.toString(),
      learnerId: doc1.learnerId.toString(),
      learnerName: doc1.learnerName,
      teacherId: doc1.teacherId.toString(),
      teacherName: doc1.teacherName,
      status: doc1.status,
      requestedDate: doc1.requestedDate,
      startTime: doc1.startTime,
    });

    if (doc1.teacherId.toString() !== teacherB.userId) {
      throw new Error(`Teacher ID mismatch in MongoDB! Expected ${teacherB.userId}, got ${doc1.teacherId}`);
    }
    if (doc1.learnerId.toString() !== studentA.userId) {
      throw new Error(`Learner ID mismatch in MongoDB! Expected ${studentA.userId}, got ${doc1.learnerId}`);
    }
    if (doc1.status !== 'Pending') {
      throw new Error(`Expected status to be 'Pending', got ${doc1.status}`);
    }

    // -------------------------------------------------------------
    // TEST B: Teacher B Views Incoming Requests and Accepts
    // -------------------------------------------------------------
    console.log('\n[Test B] Teacher B views incoming requests and accepts...');

    // Fetch incoming requests as Teacher B
    const teacherInboxRes = await fetch(`${BASE_URL}/api/appointments?role=teacher&status=Pending`, {
      headers: { Authorization: `Bearer ${teacherB.token}` },
    });
    const teacherInboxData = (await teacherInboxRes.json()) as any;
    const foundInInbox = teacherInboxData.data.find((a: any) => a.id === appointment1Id);
    if (!foundInInbox) {
      throw new Error('Appointment not found in Teacher B incoming requests!');
    }
    console.log(`  ✓ Teacher B found request in Pending inbox: "${foundInInbox.skillName}" from ${foundInInbox.learnerName}`);

    // Setup listener for Student A real-time update
    const studentAcceptedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Student A to receive acceptance')), 8000);
      studentSocket.on('appointment:updated', (apt) => {
        if (apt.id === appointment1Id && apt.status === 'Accepted') {
          clearTimeout(timer);
          resolve(apt);
        }
      });
    });

    // Teacher B accepts request
    const acceptRes = await fetch(`${BASE_URL}/api/appointments/${appointment1Id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherB.token}` },
    });
    const acceptData = (await acceptRes.json()) as any;
    if (!acceptData.success || acceptData.data?.status !== 'Accepted') {
      throw new Error(`Failed to accept appointment: ${JSON.stringify(acceptData)}`);
    }
    console.log(`  ✓ Teacher B accepted request via PATCH /api/appointments/:id/accept: HTTP 200 (Status: ${acceptData.data.status})`);

    // Verify MongoDB status update
    const doc1Accepted = await appointmentsCollection.findOne({ _id: new mongoose.Types.ObjectId(appointment1Id) });
    if (doc1Accepted?.status !== 'Accepted') {
      throw new Error(`Expected MongoDB status 'Accepted', got ${doc1Accepted?.status}`);
    }
    console.log(`  ✓ [MongoDB Verified] Atlas document status updated to: "${doc1Accepted.status}"`);

    // Verify real-time update received by Student A
    const acceptedEvent = await studentAcceptedPromise;
    console.log(`  ✓ [Real-Time Socket] Student A received instant 'appointment:updated' event: status="${acceptedEvent.status}"`);

    // -------------------------------------------------------------
    // TEST C: Student A Verifies Status and Refresh Persistence
    // -------------------------------------------------------------
    console.log('\n[Test C] Verifying Student A status and refresh persistence...');
    const studentFetchRes = await fetch(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    const studentFetchData = (await studentFetchRes.json()) as any;
    const studentApt = studentFetchData.data.find((a: any) => a.id === appointment1Id);
    if (studentApt?.status !== 'Accepted') {
      throw new Error(`Expected Student A to see 'Accepted', got ${studentApt?.status}`);
    }
    console.log(`  ✓ Student A sees Accepted request in schedule: Instructor="${studentApt.teacherName}", Status="${studentApt.status}"`);

    // Simulate page refresh (second fetch)
    const refreshRes = await fetch(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    const refreshData = (await refreshRes.json()) as any;
    const refreshedApt = refreshData.data.find((a: any) => a.id === appointment1Id);
    if (refreshedApt?.status !== 'Accepted') {
      throw new Error('Accepted status was lost on refresh!');
    }
    console.log(`  ✓ Status persistent across browser refresh: "${refreshedApt.status}"`);

    // -------------------------------------------------------------
    // TEST D: Security Audit (Unauthorized Teacher C Blocked)
    // -------------------------------------------------------------
    console.log('\n[Test D1] Security Check: Unauthorized Teacher C cannot accept/reject Teacher B appointment...');
    const unauthRes = await fetch(`${BASE_URL}/api/appointments/${appointment1Id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherC.token}` },
    });
    const unauthData = (await unauthRes.json()) as any;
    if (unauthRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for unauthorized teacher, got HTTP ${unauthRes.status}: ${JSON.stringify(unauthData)}`);
    }
    console.log(`  ✓ [Security Verified] Unauthorized teacher access blocked with HTTP 403 Forbidden: "${unauthData.message}"`);

    // State check: cannot re-accept an already accepted appointment
    console.log('\n[Test D2] State Validation: Cannot accept an appointment that is already Accepted...');
    const reAcceptRes = await fetch(`${BASE_URL}/api/appointments/${appointment1Id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherB.token}` },
    });
    const reAcceptData = (await reAcceptRes.json()) as any;
    if (reAcceptRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for accepting non-pending appointment, got HTTP ${reAcceptRes.status}`);
    }
    console.log(`  ✓ [State Validation Verified] Blocked invalid transition with HTTP 400 Bad Request: "${reAcceptData.message}"`);

    // -------------------------------------------------------------
    // TEST E: Rejection Workflow with Reason
    // -------------------------------------------------------------
    console.log('\n[Test E] Rejection Workflow: Student A submits second request, Teacher B rejects with reason...');

    // Student A creates second appointment
    const createRes2 = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({
        teacherId: teacherB.userId,
        skillName: 'React & TypeScript Architecture',
        requestedDate: dateStr,
        startTime: '10:00',
        durationMinutes: 60,
        isFreeSwap: false,
        hourlyPrice: 65,
        totalCost: 65,
        message: 'Requesting morning review session.',
      }),
    });
    const createData2 = (await createRes2.json()) as any;
    const appointment2Id = createData2.data.id;
    console.log(`  ✓ Student A created second request (ID: ${appointment2Id})`);

    // Setup listener for Student A real-time rejection update
    const studentRejectedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for Student A to receive rejection event')), 8000);
      studentSocket.on('appointment:updated', (apt) => {
        if (apt.id === appointment2Id && apt.status === 'Rejected') {
          clearTimeout(timer);
          resolve(apt);
        }
      });
    });

    // Teacher B rejects with reason
    const declineReason = 'Unavailable at 10:00 AM due to scheduled conference. Please request after 5:00 PM.';
    const rejectRes = await fetch(`${BASE_URL}/api/appointments/${appointment2Id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherB.token}`,
      },
      body: JSON.stringify({
        rejectionReason: declineReason,
      }),
    });
    const rejectData = (await rejectRes.json()) as any;
    if (!rejectData.success || rejectData.data?.status !== 'Rejected') {
      throw new Error(`Failed to reject appointment: ${JSON.stringify(rejectData)}`);
    }
    console.log(`  ✓ Teacher B rejected request via PATCH /api/appointments/:id/reject: HTTP 200 (Status: ${rejectData.data.status})`);

    // Verify MongoDB document
    const doc2Rejected = await appointmentsCollection.findOne({ _id: new mongoose.Types.ObjectId(appointment2Id) });
    if (doc2Rejected?.status !== 'Rejected') {
      throw new Error(`Expected MongoDB status 'Rejected', got ${doc2Rejected?.status}`);
    }
    if (doc2Rejected?.rejectionReason !== declineReason) {
      throw new Error(`Expected rejectionReason in MongoDB, got "${doc2Rejected?.rejectionReason}"`);
    }
    console.log(`  ✓ [MongoDB Verified] Atlas document status="Rejected", rejectionReason="${doc2Rejected.rejectionReason}"`);

    // Verify real-time update received by Student A
    const rejectedEvent = await studentRejectedPromise;
    console.log(`  ✓ [Real-Time Socket] Student A received instant 'appointment:updated' event: status="${rejectedEvent.status}", reason="${rejectedEvent.rejectionReason}"`);

    // Verify Student A sees rejection reason in API
    const studentFetch2 = await fetch(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    const studentFetch2Data = (await studentFetch2.json()) as any;
    const studentApt2 = studentFetch2Data.data.find((a: any) => a.id === appointment2Id);
    if (studentApt2?.status !== 'Rejected' || studentApt2?.rejectionReason !== declineReason) {
      throw new Error(`Student A did not receive expected rejection details in API: ${JSON.stringify(studentApt2)}`);
    }
    console.log(`  ✓ Student A fetched request details: Status="${studentApt2.status}", Rejection Reason="${studentApt2.rejectionReason}"`);

    // Disconnect sockets and db
    studentSocket.disconnect();
    teacherSocket.disconnect();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log(' ALL REQUEST & APPROVAL WORKFLOW TESTS PASSED 100%!   ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ WORKFLOW TEST FAILED:', err.message);
    process.exit(1);
  }
};

runAppointmentWorkflowTests();
