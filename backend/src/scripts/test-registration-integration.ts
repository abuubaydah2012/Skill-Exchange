import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { Certificate } from '../models/Certificate.js';
import authRoutes from '../routes/authRoutes.js';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware.js';

dotenv.config();

interface TestAssertion {
  name: string;
  passed: boolean;
  details?: string;
}

const assertions: TestAssertion[] = [];

const assertTest = (name: string, condition: boolean, details?: string) => {
  assertions.push({ name, passed: condition, details });
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` -> ${details}` : ''}`);
  if (!condition) {
    console.error(`     FAILURE DETAILS: ${details || 'Assertion failed'}`);
  }
};

const runVerification = async () => {
  console.log('================================================================');
  console.log('Skill Exchange: Frontend-to-Backend Registration Verification');
  console.log('Targeting Database: MongoDB Atlas');
  console.log('================================================================\n');

  // Step 1: Connect to Atlas
  console.log('Step 1: Connecting to MongoDB Atlas cluster...');
  await connectDB();
  console.log(`Connected to active database: ${mongoose.connection.name}\n`);

  // Step 2: Initialize Express Server with the same configuration as server.ts
  const app = express();
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));
  app.use('/api/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5002;
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;
  console.log(`Test API Server running on port ${port} (${baseUrl})\n`);

  const timestamp = Date.now();
  const testLearnerEmail = `test_learner_${timestamp}@skillexchange.io`;
  const testTeacherEmail = `test_teacher_${timestamp}@skillexchange.io`;
  const testMinorEmail = `test_minor_${timestamp}@skillexchange.io`;

  let learnerUserId = '';
  let teacherUserId = '';
  let minorUserId = '';
  let learnerToken = '';
  let teacherToken = '';

  try {
    // =========================================================================
    // TEST 1: Check Email Availability Endpoint (Available)
    // =========================================================================
    console.log('--- TEST 1: Check Email Availability API ---');
    const checkEmailRes = await fetch(`${baseUrl}/check-email?email=${encodeURIComponent(testLearnerEmail)}`);
    const checkEmailData: any = await checkEmailRes.json();
    assertTest(
      'GET /api/auth/check-email returns available=true for unused email',
      checkEmailRes.status === 200 && checkEmailData.available === true,
      `Status: ${checkEmailRes.status}, available: ${checkEmailData.available}`
    );

    // =========================================================================
    // TEST 2: Register a new Learner (with NID document, Certificate & Avatar)
    // =========================================================================
    console.log('\n--- TEST 2: Register New Learner ---');
    const learnerPayload = {
      name: 'Maya Patel',
      email: testLearnerEmail,
      phoneNumber: '+1 5550198273',
      countryCode: '+1',
      dateOfBirth: '2000-05-14',
      role: 'learner',
      password: 'SecureLearnerPass123!',
      avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      identityDocument: {
        type: 'National ID (NID)',
        documentNumber: `NID-L-${timestamp}`,
        fileName: 'maya_national_id.pdf',
        fileSize: 204850,
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
      },
      certificates: [
        {
          title: 'Introductory Data Science Credential',
          issuingOrganization: 'Stanford Online Coursework',
          fileName: 'data_science_intro.pdf',
          fileSize: 105400,
          fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
        },
      ],
    };

    const regLearnerRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(learnerPayload),
    });
    const regLearnerData: any = await regLearnerRes.json();
    learnerToken = regLearnerData?.data?.token || '';
    learnerUserId = regLearnerData?.data?.user?._id || '';

    assertTest(
      'POST /api/auth/register creates learner successfully',
      regLearnerRes.status === 201 && regLearnerData.success === true && !!learnerToken,
      `Status: ${regLearnerRes.status}, UserID: ${learnerUserId}`
    );

    // =========================================================================
    // TEST 3: Verify Learner in MongoDB Atlas Database
    // =========================================================================
    console.log('\n--- TEST 3: Direct MongoDB Atlas Verification for Learner ---');
    const dbLearner = await User.findOne({ email: testLearnerEmail }).select('+password');
    assertTest(
      'Learner document exists in Atlas skill_exchange.users collection',
      Boolean(dbLearner && dbLearner._id.toString() === learnerUserId),
      `Found email: ${dbLearner?.email}`
    );

    assertTest(
      'Learner role is correctly saved as "learner"',
      dbLearner?.role === 'learner',
      `Role: ${dbLearner?.role}`
    );

    assertTest(
      'Learner password is cryptographically hashed with bcrypt (never plaintext)',
      Boolean(
        dbLearner?.password &&
        dbLearner.password.startsWith('$2') &&
        dbLearner.password !== 'SecureLearnerPass123!'
      ),
      `Hash prefix: ${dbLearner?.password?.substring(0, 10)}...`
    );

    assertTest(
      'Learner avatarUrl is persisted in Atlas',
      Boolean(dbLearner?.avatarUrl && dbLearner.avatarUrl.startsWith('data:image/png')),
      `AvatarUrl length: ${dbLearner?.avatarUrl?.length}`
    );

    assertTest(
      'Learner identity verification document is persisted with correct documentType, number and fileName',
      Boolean(
        dbLearner?.identityVerification?.documentType === 'National ID (NID)' &&
        dbLearner?.identityVerification?.documentNumber === `NID-L-${timestamp}` &&
        dbLearner?.identityVerification?.documentFileName === 'maya_national_id.pdf' &&
        dbLearner?.identityVerification?.documentUrl?.startsWith('data:application/pdf')
      ),
      `Type: ${dbLearner?.identityVerification?.documentType}, File: ${dbLearner?.identityVerification?.documentFileName}`
    );

    // Verify Certificate in Atlas
    const dbLearnerCerts = await Certificate.find({ userId: dbLearner?._id });
    assertTest(
      'Learner certificate saved to Certificate collection linked to learner _id',
      dbLearnerCerts.length === 1 &&
      dbLearnerCerts[0].title === 'Introductory Data Science Credential' &&
      dbLearnerCerts[0].issuingOrganization === 'Stanford Online Coursework',
      `Found ${dbLearnerCerts.length} cert: "${dbLearnerCerts[0]?.title}"`
    );

    // =========================================================================
    // TEST 4: JWT Authentication for Learner
    // =========================================================================
    console.log('\n--- TEST 4: JWT Authentication Verification (Learner) ---');
    const learnerMeRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const learnerMeData: any = await learnerMeRes.json();
    assertTest(
      'GET /api/auth/me authenticates learner with JWT',
      learnerMeRes.status === 200 && learnerMeData?.data?.email === testLearnerEmail,
      `Status: ${learnerMeRes.status}, User Name: ${learnerMeData?.data?.name}`
    );

    // =========================================================================
    // TEST 5: Register a new Teacher
    // =========================================================================
    console.log('\n--- TEST 5: Register New Teacher ---');
    const teacherPayload = {
      name: 'Prof. David Rodriguez',
      email: testTeacherEmail,
      phoneNumber: '+1 5557762019',
      countryCode: '+1',
      dateOfBirth: '1985-09-20',
      role: 'teacher',
      password: 'TeacherPassWord2026!',
      headline: 'Distinguished Cloud & Distributed Systems Architect',
      bio: 'Over 15 years experience architecting cloud systems and mentoring engineers.',
      avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      identityDocument: {
        type: 'National ID (NID)',
        documentNumber: `NID-T-${timestamp}`,
        fileName: 'david_nid_card.pdf',
        fileSize: 450000,
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
      },
      certificates: [
        {
          title: 'AWS Certified Solutions Architect - Professional',
          issuingOrganization: 'Amazon Web Services',
          fileName: 'aws_solutions_architect.pdf',
          fileSize: 345000,
          fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
        },
        {
          title: 'Certified Kubernetes Administrator (CKA)',
          issuingOrganization: 'Cloud Native Computing Foundation (CNCF)',
          fileName: 'cka_certification.pdf',
          fileSize: 280000,
          fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
        },
      ],
    };

    const regTeacherRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherPayload),
    });
    const regTeacherData: any = await regTeacherRes.json();
    teacherToken = regTeacherData?.data?.token || '';
    teacherUserId = regTeacherData?.data?.user?._id || '';

    assertTest(
      'POST /api/auth/register creates teacher successfully with 2 certificates',
      regTeacherRes.status === 201 && regTeacherData.success === true && !!teacherToken,
      `Status: ${regTeacherRes.status}, UserID: ${teacherUserId}, Certs created: ${regTeacherData.data?.certificates?.length}`
    );

    // =========================================================================
    // TEST 6: Direct MongoDB Atlas Verification for Teacher
    // =========================================================================
    console.log('\n--- TEST 6: Direct MongoDB Atlas Verification for Teacher ---');
    const dbTeacher = await User.findOne({ email: testTeacherEmail }).select('+password');
    assertTest(
      'Teacher document exists in Atlas skill_exchange.users collection',
      Boolean(dbTeacher && dbTeacher._id.toString() === teacherUserId),
      `Found email: ${dbTeacher?.email}`
    );

    assertTest(
      'Teacher role is saved as "teacher"',
      dbTeacher?.role === 'teacher',
      `Role: ${dbTeacher?.role}`
    );

    assertTest(
      'Teacher password is cryptographically hashed with bcrypt',
      Boolean(
        dbTeacher?.password &&
        dbTeacher.password.startsWith('$2') &&
        dbTeacher.password !== 'TeacherPassWord2026!'
      ),
      `Hash prefix: ${dbTeacher?.password?.substring(0, 10)}...`
    );

    assertTest(
      'Teacher avatarUrl is persisted in Atlas',
      Boolean(dbTeacher?.avatarUrl && dbTeacher.avatarUrl.startsWith('data:image/png')),
      `AvatarUrl length: ${dbTeacher?.avatarUrl?.length}`
    );

    const dbTeacherCerts = await Certificate.find({ userId: dbTeacher?._id });
    assertTest(
      'Both teacher certificates saved to Certificate collection linked to teacher _id',
      dbTeacherCerts.length === 2,
      `Found ${dbTeacherCerts.length} certificates in DB: ${dbTeacherCerts.map((c) => c.title).join(', ')}`
    );

    // =========================================================================
    // TEST 7: JWT Authentication for Teacher
    // =========================================================================
    console.log('\n--- TEST 7: JWT Authentication Verification (Teacher) ---');
    const teacherMeRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const teacherMeData: any = await teacherMeRes.json();
    assertTest(
      'GET /api/auth/me authenticates teacher with JWT',
      teacherMeRes.status === 200 && teacherMeData?.data?.email === testTeacherEmail,
      `Status: ${teacherMeRes.status}, Name: ${teacherMeData?.data?.name}`
    );

    // =========================================================================
    // TEST 8: Minor User Registration with Birth Certificate (Under 18)
    // =========================================================================
    console.log('\n--- TEST 8: Minor User with Birth Certificate ---');
    const minorPayload = {
      name: 'Samir Chen',
      email: testMinorEmail,
      phoneNumber: '+1 5556639918',
      countryCode: '+1',
      dateOfBirth: '2011-03-25', // Age 15
      role: 'learner',
      password: 'MinorLearnerPass99!',
      identityDocument: {
        type: 'Birth Certificate',
        documentNumber: `BC-${timestamp}`,
        fileName: 'samir_birth_certificate.pdf',
        fileSize: 180000,
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...',
      },
    };

    const regMinorRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(minorPayload),
    });
    const regMinorData: any = await regMinorRes.json();
    minorUserId = regMinorData?.data?.user?._id || '';

    const dbMinor = await User.findOne({ email: testMinorEmail });
    assertTest(
      'Minor user documentType is correctly preserved as "Birth Certificate" in Atlas',
      Boolean(
        regMinorRes.status === 201 &&
        dbMinor?.identityVerification?.documentType === 'Birth Certificate'
      ),
      `Saved documentType in DB: "${dbMinor?.identityVerification?.documentType}" (Age: ${dbMinor?.age})`
    );

    // =========================================================================
    // TEST 9: Duplicate Email Detection & Error Handling
    // =========================================================================
    console.log('\n--- TEST 9: Duplicate Email Detection & Error Handling ---');
    // 9a: Check email API reports unavailable
    const checkDupRes = await fetch(`${baseUrl}/check-email?email=${encodeURIComponent(testLearnerEmail)}`);
    const checkDupData: any = await checkDupRes.json();
    assertTest(
      'GET /api/auth/check-email reports available=false for registered email',
      checkDupRes.status === 200 && checkDupData.available === false,
      `Available: ${checkDupData.available}, Message: "${checkDupData.message}"`
    );

    // 9b: Duplicate registration returns 409 Conflict with exact error message
    const dupRegRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Imposter',
        email: testLearnerEmail,
        password: 'Password123!',
        role: 'learner',
      }),
    });
    const dupRegData: any = await dupRegRes.json();
    assertTest(
      'POST /api/auth/register rejects duplicate email with 409 Conflict',
      dupRegRes.status === 409 && dupRegData.success === false,
      `Status: ${dupRegRes.status}, Message: "${dupRegData.message}"`
    );

    // =========================================================================
    // TEST 10: Duplicate Phone Number Detection
    // =========================================================================
    console.log('\n--- TEST 10: Duplicate Phone Number Rejection ---');
    const dupPhoneRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phone Imposter',
        email: `unique_imposter_${timestamp}@skillexchange.io`,
        phoneNumber: '+1 5550198273', // Matches Maya Patel's phone
        password: 'Password123!',
        role: 'learner',
      }),
    });
    const dupPhoneData: any = await dupPhoneRes.json();
    assertTest(
      'POST /api/auth/register rejects duplicate phone number with 409 Conflict',
      dupPhoneRes.status === 409 && dupPhoneData.success === false,
      `Status: ${dupPhoneRes.status}, Message: "${dupPhoneData.message}"`
    );

    // =========================================================================
    // TEST 11: Validation Error Handling (Bad Email & Short Password)
    // =========================================================================
    console.log('\n--- TEST 11: Input Validation Error Rejection ---');
    const badInputRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'X',
        email: 'invalid-email',
        password: '12',
      }),
    });
    const badInputData: any = await badInputRes.json();
    assertTest(
      'POST /api/auth/register rejects invalid inputs with 400 Bad Request',
      badInputRes.status === 400 && badInputData.success === false,
      `Status: ${badInputRes.status}, Message: "${badInputData.message}"`
    );
  } finally {
    // =========================================================================
    // CLEANUP: Purge test records from Atlas
    // =========================================================================
    console.log('\n--- Cleaning up temporary test records from MongoDB Atlas ---');
    try {
      const idsToClean = [learnerUserId, teacherUserId, minorUserId].filter(Boolean);
      if (idsToClean.length > 0) {
        await Certificate.deleteMany({ userId: { $in: idsToClean } });
        await User.deleteMany({ _id: { $in: idsToClean } });
      }
      console.log('✅ Temporary test users and certificates safely removed from Atlas.');
    } catch (cleanupErr: any) {
      console.warn('Cleanup error:', cleanupErr.message);
    }

    server.close();
    await mongoose.disconnect();
    console.log('Database connection closed cleanly.\n');
  }

  // Final Summary
  console.log('================================================================');
  console.log('REGISTRATION INTEGRATION TEST SUMMARY');
  console.log('================================================================');
  const passed = assertions.filter((a) => a.passed).length;
  const failed = assertions.filter((a) => !a.passed).length;
  console.log(`Total Assertions: ${assertions.length}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);

  if (failed > 0) {
    console.error('\n❌ FAILURES OCCURRED:');
    assertions
      .filter((a) => !a.passed)
      .forEach((a) => console.error(`  - ${a.name}: ${a.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL REGISTRATION INTEGRATION & DATABASE TESTS PASSED!');
    process.exit(0);
  }
};

runVerification().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
