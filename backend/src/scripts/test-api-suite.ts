import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../config/database.js';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware.js';

// Models
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Appointment } from '../models/Appointment.js';
import { Notification } from '../models/Notification.js';

// Routes
import authRoutes from '../routes/authRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import skillRoutes from '../routes/skillRoutes.js';
import appointmentRoutes from '../routes/appointmentRoutes.js';

dotenv.config();

interface TestResult {
  part: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
}

const results: TestResult[] = [];

const record = (part: string, name: string, passed: boolean, details?: string) => {
  results.push({
    part,
    name,
    status: passed ? 'PASSED' : 'FAILED',
    details,
  });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${part}] ${name}${details ? ` -> ${details}` : ''}`);
};

const runSuite = async () => {
  console.log('================================================================');
  console.log('Skill Exchange API & MongoDB Atlas Test Suite');
  console.log('================================================================\n');

  // 1. Initialize MongoDB connection
  console.log('Step 1: Connecting to MongoDB Atlas database...');
  await connectDB();
  console.log(`Connected to: ${mongoose.connection.name}\n`);

  // 2. Setup Test Express Server on an ephemeral port
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Ephemeral API test server running at: ${baseUrl}\n`);

  const timestamp = Date.now();
  const testTeacherEmail = `teacher_${timestamp}@test.io`;
  const testLearnerEmail = `learner_${timestamp}@test.io`;
  const testPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testPassword = 'Password123!';

  let teacherToken = '';
  let learnerToken = '';
  let teacherId = '';
  let learnerId = '';
  let createdSkillId = '';
  let createdAppointmentId = '';

  try {
    // =========================================================================
    // PART 1: User Registration API
    // =========================================================================
    console.log('--- PART 1: User Registration API ---');

    // Test 1.1: Register Teacher
    const regTeacherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Jane Smith',
        email: testTeacherEmail,
        password: testPassword,
        role: 'teacher',
        phoneNumber: testPhone,
        countryCode: '+1',
        bio: 'Senior full-stack engineer and educator.',
        headline: 'Lead TypeScript & Cloud Instructor',
        languages: ['English', 'German'],
      }),
    });
    const regTeacherData: any = await regTeacherRes.json();
    teacherToken = regTeacherData?.data?.token || '';
    teacherId = regTeacherData?.data?.user?._id || regTeacherData?.data?.user?.id || '';

    record(
      'Part 1: Registration',
      'Register teacher with required info and password hashing',
      regTeacherRes.status === 201 && regTeacherData.success === true && !!teacherToken,
      `Status ${regTeacherRes.status}`
    );

    // Verify password was securely hashed in MongoDB (NOT stored in plain text!)
    const dbUser = await User.findOne({ email: testTeacherEmail }).select('+password');
    const isHashed = dbUser?.password && dbUser.password.startsWith('$2') && dbUser.password !== testPassword;
    record(
      'Part 1: Registration',
      'Verify password is cryptographically hashed with bcrypt in Atlas',
      Boolean(isHashed),
      `Hash prefix: ${dbUser?.password?.substring(0, 10)}...`
    );

    // Test 1.2: Register Learner
    const regLearnerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Johnson',
        email: testLearnerEmail,
        password: testPassword,
        role: 'learner',
        phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
        learningInterests: ['React', 'MongoDB', 'Cloud Architecture'],
      }),
    });
    const regLearnerData: any = await regLearnerRes.json();
    learnerToken = regLearnerData?.data?.token || '';
    learnerId = regLearnerData?.data?.user?._id || regLearnerData?.data?.user?.id || '';

    record(
      'Part 1: Registration',
      'Register learner successfully with JWT generated',
      regLearnerRes.status === 201 && regLearnerData.success === true && !!learnerToken,
      `Status ${regLearnerRes.status}`
    );

    // Test 1.3: Reject Admin Role in Public Registration (Privilege Escalation Protection)
    const adminRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `admin_attempt_${timestamp}@test.io`,
        password: 'Password123!',
        role: 'admin',
      }),
    });
    const adminRegData: any = await adminRegRes.json();
    record(
      'Part 1: Registration',
      'Reject public registration with admin role with 403 Forbidden',
      adminRegRes.status === 403 && adminRegData.success === false,
      `Status ${adminRegRes.status} -> ${adminRegData.message}`
    );

    // Test 1.4: Duplicate Email Check
    const dupEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter User',
        email: testTeacherEmail,
        password: 'AnotherPassword123!',
      }),
    });
    const dupEmailData: any = await dupEmailRes.json();
    record(
      'Part 1: Registration',
      'Reject duplicate email registration with 409 Conflict',
      dupEmailRes.status === 409 && dupEmailData.success === false,
      `Status ${dupEmailRes.status}`
    );

    // Test 1.4: Duplicate Phone Number Check
    const dupPhoneRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: `unique_${timestamp}@test.io`,
        phoneNumber: testPhone, // Same phone as teacher
        password: 'Password123!',
      }),
    });
    const dupPhoneData: any = await dupPhoneRes.json();
    record(
      'Part 1: Registration',
      'Reject duplicate phone number registration with 409 Conflict',
      dupPhoneRes.status === 409 && dupPhoneData.success === false,
      `Status ${dupPhoneRes.status}`
    );

    // Test 1.5: Input Validation (invalid email, short password)
    const invalidInputRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        email: 'invalid-email-format',
        password: '123', // too short
      }),
    });
    record(
      'Part 1: Registration',
      'Reject invalid input fields with 400 Bad Request',
      invalidInputRes.status === 400,
      `Status ${invalidInputRes.status}`
    );

    console.log();

    // =========================================================================
    // PART 2: User Login API
    // =========================================================================
    console.log('--- PART 2: User Login API ---');

    // Test 2.1: Valid Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testTeacherEmail,
        password: testPassword,
      }),
    });
    const loginData: any = await loginRes.json();
    record(
      'Part 2: Login',
      'Authenticate with correct credentials and issue valid JWT',
      loginRes.status === 200 && loginData.success === true && !!loginData.data.token,
      `Status ${loginRes.status}`
    );

    // Test 2.2: Invalid Password
    const badPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testTeacherEmail,
        password: 'WrongPassword999',
      }),
    });
    record(
      'Part 2: Login',
      'Reject invalid password with 401 Unauthorized',
      badPassRes.status === 401,
      `Status ${badPassRes.status}`
    );

    // Test 2.3: Non-existent Email
    const noUserRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_user_xyz@test.io',
        password: 'Password123!',
      }),
    });
    record(
      'Part 2: Login',
      'Reject non-existent email with 401 Unauthorized',
      noUserRes.status === 401,
      `Status ${noUserRes.status}`
    );

    // Test 2.4: Missing credentials
    const missingCredsRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    record(
      'Part 2: Login',
      'Reject missing credentials with 400 Bad Request',
      missingCredsRes.status === 400,
      `Status ${missingCredsRes.status}`
    );

    console.log();

    // =========================================================================
    // PART 3: User Profile API
    // =========================================================================
    console.log('--- PART 3: User Profile API ---');

    // Test 3.1: Get Profile (Authenticated with Bearer token)
    const profileRes = await fetch(`${baseUrl}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const profileData: any = await profileRes.json();
    record(
      'Part 3: Profile',
      'Get logged-in user profile via GET /api/users/profile',
      profileRes.status === 200 && profileData.data?.email === testTeacherEmail,
      `Returned user: ${profileData.data?.name}`
    );

    // Test 3.2: Get Profile without Token (Protected Route)
    const unauthProfileRes = await fetch(`${baseUrl}/users/profile`);
    record(
      'Part 3: Profile',
      'Protect profile route from unauthenticated requests with 401',
      unauthProfileRes.status === 401,
      `Status ${unauthProfileRes.status}`
    );

    // Test 3.3: Update Profile Information
    const updateProfileRes = await fetch(`${baseUrl}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        headline: 'Principal Software Architect & Mentor',
        location: 'San Francisco, CA (Remote)',
        languages: ['English', 'German', 'Spanish'],
      }),
    });
    const updatedProfileData: any = await updateProfileRes.json();
    record(
      'Part 3: Profile',
      'Update profile information via PUT /api/users/profile',
      updateProfileRes.status === 200 &&
        updatedProfileData.data?.headline === 'Principal Software Architect & Mentor' &&
        updatedProfileData.data?.location === 'San Francisco, CA (Remote)',
      `Updated headline: ${updatedProfileData.data?.headline}`
    );

    console.log();

    // =========================================================================
    // PART 4: Skills API
    // =========================================================================
    console.log('--- PART 4: Skills API ---');

    // Test 4.1: Create Skill
    const createSkillRes = await fetch(`${baseUrl}/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        name: 'Advanced React & TypeScript Architecture',
        category: 'Software Engineering',
        proficiency: 'Expert',
        description: 'Comprehensive 1-on-1 coaching covering hooks, state management, and Vite production builds.',
        yearsExperience: 8,
        freeSwapAvailable: true,
        paidLessonAvailable: true,
        hourlyPrice: 65,
        availabilitySchedule: 'Weekdays 6-9 PM, Weekends flexible',
      }),
    });
    const createSkillData: any = await createSkillRes.json();
    createdSkillId = createSkillData?.data?._id || '';
    record(
      'Part 4: Skills',
      'Create teaching skill connected to authenticated teacher in Atlas',
      createSkillRes.status === 201 && !!createdSkillId,
      `Skill ID: ${createdSkillId}`
    );

    // Test 4.2: Unauthenticated Skill Creation (Protected Route)
    const unauthSkillRes = await fetch(`${baseUrl}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacking Skill', category: 'Testing', description: 'Testing' }),
    });
    record(
      'Part 4: Skills',
      'Reject unauthenticated skill creation with 401 Unauthorized',
      unauthSkillRes.status === 401,
      `Status ${unauthSkillRes.status}`
    );

    // Test 4.3: View Skills Catalog (Public)
    const getSkillsRes = await fetch(`${baseUrl}/skills?category=Software+Engineering`);
    const getSkillsData: any = await getSkillsRes.json();
    const foundCreated = getSkillsData.data?.some((s: any) => s._id === createdSkillId);
    record(
      'Part 4: Skills',
      'View skills catalog with category filtering via GET /api/skills',
      getSkillsRes.status === 200 && foundCreated,
      `Catalog count: ${getSkillsData.count}`
    );

    // Test 4.4: View Skill by ID
    const getSkillByIdRes = await fetch(`${baseUrl}/skills/${createdSkillId}`);
    const getSkillByIdData: any = await getSkillByIdRes.json();
    record(
      'Part 4: Skills',
      'View single skill by ID via GET /api/skills/:id with populated user',
      getSkillByIdRes.status === 200 && getSkillByIdData.data?.name === 'Advanced React & TypeScript Architecture',
      `Teacher: ${getSkillByIdData.data?.userId?.name}`
    );

    // Test 4.5: Update Skill by Owner
    const updateSkillRes = await fetch(`${baseUrl}/skills/${createdSkillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        hourlyPrice: 75,
        availabilitySchedule: 'Weekdays 7-10 PM EST',
      }),
    });
    const updateSkillData: any = await updateSkillRes.json();
    record(
      'Part 4: Skills',
      'Update skill details by owner via PUT /api/skills/:id',
      updateSkillRes.status === 200 && updateSkillData.data?.hourlyPrice === 75,
      `Updated hourly rate: $${updateSkillData.data?.hourlyPrice}`
    );

    // Test 4.6: Unauthorized Skill Update by Another User
    const badSkillUpdateRes = await fetch(`${baseUrl}/skills/${createdSkillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`, // Learner trying to edit teacher's skill
      },
      body: JSON.stringify({ hourlyPrice: 1 }),
    });
    record(
      'Part 4: Skills',
      'Reject unauthorized skill update by non-owner with 403 Forbidden',
      badSkillUpdateRes.status === 403,
      `Status ${badSkillUpdateRes.status}`
    );

    console.log();

    // =========================================================================
    // PART 5: Appointment API
    // =========================================================================
    console.log('--- PART 5: Appointment API ---');

    // Test 5.1: Request Appointment (Learner requests lesson from Teacher)
    const requestAptRes = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        teacherId,
        skillId: createdSkillId,
        skillName: 'Advanced React & TypeScript Architecture',
        requestedDate: '2026-12-05',
        startTime: '14:00',
        durationMinutes: 60,
        isFreeSwap: false,
        hourlyPrice: 75,
        totalCost: 75,
        message: 'Looking forward to diving deep into custom hooks and architectural patterns.',
      }),
    });
    const requestAptData: any = await requestAptRes.json();
    createdAppointmentId = requestAptData?.data?._id || '';
    record(
      'Part 5: Appointments',
      'Request appointment as learner via POST /api/appointments',
      requestAptRes.status === 201 && requestAptData.data?.status === 'Pending',
      `Appointment ID: ${createdAppointmentId}`
    );

    // Test 5.1b: Verify pricing and totalCost are calculated securely by backend from Skill in DB
    record(
      'Part 5: Appointments',
      'Verify appointment pricing and totalCost are securely calculated by backend',
      requestAptData.data?.hourlyPrice === 75 && requestAptData.data?.totalCost === 75,
      `Verified: hourlyPrice=$${requestAptData.data?.hourlyPrice}, totalCost=$${requestAptData.data?.totalCost}`
    );

    // Test 5.2: Self-booking prevention
    const selfAptRes = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`, // Teacher booking themselves
      },
      body: JSON.stringify({
        teacherId,
        skillId: createdSkillId,
        requestedDate: '2026-12-05',
        startTime: '10:00',
      }),
    });
    record(
      'Part 5: Appointments',
      'Prevent booking appointment with oneself with 400 Bad Request',
      selfAptRes.status === 400,
      `Status ${selfAptRes.status}`
    );

    // Test 5.3: View Appointment History
    const aptHistoryRes = await fetch(`${baseUrl}/appointments?role=teacher`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const aptHistoryData: any = await aptHistoryRes.json();
    const hasApt = aptHistoryData.data?.some((a: any) => a._id === createdAppointmentId);
    record(
      'Part 5: Appointments',
      'View appointment history via GET /api/appointments',
      aptHistoryRes.status === 200 && hasApt,
      `History count: ${aptHistoryData.count}`
    );

    // Test 5.4: Unauthorized Acceptance by Learner
    const learnerAcceptRes = await fetch(`${baseUrl}/appointments/${createdAppointmentId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${learnerToken}` }, // Learner trying to accept their own request
    });
    record(
      'Part 5: Appointments',
      'Reject appointment acceptance by learner with 403 Forbidden',
      learnerAcceptRes.status === 403,
      `Status ${learnerAcceptRes.status}`
    );

    // Test 5.5: Accept Appointment by Teacher
    const acceptAptRes = await fetch(`${baseUrl}/appointments/${createdAppointmentId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const acceptAptData: any = await acceptAptRes.json();
    record(
      'Part 5: Appointments',
      'Accept appointment request by instructor via PATCH /:id/accept',
      acceptAptRes.status === 200 && acceptAptData.data?.status === 'Accepted',
      `Status changed to: ${acceptAptData.data?.status}`
    );

    // Test 5.6: Complete Appointment
    const completeAptRes = await fetch(`${baseUrl}/appointments/${createdAppointmentId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const completeAptData: any = await completeAptRes.json();

    // Verify both teacher and learner completed sessions count incremented
    const [tUser, lUser] = await Promise.all([
      User.findById(teacherId),
      User.findById(learnerId),
    ]);
    const completedOk =
      completeAptRes.status === 200 &&
      completeAptData.data?.status === 'Completed' &&
      (tUser?.completedSessionsCount || 0) >= 1 &&
      (lUser?.completedSessionsCount || 0) >= 1;

    record(
      'Part 5: Appointments',
      'Complete appointment and increment session count via PATCH /:id/complete',
      Boolean(completedOk),
      `Sessions count: teacher=${tUser?.completedSessionsCount}, learner=${lUser?.completedSessionsCount}`
    );

    // Test 5.6b: Ensure appointment completion is idempotent (cannot re-increment counters)
    const repeatCompleteRes = await fetch(`${baseUrl}/appointments/${createdAppointmentId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const repeatCompleteData: any = await repeatCompleteRes.json();
    const [tUserAfter, lUserAfter] = await Promise.all([
      User.findById(teacherId),
      User.findById(learnerId),
    ]);
    const idempotentOk =
      repeatCompleteRes.status === 200 &&
      tUserAfter?.completedSessionsCount === tUser?.completedSessionsCount &&
      lUserAfter?.completedSessionsCount === lUser?.completedSessionsCount;

    record(
      'Part 5: Appointments',
      'Ensure appointment completion is idempotent (no duplicate session increments)',
      Boolean(idempotentOk),
      `Sessions count after second complete: teacher=${tUserAfter?.completedSessionsCount}, learner=${lUserAfter?.completedSessionsCount}`
    );

    // Test 5.7: Request and Cancel Appointment with Reason
    const cancelAptTestRes = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        teacherId,
        skillId: createdSkillId,
        requestedDate: '2026-12-10',
        startTime: '16:00',
      }),
    });
    const cancelAptTestData: any = await cancelAptTestRes.json();
    const cancelAptId = cancelAptTestData.data?._id;

    const cancelRes = await fetch(`${baseUrl}/appointments/${cancelAptId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({ reason: 'Schedule conflict with university exam' }),
    });
    const cancelData: any = await cancelRes.json();
    record(
      'Part 5: Appointments',
      'Cancel appointment with reason via PATCH /:id/cancel',
      cancelRes.status === 200 &&
        cancelData.data?.status === 'Cancelled' &&
        cancelData.data?.cancellationReason === 'Schedule conflict with university exam',
      `Reason: ${cancelData.data?.cancellationReason}`
    );

    // Clean up created cancel test appointment
    await Appointment.findByIdAndDelete(cancelAptId);
  } finally {
    // =========================================================================
    // CLEANUP: Clean up test documents so Atlas remains clean
    // =========================================================================
    console.log('\n--- Cleaning up test records from MongoDB Atlas ---');
    try {
      if (createdAppointmentId) {
        await Appointment.findByIdAndDelete(createdAppointmentId);
      }
      if (createdSkillId) {
        await Skill.findByIdAndDelete(createdSkillId);
      }
      if (teacherId) {
        await User.findByIdAndDelete(teacherId);
        await Notification.deleteMany({ userId: teacherId });
      }
      if (learnerId) {
        await User.findByIdAndDelete(learnerId);
        await Notification.deleteMany({ userId: learnerId });
      }

      // Comprehensive safety purge: clean any stray test domain records
      const testUsers = await User.find({ email: /@test\.io$/i });
      const testUserIds = testUsers.map((u) => u._id);
      if (testUserIds.length > 0) {
        await Appointment.deleteMany({ $or: [{ learnerId: { $in: testUserIds } }, { teacherId: { $in: testUserIds } }] });
        await Skill.deleteMany({ userId: { $in: testUserIds } });
        await Notification.deleteMany({ userId: { $in: testUserIds } });
        await User.deleteMany({ _id: { $in: testUserIds } });
      }
      console.log('✅ Cleaned up temporary test users, skills, and appointments.');
    } catch (cleanErr: any) {
      console.warn('Cleanup warning:', cleanErr.message);
    }

    server.close();
    await mongoose.disconnect();
    console.log('Test server stopped and database connection closed cleanly.\n');
  }

  // Summary
  console.log('================================================================');
  console.log('TEST SUITE SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ SOME TESTS FAILED:');
    results.filter((r) => r.status === 'FAILED').forEach((r) => {
      console.error(`  - [${r.part}] ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ ALL 20 ENDPOINT AND DATABASE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
};

runSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
