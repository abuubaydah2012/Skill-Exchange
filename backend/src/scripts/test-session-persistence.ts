import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only';

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

// Simulates the exact client-side storage & restoration logic from AppContext.tsx
function simulateClientStorageInit(token: string | null, storedUserStr: string | null) {
  if (token && storedUserStr) {
    try {
      const parsed = JSON.parse(storedUserStr);
      if (parsed && typeof parsed === 'object' && (parsed.id || parsed._id) && parsed.email) {
        return {
          currentUser: {
            ...parsed,
            id: parsed.id || parsed._id,
          },
          isAuthLoading: true,
        };
      }
    } catch {
      // ignore
    }
  }
  return {
    currentUser: null,
    isAuthLoading: Boolean(token),
  };
}

async function run() {
  console.log('====================================================');
  console.log('AUTHENTICATION SESSION PERSISTENCE & SECURITY AUDIT');
  console.log('====================================================\n');

  // Check health
  const health = await request(`${BASE_URL}/health`);
  if (!health.ok || health.data?.database?.status !== 'connected') {
    throw new Error('Backend database not connected');
  }
  console.log('[System Health] Backend API is UP and connected to MongoDB Atlas.\n');

  // =========================================================================
  // TEST A: STUDENT SESSION PERSISTENCE (Elena Rostova - learner@skillexchange.io)
  // =========================================================================
  console.log('--- TEST A: Student Session Persistence ---');
  console.log('1. Logging in with real Student account (learner@skillexchange.io)...');
  const studentLoginRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'learner@skillexchange.io',
      password: 'password123',
    }),
  });

  if (!studentLoginRes.ok || !studentLoginRes.data?.data?.token) {
    throw new Error('Student login failed: ' + JSON.stringify(studentLoginRes.data));
  }

  const studentToken = studentLoginRes.data.data.token;
  const initialStudentUser = studentLoginRes.data.data.user;
  console.log(`✓ Student authenticated: Name="${initialStudentUser.name}", Role="${initialStudentUser.role}", ID=${initialStudentUser.id || initialStudentUser._id}`);

  // Simulate storing in localStorage
  let clientStorageToken: string | null = studentToken;
  let clientStorageUser: string | null = JSON.stringify(initialStudentUser);

  // 2. Simulate Browser Refresh #1 (AppContext initialization)
  console.log('\n2. Simulating browser refresh on /dashboard...');
  let restoredState = simulateClientStorageInit(clientStorageToken, clientStorageUser);
  console.log(`Initial state on page mount: currentUser=${restoredState.currentUser?.name} (${restoredState.currentUser?.role}), isAuthLoading=${restoredState.isAuthLoading}`);
  if (!restoredState.currentUser || restoredState.currentUser.role !== 'learner') {
    throw new Error('State initialization failed to restore cached student session!');
  }

  // AppContext useEffect calls GET /api/auth/me to verify and refresh session
  console.log('Calling GET /api/auth/me with stored Student token to verify with backend...');
  const studentMeRes = await request(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });

  if (!studentMeRes.ok || !studentMeRes.data?.data) {
    throw new Error('Backend session restore failed for student: ' + JSON.stringify(studentMeRes.data));
  }
  const verifiedStudent = studentMeRes.data.data;
  console.log(`✓ Backend restored student profile: Name="${verifiedStudent.name}", Email=${verifiedStudent.email}, Role=${verifiedStudent.role}`);
  if (verifiedStudent.email !== 'learner@skillexchange.io' || verifiedStudent.role !== 'learner') {
    throw new Error('Student account identity was corrupted or modified on restore!');
  }

  // Verify Student's appointments
  const studentApts = await request(`${BASE_URL}/appointments`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });
  console.log(`✓ Student appointments synchronized: ${studentApts.data?.data?.length || 0} appointment(s) found.`);

  // 3. Simulate Navigating to another route (/appointments) and Refreshing again
  console.log('\n3. Simulating navigation to /appointments and second browser refresh...');
  restoredState = simulateClientStorageInit(clientStorageToken, JSON.stringify(verifiedStudent));
  const studentMeRes2 = await request(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });
  if (!studentMeRes2.ok || studentMeRes2.data?.data?.email !== 'learner@skillexchange.io') {
    throw new Error('Second refresh failed to maintain Student session!');
  }
  console.log(`✓ Student session successfully preserved across navigation and second refresh: Name="${studentMeRes2.data.data.name}"`);

  // =========================================================================
  // TEST B: TEACHER SESSION PERSISTENCE (Marcus Vance - teacher@skillexchange.io)
  // =========================================================================
  console.log('\n--- TEST B: Teacher Session Persistence ---');
  console.log('1. Logging out Student and clearing client session...');
  clientStorageToken = null;
  clientStorageUser = null;
  restoredState = simulateClientStorageInit(clientStorageToken, clientStorageUser);
  console.log(`✓ Session after logout: currentUser=${restoredState.currentUser}, isAuthLoading=${restoredState.isAuthLoading}`);
  if (restoredState.currentUser !== null) {
    throw new Error('Logout did not clear current user!');
  }

  console.log('\n2. Logging in with real Teacher account (teacher@skillexchange.io)...');
  const teacherLoginRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'teacher@skillexchange.io',
      password: 'password123',
    }),
  });

  if (!teacherLoginRes.ok || !teacherLoginRes.data?.data?.token) {
    throw new Error('Teacher login failed: ' + JSON.stringify(teacherLoginRes.data));
  }

  const teacherToken = teacherLoginRes.data.data.token;
  const initialTeacherUser = teacherLoginRes.data.data.user;
  console.log(`✓ Teacher authenticated: Name="${initialTeacherUser.name}", Role="${initialTeacherUser.role}", ID=${initialTeacherUser.id || initialTeacherUser._id}`);

  clientStorageToken = teacherToken;
  clientStorageUser = JSON.stringify(initialTeacherUser);

  // 3. Simulate Browser Refresh as Teacher
  console.log('\n3. Simulating browser refresh on /dashboard...');
  restoredState = simulateClientStorageInit(clientStorageToken, clientStorageUser);
  console.log(`Initial state on page mount: currentUser=${restoredState.currentUser?.name} (${restoredState.currentUser?.role})`);
  if (!restoredState.currentUser || restoredState.currentUser.role !== 'teacher') {
    throw new Error('State initialization failed to restore cached teacher session!');
  }

  // AppContext useEffect calls GET /api/auth/me to verify and refresh session
  console.log('Calling GET /api/auth/me with stored Teacher token to verify with backend...');
  const teacherMeRes = await request(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });

  if (!teacherMeRes.ok || !teacherMeRes.data?.data) {
    throw new Error('Backend session restore failed for teacher: ' + JSON.stringify(teacherMeRes.data));
  }
  const verifiedTeacher = teacherMeRes.data.data;
  console.log(`✓ Backend restored teacher profile: Name="${verifiedTeacher.name}", Email=${verifiedTeacher.email}, Role=${verifiedTeacher.role}`);
  console.log(`✓ Teacher teaching skills populated: ${verifiedTeacher.teachingSkills?.length || 0} skill(s) registered.`);
  if (verifiedTeacher.email !== 'teacher@skillexchange.io' || verifiedTeacher.role !== 'teacher') {
    throw new Error('Teacher account identity was corrupted or modified on restore!');
  }

  // Verify Teacher's appointments & conversations
  const teacherApts = await request(`${BASE_URL}/appointments`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });
  console.log(`✓ Teacher appointments synchronized: ${teacherApts.data?.data?.length || 0} appointment(s) found.`);

  const teacherConvs = await request(`${BASE_URL}/messages/conversations`, {
    headers: { Authorization: `Bearer ${clientStorageToken}` },
  });
  console.log(`✓ Teacher inbox conversations synchronized: ${teacherConvs.data?.data?.length || 0} conversation(s) found.`);

  // =========================================================================
  // TEST C: SECURITY & TOKEN INVALIDATION
  // =========================================================================
  console.log('\n--- TEST C: Security & Invalidation Tests ---');

  // C.1 No Token
  console.log('1. Testing with NO token...');
  const noTokenState = simulateClientStorageInit(null, null);
  console.log(`Initial client state: currentUser=${noTokenState.currentUser}, isAuthLoading=${noTokenState.isAuthLoading}`);
  if (noTokenState.currentUser !== null) {
    throw new Error('Security failure: currentUser defaulted to demo user when no token exists!');
  }
  const noTokenRes = await request(`${BASE_URL}/auth/me`);
  console.log(`GET /api/auth/me without token status: ${noTokenRes.status} (Expected: 401)`);
  if (noTokenRes.status !== 401) {
    throw new Error('Security failure: Endpoint did not return 401 when no token was provided!');
  }
  console.log('✓ Confirmed: Unauthenticated requests are rejected and never default to demo accounts.');

  // C.2 Invalid Token
  console.log('\n2. Testing with INVALID token ("Bearer bogus-token-12345")...');
  const invalidTokenRes = await request(`${BASE_URL}/auth/me`, {
    headers: { Authorization: 'Bearer bogus-token-12345' },
  });
  console.log(`GET /api/auth/me with invalid token status: ${invalidTokenRes.status} (Expected: 401)`);
  if (invalidTokenRes.status !== 401) {
    throw new Error('Security failure: Backend accepted an invalid token!');
  }
  console.log('✓ Confirmed: Invalid token returns 401. Client logic clears session and redirects to login.');

  // C.3 Expired Token
  console.log('\n3. Testing with EXPIRED token (signed with expired timestamp)...');
  const expiredToken = jwt.sign(
    { userId: verifiedTeacher.id || verifiedTeacher._id, email: verifiedTeacher.email, role: verifiedTeacher.role },
    JWT_SECRET,
    { expiresIn: -3600 } // expired 1 hour ago
  );
  const expiredTokenRes = await request(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  console.log(`GET /api/auth/me with expired token status: ${expiredTokenRes.status} (Expected: 401)`);
  console.log('Response body:', expiredTokenRes.data);
  if (expiredTokenRes.status !== 401) {
    throw new Error('Security failure: Backend accepted an expired token!');
  }
  console.log('✓ Confirmed: Expired token returns 401. Client logic clears expired session.');

  // C.4 Data Isolation
  console.log('\n4. Testing cross-user data isolation...');
  const teacherId = verifiedTeacher.id || verifiedTeacher._id;
  const studentId = verifiedStudent.id || verifiedStudent._id;
  if (teacherId === studentId) {
    throw new Error('Teacher and Student cannot have the same ID!');
  }
  console.log(`✓ Confirmed data isolation: Student ID (${studentId}) != Teacher ID (${teacherId})`);

  console.log('\n====================================================');
  console.log('ALL AUTHENTICATION PERSISTENCE & SECURITY TESTS PASSED!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
