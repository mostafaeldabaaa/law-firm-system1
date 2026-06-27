/**
 * Seed script: populates the database with a realistic sample dataset
 * (admin, lawyers, clients, cases, a session, a legal deadline, a
 * consultation) so the API can be explored immediately after setup
 * without manually creating every record by hand.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('./logger');

const { User } = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Client = require('../models/Client');
const { Case } = require('../models/Case');
const Session = require('../models/Session');
const { LegalDeadline } = require('../models/LegalDeadline');
const { Consultation } = require('../models/Consultation');

const seed = async () => {
  await connectDB();

  logger.info('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Lawyer.deleteMany({}),
    Client.deleteMany({}),
    Case.deleteMany({}),
    Session.deleteMany({}),
    LegalDeadline.deleteMany({}),
    Consultation.deleteMany({}),
  ]);

  logger.info('Creating users...');
  const admin = await User.create({
    firstName: 'Sarah',
    lastName: 'Admin',
    email: 'admin@lawfirm.com',
    password: 'Admin@12345',
    role: 'super_admin',
  });

  const lawyerUser1 = await User.create({
    firstName: 'Ahmed',
    lastName: 'Hassan',
    email: 'ahmed.hassan@lawfirm.com',
    password: 'Lawyer@12345',
    role: 'senior_lawyer',
  });

  const lawyerUser2 = await User.create({
    firstName: 'Mona',
    lastName: 'Tarek',
    email: 'mona.tarek@lawfirm.com',
    password: 'Lawyer@12345',
    role: 'lawyer',
  });

  const clientUser = await User.create({
    firstName: 'Khaled',
    lastName: 'Ibrahim',
    email: 'khaled.ibrahim@client.com',
    password: 'Client@12345',
    role: 'client',
  });

  logger.info('Creating lawyer profiles...');
  const lawyer1 = await Lawyer.create({
    user: lawyerUser1._id,
    barNumber: 'BAR-001234',
    specialties: ['Commercial Law', 'Corporate Law'],
    yearsOfExperience: 12,
    hourlyRate: 150,
    performance: {
      casesClosed: 143,
      casesWon: 124,
      casesLost: 19,
      activeCases: 8,
      averageResolutionDays: 45,
      revenueGenerated: 250000,
      attendanceRate: 96,
      lastCalculatedAt: new Date(),
    },
  });

  const lawyer2 = await Lawyer.create({
    user: lawyerUser2._id,
    barNumber: 'BAR-005678',
    specialties: ['Family Law', 'Labor Law'],
    yearsOfExperience: 5,
    hourlyRate: 90,
  });

  logger.info('Creating client...');
  const client = await Client.create({
    user: clientUser._id,
    type: 'individual',
    fullName: 'Khaled Ibrahim',
    email: 'khaled.ibrahim@client.com',
    phone: '+20-100-000-0000',
    assignedLawyer: lawyer1._id,
  });

  logger.info('Creating sample case...');
  const sampleCase = await Case.create({
    caseNumber: 'CASE-2026-000001',
    title: 'Commercial Contract Dispute - ABC Trading Co.',
    description: 'Breach of contract dispute regarding a commercial supply agreement.',
    caseType: 'Commercial',
    status: 'court_session',
    client: client._id,
    leadLawyer: lawyer1._id,
    assignedLawyers: [lawyer1._id, lawyer2._id],
    court: 'Cairo Economic Court',
    opposingParty: 'ABC Trading Co.',
    estimatedValue: 75000,
    timeline: [
      { type: 'CASE_CREATED', description: 'Case created and assigned.', performedBy: admin._id },
      { type: 'STATUS_CHANGE', description: "Status changed from 'draft' to 'under_review'.", performedBy: admin._id },
      { type: 'STATUS_CHANGE', description: "Status changed from 'under_review' to 'active'.", performedBy: admin._id },
      { type: 'STATUS_CHANGE', description: "Status changed from 'active' to 'court_session'.", performedBy: admin._id },
    ],
  });

  logger.info('Creating sample Arabic case...');
  const arabicCase = await Case.create({
    caseNumber: 'CASE-2026-000002',
    title: 'النزاع التجاري حول عقد توريد البضائع',
    description: 'نزاع ناتج عن إخلال الطرف الثاني بشروط عقد التوريد التجاري الموقع بين الطرفين.',
    caseType: 'تجاري',
    status: 'judgment_issued',
    client: client._id,
    leadLawyer: lawyer1._id,
    assignedLawyers: [lawyer1._id],
    court: 'محكمة القاهرة الاقتصادية',
    opposingParty: 'شركة النور للتوريدات',
    estimatedValue: 120000,
    outcome: {
      result: 'won',
      judgmentSummary: 'حكمت المحكمة لصالح العميل بإلزام الطرف الثاني بالتعويض.',
      judgmentDate: new Date(),
    },
    timeline: [
      { type: 'CASE_CREATED', description: 'تم إنشاء القضية وتعيين المحامي المسؤول.', performedBy: admin._id },
      { type: 'STATUS_CHANGE', description: "تم تغيير الحالة من 'judgment_issued'.", performedBy: admin._id },
    ],
  });

  logger.info('Creating sample session...');
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 7);
  startTime.setHours(10, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(11, 30, 0, 0);

  await Session.create({
    case: sampleCase._id,
    type: 'court_hearing',
    title: 'First Hearing - Commercial Contract Dispute',
    location: 'Cairo Economic Court, Room 4',
    startTime,
    endTime,
    lawyer: lawyer1._id,
    attendees: [{ user: clientUser._id, role: 'client', attended: null }],
  });

  logger.info('Creating sample legal deadline (appeal window)...');
  // The Arabic case just had judgment issued in favor of the client —
  // the OPPOSING PARTY now has a limited window to appeal, which the
  // firm needs to track in case an appeal is actually filed and the
  // firm needs to respond to it in time.
  const appealDeadlineDate = new Date();
  appealDeadlineDate.setDate(appealDeadlineDate.getDate() + 14);

  const sampleDeadline = await LegalDeadline.create({
    case: arabicCase._id,
    type: 'appeal',
    title: 'متابعة ميعاد استئناف الطرف الآخر على الحكم',
    description: 'يجب التأكد من عدم تقديم استئناف من الطرف الآخر خلال الميعاد القانوني، أو الاستعداد للرد عليه إذا قُدّم.',
    dueDate: appealDeadlineDate,
    reminderLeadDays: [7, 3, 1],
    responsibleLawyer: lawyer1._id,
    relatedJudgment: {
      court: 'محكمة القاهرة الاقتصادية',
      decisionDate: new Date(),
      summary: 'حكم لصالح العميل بالتعويض عن الإخلال بعقد التوريد.',
    },
  });

  logger.info('Creating sample consultation request...');
  await Consultation.create({
    client: client._id,
    requestedBy: clientUser._id,
    subject: 'استشارة بخصوص عقد إيجار تجاري جديد',
    category: 'Real Estate',
    description: 'أرغب في استشارة قانونية حول بنود عقد إيجار محل تجاري قبل التوقيع عليه.',
    preferredLawyer: lawyer2._id,
    messages: [
      {
        sender: clientUser._id,
        senderRole: 'client',
        text: 'أرغب في استشارة قانونية حول بنود عقد إيجار محل تجاري قبل التوقيع عليه.',
      },
    ],
  });

  logger.info('✅ Seed completed successfully!');
  logger.info(`Sample English case: ${sampleCase.caseNumber}`);
  logger.info(`Sample Arabic case: ${arabicCase.caseNumber}`);
  logger.info(`Sample legal deadline id: ${sampleDeadline._id}`);
  logger.info('--- Sample credentials ---');
  logger.info('Super Admin: admin@lawfirm.com / Admin@12345');
  logger.info('Senior Lawyer: ahmed.hassan@lawfirm.com / Lawyer@12345');
  logger.info('Lawyer: mona.tarek@lawfirm.com / Lawyer@12345');
  logger.info('Client: khaled.ibrahim@client.com / Client@12345');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(async (err) => {
  logger.error(`Seed failed: ${err.message}`);
  await mongoose.connection.close();
  process.exit(1);
});
