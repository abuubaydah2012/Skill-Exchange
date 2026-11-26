import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { Skill } from '../models/Skill.js';
import { Certificate } from '../models/Certificate.js';
import { Appointment } from '../models/Appointment.js';
import { Notification } from '../models/Notification.js';
import { Review } from '../models/Review.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await connectDB();

    console.log('[Seed] Clearing existing demo data...');
    await Promise.all([
      User.deleteMany({}),
      Skill.deleteMany({}),
      Certificate.deleteMany({}),
      Appointment.deleteMany({}),
      Notification.deleteMany({}),
      Review.deleteMany({}),
    ]);

    console.log('[Seed] Inserting users...');
    // Demo users (Passwords will be automatically hashed by pre-save hook)
    const learner = await User.create({
      name: 'Elena Rostova',
      email: 'learner@skillexchange.io',
      password: 'password123',
      role: 'learner',
      avatarBgColor: '#0284c7',
      headline: 'Junior Product Designer & Language Enthusiast',
      bio: 'Passionate UX apprentice eager to level up my front-end React skills. In exchange, I teach conversational Russian and wireframing.',
      location: 'Berlin, Germany',
      languages: ['English', 'Russian', 'German'],
      learningInterests: ['React & TypeScript', 'Node.js Backend', 'Acoustic Guitar'],
      phoneNumber: '+49 152 984102',
      isProfileVerified: true,
      accountVerificationStatus: 'Verified',
      rating: 4.9,
      reviewCount: 14,
    });

    const teacher = await User.create({
      name: 'Marcus Vance',
      email: 'teacher@skillexchange.io',
      password: 'password123',
      role: 'teacher',
      avatarBgColor: '#059669',
      headline: 'Senior Full-Stack Architect & Engineering Mentor',
      bio: '10+ years architecting web applications with React, TypeScript, and distributed Node systems.',
      location: 'Austin, TX, USA',
      languages: ['English', 'Spanish'],
      learningInterests: ['Conversational Russian', 'Jazz Guitar'],
      phoneNumber: '+1 512 809 3421',
      isProfileVerified: true,
      accountVerificationStatus: 'Verified',
      rating: 4.95,
      reviewCount: 38,
      totalEarnings: 4250,
    });

    const admin = await User.create({
      name: 'Sarah Jenkins',
      email: 'admin@skillexchange.io',
      password: 'password123',
      role: 'admin',
      avatarBgColor: '#7c3aed',
      headline: 'Platform Moderator & Community Quality Lead',
      bio: 'Overseeing member verifications, dispute resolutions, and trust & safety.',
      location: 'London, UK',
      languages: ['English', 'French'],
      isProfileVerified: true,
      accountVerificationStatus: 'Verified',
    });

    console.log('[Seed] Inserting skills...');
    const skillReact = await Skill.create({
      userId: teacher._id,
      name: 'React & TypeScript Architecture',
      category: 'Development',
      description: 'Component architecture, custom hooks, state machines, and type safety.',
      proficiency: 'Expert',
      skillType: 'Teaching',
      yearsExperience: 9,
      freeSwapAvailable: true,
      paidLessonAvailable: true,
      hourlyPrice: 65,
      availabilitySchedule: 'Mon-Thu 17:00 - 21:00 CST',
      verificationStatus: 'Verified',
    });

    const skillRussian = await Skill.create({
      userId: learner._id,
      name: 'Conversational Russian',
      category: 'Languages',
      description: 'Immersive speaking practice, colloquial idioms, and pronunciation drills.',
      proficiency: 'Expert',
      skillType: 'Teaching',
      yearsExperience: 8,
      freeSwapAvailable: true,
      paidLessonAvailable: true,
      hourlyPrice: 28,
      availabilitySchedule: 'Mon/Wed/Fri 18:00 - 21:00 CET',
      verificationStatus: 'Verified',
    });

    console.log('[Seed] Inserting certificates...');
    await Certificate.create({
      userId: learner._id,
      title: 'Certified UX Practitioner (UXP)',
      issuingOrganization: 'Nielsen Norman Group Partner',
      issueDate: '2025-06-14',
      relatedSkill: 'Figma UI Wireframing',
      fileName: 'nng_ux_practitioner_elena.pdf',
      status: 'Verified',
    });

    console.log('[Seed] Inserting appointment...');
    const appointment = await Appointment.create({
      learnerId: learner._id,
      teacherId: teacher._id,
      skillId: skillReact._id,
      skillName: skillReact.name,
      requestedDate: '2026-11-28',
      startTime: '18:00',
      durationMinutes: 60,
      isFreeSwap: true,
      offeredSwapSkillName: 'Conversational Russian',
      totalCost: 0,
      message: 'Looking forward to building strong TypeScript architectures together!',
      status: 'Accepted',
      meetingId: 'meet-seed-101',
    });

    console.log('[Seed] Inserting notification & review...');
    await Notification.create({
      userId: learner._id,
      title: 'Appointment Confirmed',
      message: `Marcus Vance accepted your appointment for ${skillReact.name} on 2026-11-28.`,
      category: 'Appointments',
      relatedAppointmentId: appointment._id,
      isRead: false,
    });

    await Review.create({
      reviewerId: learner._id,
      reviewedUserId: teacher._id,
      appointmentId: appointment._id,
      skillName: skillReact.name,
      rating: 5,
      comment: 'Exceptional instructor! Marcus explained advanced TypeScript generics with real-world architectural clarity.',
    });

    console.log('=====================================================');
    console.log('✅ Demo database seeded successfully!');
    console.log(`- Created Learner: ${learner.email} (password: password123)`);
    console.log(`- Created Teacher: ${teacher.email} (password: password123)`);
    console.log(`- Created Admin:   ${admin.email} (password: password123)`);
    console.log(`- Created Skills:  ${skillReact.name}, ${skillRussian.name}`);
    console.log('=====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedData();
