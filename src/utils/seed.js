// /**
//  * Seed script: populates the database with a realistic sample dataset
//  * (admin, lawyers, clients, cases, a session, a legal deadline, a
//  * consultation) so the API can be explored immediately after setup
//  * without manually creating every record by hand.
//  *
//  * Usage: npm run seed
//  */
// require('dotenv').config();
// const mongoose = require('mongoose');
// const connectDB = require('../config/db');
// const logger = require('./logger');

// const { User } = require('../models/User');
// const Lawyer = require('../models/Lawyer');
// const Client = require('../models/Client');
// const { Case } = require('../models/Case');
// const Session = require('../models/Session');
// const { LegalDeadline } = require('../models/LegalDeadline');
// const { Consultation } = require('../models/Consultation');

// const seed = async () => {
//   await connectDB();

//   logger.info('Clearing existing data...');
//   await Promise.all([
//     User.deleteMany({}),
//     Lawyer.deleteMany({}),
//     Client.deleteMany({}),
//     Case.deleteMany({}),
//     Session.deleteMany({}),
//     LegalDeadline.deleteMany({}),
//     Consultation.deleteMany({}),
//   ]);

//   logger.info('Creating users...');
//   const admin = await User.create({
//     firstName: 'Sarah',
//     lastName: 'Admin',
//     email: 'admin@lawfirm.com',
//     password: 'Admin@12345',
//     role: 'super_admin',
//   });

//   const lawyerUser1 = await User.create({
//     firstName: 'Ahmed',
//     lastName: 'Hassan',
//     email: 'ahmed.hassan@lawfirm.com',
//     password: 'Lawyer@12345',
//     role: 'senior_lawyer',
//   });

//   const lawyerUser2 = await User.create({
//     firstName: 'Mona',
//     lastName: 'Tarek',
//     email: 'mona.tarek@lawfirm.com',
//     password: 'Lawyer@12345',
//     role: 'lawyer',
//   });

//   const clientUser = await User.create({
//     firstName: 'Khaled',
//     lastName: 'Ibrahim',
//     email: 'khaled.ibrahim@client.com',
//     password: 'Client@12345',
//     role: 'client',
//   });

//   logger.info('Creating lawyer profiles...');
//   const lawyer1 = await Lawyer.create({
//     user: lawyerUser1._id,
//     barNumber: 'BAR-001234',
//     specialties: ['Commercial Law', 'Corporate Law'],
//     yearsOfExperience: 12,
//     hourlyRate: 150,
//     performance: {
//       casesClosed: 143,
//       casesWon: 124,
//       casesLost: 19,
//       activeCases: 8,
//       averageResolutionDays: 45,
//       revenueGenerated: 250000,
//       attendanceRate: 96,
//       lastCalculatedAt: new Date(),
//     },
//   });

//   const lawyer2 = await Lawyer.create({
//     user: lawyerUser2._id,
//     barNumber: 'BAR-005678',
//     specialties: ['Family Law', 'Labor Law'],
//     yearsOfExperience: 5,
//     hourlyRate: 90,
//   });

//   logger.info('Creating client...');
//   const client = await Client.create({
//     user: clientUser._id,
//     type: 'individual',
//     fullName: 'Khaled Ibrahim',
//     email: 'khaled.ibrahim@client.com',
//     phone: '+20-100-000-0000',
//     assignedLawyer: lawyer1._id,
//   });

//   logger.info('Creating sample case...');
//   const sampleCase = await Case.create({
//     caseNumber: 'CASE-2026-000001',
//     title: 'Commercial Contract Dispute - ABC Trading Co.',
//     description: 'Breach of contract dispute regarding a commercial supply agreement.',
//     caseType: 'Commercial',
//     status: 'court_session',
//     client: client._id,
//     leadLawyer: lawyer1._id,
//     assignedLawyers: [lawyer1._id, lawyer2._id],
//     court: 'Cairo Economic Court',
//     opposingParty: 'ABC Trading Co.',
//     estimatedValue: 75000,
//     timeline: [
//       { type: 'CASE_CREATED', description: 'Case created and assigned.', performedBy: admin._id },
//       { type: 'STATUS_CHANGE', description: "Status changed from 'draft' to 'under_review'.", performedBy: admin._id },
//       { type: 'STATUS_CHANGE', description: "Status changed from 'under_review' to 'active'.", performedBy: admin._id },
//       { type: 'STATUS_CHANGE', description: "Status changed from 'active' to 'court_session'.", performedBy: admin._id },
//     ],
//   });

//   logger.info('Creating sample Arabic case...');
//   const arabicCase = await Case.create({
//     caseNumber: 'CASE-2026-000002',
//     title: 'النزاع التجاري حول عقد توريد البضائع',
//     description: 'نزاع ناتج عن إخلال الطرف الثاني بشروط عقد التوريد التجاري الموقع بين الطرفين.',
//     caseType: 'تجاري',
//     status: 'judgment_issued',
//     client: client._id,
//     leadLawyer: lawyer1._id,
//     assignedLawyers: [lawyer1._id],
//     court: 'محكمة القاهرة الاقتصادية',
//     opposingParty: 'شركة النور للتوريدات',
//     estimatedValue: 120000,
//     outcome: {
//       result: 'won',
//       judgmentSummary: 'حكمت المحكمة لصالح العميل بإلزام الطرف الثاني بالتعويض.',
//       judgmentDate: new Date(),
//     },
//     timeline: [
//       { type: 'CASE_CREATED', description: 'تم إنشاء القضية وتعيين المحامي المسؤول.', performedBy: admin._id },
//       { type: 'STATUS_CHANGE', description: "تم تغيير الحالة من 'judgment_issued'.", performedBy: admin._id },
//     ],
//   });

//   logger.info('Creating sample session...');
//   const startTime = new Date();
//   startTime.setDate(startTime.getDate() + 7);
//   startTime.setHours(10, 0, 0, 0);
//   const endTime = new Date(startTime);
//   endTime.setHours(11, 30, 0, 0);

//   await Session.create({
//     case: sampleCase._id,
//     type: 'court_hearing',
//     title: 'First Hearing - Commercial Contract Dispute',
//     location: 'Cairo Economic Court, Room 4',
//     startTime,
//     endTime,
//     lawyer: lawyer1._id,
//     attendees: [{ user: clientUser._id, role: 'client', attended: null }],
//   });

//   logger.info('Creating sample legal deadline (appeal window)...');
//   // The Arabic case just had judgment issued in favor of the client —
//   // the OPPOSING PARTY now has a limited window to appeal, which the
//   // firm needs to track in case an appeal is actually filed and the
//   // firm needs to respond to it in time.
//   const appealDeadlineDate = new Date();
//   appealDeadlineDate.setDate(appealDeadlineDate.getDate() + 14);

//   const sampleDeadline = await LegalDeadline.create({
//     case: arabicCase._id,
//     type: 'appeal',
//     title: 'متابعة ميعاد استئناف الطرف الآخر على الحكم',
//     description: 'يجب التأكد من عدم تقديم استئناف من الطرف الآخر خلال الميعاد القانوني، أو الاستعداد للرد عليه إذا قُدّم.',
//     dueDate: appealDeadlineDate,
//     reminderLeadDays: [7, 3, 1],
//     responsibleLawyer: lawyer1._id,
//     relatedJudgment: {
//       court: 'محكمة القاهرة الاقتصادية',
//       decisionDate: new Date(),
//       summary: 'حكم لصالح العميل بالتعويض عن الإخلال بعقد التوريد.',
//     },
//   });

//   logger.info('Creating sample consultation request...');
//   await Consultation.create({
//     client: client._id,
//     requestedBy: clientUser._id,
//     subject: 'استشارة بخصوص عقد إيجار تجاري جديد',
//     category: 'Real Estate',
//     description: 'أرغب في استشارة قانونية حول بنود عقد إيجار محل تجاري قبل التوقيع عليه.',
//     preferredLawyer: lawyer2._id,
//     messages: [
//       {
//         sender: clientUser._id,
//         senderRole: 'client',
//         text: 'أرغب في استشارة قانونية حول بنود عقد إيجار محل تجاري قبل التوقيع عليه.',
//       },
//     ],
//   });

//   logger.info('✅ Seed completed successfully!');
//   logger.info(`Sample English case: ${sampleCase.caseNumber}`);
//   logger.info(`Sample Arabic case: ${arabicCase.caseNumber}`);
//   logger.info(`Sample legal deadline id: ${sampleDeadline._id}`);
//   logger.info('--- Sample credentials ---');
//   logger.info('Super Admin: admin@lawfirm.com / Admin@12345');
//   logger.info('Senior Lawyer: ahmed.hassan@lawfirm.com / Lawyer@12345');
//   logger.info('Lawyer: mona.tarek@lawfirm.com / Lawyer@12345');
//   logger.info('Client: khaled.ibrahim@client.com / Client@12345');

//   await mongoose.connection.close();
//   process.exit(0);
// };

// seed().catch(async (err) => {
//   logger.error(`Seed failed: ${err.message}`);
//   await mongoose.connection.close();
//   process.exit(1);
// });
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { User } = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Client = require('../models/Client');
const { Case } = require('../models/Case');
const { Consultation } = require('../models/Consultation');
const Document = require('../models/Document');
const Session = require('../models/Session');
const Task = require('../models/Task');
const { LegalDeadline } = require('../models/LegalDeadline');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const CLEAR_BEFORE_SEED = true;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ اتصل بقاعدة البيانات:', MONGODB_URI);
}

async function clearCollections() {
  if (!CLEAR_BEFORE_SEED) return;
  await Promise.all([
    User.deleteMany({}),
    Lawyer.deleteMany({}),
    Client.deleteMany({}),
    Case.deleteMany({}),
    Consultation.deleteMany({}),
    Document.deleteMany({}),
    Session.deleteMany({}),
    Task.deleteMany({}),
    LegalDeadline.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('🧹 تم تنظيف الكوليكشنز القديمة');
}

// ---------------------------------------------------------------------------
// 1) المستخدمين (Users) — هيتولّد منهم بعدين المحامين والعملاء
// ---------------------------------------------------------------------------
async function seedUsers() {
  const usersData = [
    // --- الإدارة والمحامين ---
    {
      firstName: 'محسن',
      lastName: 'عبدالله',
      email: 'mohsen.abdullah@maktab-legal.com',
      phone: '01012345678',
      password: 'Password123',
      role: 'branch_manager', // المحامي المدير
      isActive: true,
    },
    {
      firstName: 'أحمد',
      lastName: 'السيد',
      email: 'ahmed.elsayed@maktab-legal.com',
      phone: '01023456789',
      password: 'Password123',
      role: 'senior_lawyer',
      isActive: true,
    },
    {
      firstName: 'منى',
      lastName: 'فاروق',
      email: 'mona.farouk@maktab-legal.com',
      phone: '01034567890',
      password: 'Password123',
      role: 'senior_lawyer',
      isActive: true,
    },
    {
      firstName: 'كريم',
      lastName: 'حسني',
      email: 'karim.hosny@maktab-legal.com',
      phone: '01045678901',
      password: 'Password123',
      role: 'lawyer',
      isActive: true,
    },
    {
      firstName: 'ياسمين',
      lastName: 'جمال',
      email: 'yasmin.gamal@maktab-legal.com',
      phone: '01056789012',
      password: 'Password123',
      role: 'lawyer',
      isActive: true,
    },
    {
      firstName: 'عمرو',
      lastName: 'شعبان',
      email: 'amr.shaban@maktab-legal.com',
      phone: '01067890123',
      password: 'Password123',
      role: 'lawyer',
      isActive: true,
    },
    // --- السكرتارية ---
    {
      firstName: 'هبة',
      lastName: 'مصطفى',
      email: ' @maktab-legal.com',
      phone: '01078901234',
      password: 'Password123',
      role: 'secretary',
      isActive: true,
    },
    // --- العملاء (حسابات بورتال) ---
    {
      firstName: 'محمود',
      lastName: 'عزت',
      email: 'mahmoud.ezzat@gmail.com',
      phone: '01089012345',
      password: 'Password123',
      role: 'client',
      isActive: true,
    },
    {
      firstName: 'نادية',
      lastName: 'الشريف',
      email: 'nadia.elsherif@gmail.com',
      phone: '01090123456',
      password: 'Password123',
      role: 'client',
      isActive: true,
    },
    {
      firstName: 'طارق',
      lastName: 'منصور',
      email: 'tarek.mansour@gmail.com',
      phone: '01101234567',
      password: 'Password123',
      role: 'client',
      isActive: true,
    },
  ];

  // ملاحظة: بنستخدم create واحدة واحدة (مش insertMany) عشان pre('save')
  // بتاع هاش الباسورد يعمل trigger صحيح؛ insertMany بيتجاوز الـ hooks.
  const created = [];
  for (const data of usersData) {
    const user = await User.create(data);
    created.push(user);
  }
  console.log(`👤 تم إنشاء ${created.length} مستخدم`);
  return created;
}

// ---------------------------------------------------------------------------
// 2) المحامين (Lawyers) — مرتبطين بحسابات User اللي فيها role محامي
// ---------------------------------------------------------------------------
async function seedLawyers(users) {
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const lawyersData = [
    {
      user: byEmail['mohsen.abdullah@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0001',
      specialties: ['القانون التجاري', 'قانون الشركات', 'الاستثمار'],
      yearsOfExperience: 22,
      hourlyRate: 1500,
      bio: 'محامي مدير المكتب، متخصص في القانون التجاري وقانون الشركات مع خبرة تتجاوز 20 عامًا في التقاضي والاستشارات للشركات الكبرى.',
      performance: {
        casesClosed: 145,
        casesWon: 112,
        casesLost: 18,
        activeCases: 9,
        averageResolutionDays: 95,
        revenueGenerated: 4500000,
        attendanceRate: 98,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
    {
      user: byEmail['ahmed.elsayed@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0002',
      specialties: ['القانون الجنائي', 'قانون العمل'],
      yearsOfExperience: 15,
      hourlyRate: 1000,
      bio: 'محامي أول متخصص في القضايا الجنائية ومنازعات العمل، له سجل قوي في المرافعات أمام محاكم الجنايات.',
      performance: {
        casesClosed: 98,
        casesWon: 70,
        casesLost: 15,
        activeCases: 6,
        averageResolutionDays: 120,
        revenueGenerated: 1800000,
        attendanceRate: 95,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
    {
      user: byEmail['mona.farouk@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0003',
      specialties: ['الأحوال الشخصية', 'قانون الأسرة'],
      yearsOfExperience: 13,
      hourlyRate: 900,
      bio: 'محامية أولى متخصصة في قضايا الأحوال الشخصية والأسرة، تتولى ملفات الطلاق والنفقة والحضانة.',
      performance: {
        casesClosed: 87,
        casesWon: 65,
        casesLost: 10,
        activeCases: 7,
        averageResolutionDays: 110,
        revenueGenerated: 1200000,
        attendanceRate: 97,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
    {
      user: byEmail['karim.hosny@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0004',
      specialties: ['العقارات', 'القانون التجاري'],
      yearsOfExperience: 6,
      hourlyRate: 600,
      bio: 'محامي متخصص في قضايا العقارات والمنازعات التجارية الصغيرة والمتوسطة.',
      performance: {
        casesClosed: 32,
        casesWon: 22,
        casesLost: 6,
        activeCases: 5,
        averageResolutionDays: 80,
        revenueGenerated: 450000,
        attendanceRate: 92,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
    {
      user: byEmail['yasmin.gamal@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0005',
      specialties: ['قانون العمل', 'الأحوال الشخصية'],
      yearsOfExperience: 4,
      hourlyRate: 500,
      bio: 'محامية متخصصة في منازعات العمل وقضايا الأحوال الشخصية، بدأت مسيرتها المهنية في المكتب.',
      performance: {
        casesClosed: 18,
        casesWon: 13,
        casesLost: 3,
        activeCases: 4,
        averageResolutionDays: 70,
        revenueGenerated: 220000,
        attendanceRate: 94,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
    {
      user: byEmail['amr.shaban@maktab-legal.com']._id,
      barNumber: 'BAR-2026-0006',
      specialties: ['القانون الجنائي'],
      yearsOfExperience: 3,
      hourlyRate: 450,
      bio: 'محامي متخصص في القضايا الجنائية، يعمل تحت إشراف المحامي الأول أحمد السيد.',
      performance: {
        casesClosed: 11,
        casesWon: 7,
        casesLost: 3,
        activeCases: 3,
        averageResolutionDays: 65,
        revenueGenerated: 110000,
        attendanceRate: 90,
        lastCalculatedAt: new Date(),
      },
      isAvailable: true,
    },
  ];

  const created = await Lawyer.insertMany(lawyersData);
  console.log(`⚖️  تم إنشاء ${created.length} محامي`);
  return created;
}

// ---------------------------------------------------------------------------
// 3) العملاء (Clients)
// ---------------------------------------------------------------------------
async function seedClients(users, lawyers) {
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const lawyerByBar = Object.fromEntries(lawyers.map((l) => [l.barNumber, l]));

  const clientsData = [
    {
      user: byEmail['mahmoud.ezzat@gmail.com']._id,
      type: 'individual',
      fullName: 'محمود عزت إبراهيم',
      email: 'mahmoud.ezzat@gmail.com',
      phone: '01089012345',
      nationalId: '29005121234567',
      address: '15 شارع التحرير، الدقي، الجيزة',
      assignedLawyer: lawyerByBar['BAR-2026-0001']._id,
      notes: 'عميل دائم، يدير شركة استيراد وتصدير.',
      isActive: true,
    },
    {
      user: byEmail['nadia.elsherif@gmail.com']._id,
      type: 'individual',
      fullName: 'نادية الشريف محمد',
      email: 'nadia.elsherif@gmail.com',
      phone: '01090123456',
      nationalId: '29103098765432',
      address: '7 شارع الهرم، الجيزة',
      assignedLawyer: lawyerByBar['BAR-2026-0003']._id,
      notes: 'قضية أحوال شخصية - نفقة وحضانة.',
      isActive: true,
    },
    {
      user: byEmail['tarek.mansour@gmail.com']._id,
      type: 'individual',
      fullName: 'طارق منصور كامل',
      email: 'tarek.mansour@gmail.com',
      phone: '01101234567',
      nationalId: '28811076543210',
      address: '22 شارع فيصل، الجيزة',
      assignedLawyer: lawyerByBar['BAR-2026-0002']._id,
      notes: 'نزاع عمالي مع شركة سابقة.',
      isActive: true,
    },
    {
      // عميل شركة، بدون حساب بورتال (تم تسجيله من السكرتارية)
      user: null,
      type: 'company',
      fullName: 'هاني عبدالرازق (ممثل الشركة)',
      companyName: 'شركة النور للمقاولات والاستثمار العقاري',
      email: 'legal@alnoor-construction.com',
      phone: '0223456789',
      address: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
      assignedLawyer: lawyerByBar['BAR-2026-0001']._id,
      notes: 'شركة مقاولات، عدة عقود ومنازعات عقارية.',
      isActive: true,
    },
    {
      user: null,
      type: 'company',
      fullName: 'سلمى وهبة (ممثل الشركة)',
      companyName: 'مجموعة الفجر للصناعات الغذائية',
      email: 'legal@alfagr-foods.com',
      phone: '0234567890',
      address: 'طريق القاهرة الإسكندرية الصحراوي، الجيزة',
      assignedLawyer: lawyerByBar['BAR-2026-0004']._id,
      notes: 'عقود توريد ومنازعات تجارية متفرقة.',
      isActive: true,
    },
  ];

  const created = await Client.insertMany(clientsData);
  console.log(`🧑‍💼 تم إنشاء ${created.length} عميل`);
  return created;
}

// ---------------------------------------------------------------------------
// 4) القضايا (Cases)
// ---------------------------------------------------------------------------
async function seedCases(clients, lawyers, users) {
  const lawyerByBar = Object.fromEntries(lawyers.map((l) => [l.barNumber, l]));
  const clientByName = Object.fromEntries(clients.map((c) => [c.fullName, c]));
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const mohsen = userByEmail['mohsen.abdullah@maktab-legal.com'];

  const casesData = [
    {
      caseNumber: 'CASE-2026-000101',
      title: 'نزاع عقد توريد بين شركة النور للمقاولات ومورّد مواد بناء',
      description:
        'دعوى تجارية بخصوص الإخلال بشروط عقد توريد حديد تسليح، ومطالبة بالتعويض عن التأخير في التسليم.',
      caseType: 'تجاري',
      status: 'active',
      client: clientByName['هاني عبدالرازق (ممثل الشركة)']._id,
      assignedLawyers: [lawyerByBar['BAR-2026-0001']._id, lawyerByBar['BAR-2026-0004']._id],
      leadLawyer: lawyerByBar['BAR-2026-0001']._id,
      court: 'محكمة الجيزة الاقتصادية',
      opposingParty: 'مؤسسة الدلتا لتجارة الحديد والصلب',
      estimatedValue: 850000,
      timeline: [
        {
          type: 'STATUS_CHANGE',
          description: 'تم فتح القضية ونقلها إلى مرحلة المراجعة',
          performedBy: mohsen._id,
          metadata: { from: 'draft', to: 'under_review' },
        },
        {
          type: 'STATUS_CHANGE',
          description: 'تمت الموافقة على القضية وأصبحت نشطة',
          performedBy: mohsen._id,
          metadata: { from: 'under_review', to: 'active' },
        },
      ],
    },
    {
      caseNumber: 'CASE-2026-000102',
      title: 'دعوى نفقة وحضانة - نادية الشريف ضد المطلق',
      description: 'دعوى أحوال شخصية لتحديد النفقة الشهرية وترتيبات الحضانة والرؤية.',
      caseType: 'أحوال شخصية',
      status: 'court_session',
      client: clientByName['نادية الشريف محمد']._id,
      assignedLawyers: [lawyerByBar['BAR-2026-0003']._id],
      leadLawyer: lawyerByBar['BAR-2026-0003']._id,
      court: 'محكمة الأسرة بالجيزة',
      opposingParty: 'محمد فتحي السيد (الزوج السابق)',
      estimatedValue: 0,
      timeline: [
        {
          type: 'STATUS_CHANGE',
          description: 'تحديد أول جلسة أمام محكمة الأسرة',
          performedBy: mohsen._id,
          metadata: { from: 'active', to: 'court_session' },
        },
      ],
    },
    {
      caseNumber: 'CASE-2026-000103',
      title: 'نزاع عمالي - طارق منصور ضد شركة التوظيف السابقة',
      description: 'دعوى عمالية بخصوص فصل تعسفي والمطالبة بالمستحقات المالية المتأخرة.',
      caseType: 'عمل',
      status: 'under_review',
      client: clientByName['طارق منصور كامل']._id,
      assignedLawyers: [lawyerByBar['BAR-2026-0002']._id],
      leadLawyer: lawyerByBar['BAR-2026-0002']._id,
      court: 'محكمة العمل الجزئية بالجيزة',
      opposingParty: 'شركة المستقبل للحلول اللوجستية',
      estimatedValue: 120000,
      timeline: [
        {
          type: 'STATUS_CHANGE',
          description: 'تم استلام مستندات العميل وبدء المراجعة القانونية',
          performedBy: mohsen._id,
          metadata: { from: 'draft', to: 'under_review' },
        },
      ],
    },
    {
      caseNumber: 'CASE-2026-000104',
      title: 'منازعة عقارية - مجموعة الفجر للصناعات الغذائية',
      description: 'نزاع حول ملكية قطعة أرض صناعية وصحة عقد البيع المسجل.',
      caseType: 'عقارات',
      status: 'judgment_issued',
      client: clientByName['سلمى وهبة (ممثل الشركة)']._id,
      assignedLawyers: [lawyerByBar['BAR-2026-0004']._id],
      leadLawyer: lawyerByBar['BAR-2026-0004']._id,
      court: 'محكمة استئناف الجيزة',
      opposingParty: 'ورثة المرحوم سيد عبد الحميد',
      outcome: {
        result: 'won',
        judgmentSummary: 'صدر الحكم لصالح الشركة بتثبيت ملكية الأرض موضوع النزاع.',
        judgmentDate: new Date('2026-05-10'),
      },
      estimatedValue: 3200000,
      timeline: [
        {
          type: 'COURT_DECISION',
          description: 'صدور الحكم الابتدائي لصالح العميل',
          performedBy: lawyerByBar['BAR-2026-0004'].user,
          metadata: { result: 'won' },
        },
      ],
    },
    {
      caseNumber: 'CASE-2026-000105',
      title: 'استشارة تأسيس شركة - محمود عزت',
      description: 'مسودة قضية لتأسيس فرع جديد لشركة الاستيراد والتصدير الخاصة بالعميل.',
      caseType: 'تجاري',
      status: 'draft',
      client: clientByName['محمود عزت إبراهيم']._id,
      assignedLawyers: [lawyerByBar['BAR-2026-0001']._id],
      leadLawyer: lawyerByBar['BAR-2026-0001']._id,
      court: '',
      opposingParty: '',
      estimatedValue: 0,
      timeline: [],
    },
  ];

  const created = [];
  for (const data of casesData) {
    const c = await Case.create(data);
    created.push(c);
  }
  console.log(`📁 تم إنشاء ${created.length} قضية`);
  return created;
}

// ---------------------------------------------------------------------------
// 5) الجلسات (Sessions)
// ---------------------------------------------------------------------------
async function seedSessions(cases, lawyers, users) {
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));
  const lawyerByBar = Object.fromEntries(lawyers.map((l) => [l.barNumber, l]));
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const sessionsData = [
    {
      case: caseByNumber['CASE-2026-000102']._id,
      type: 'court_hearing',
      title: 'جلسة نظر دعوى النفقة والحضانة',
      location: 'محكمة الأسرة بالجيزة - الدائرة 5',
      startTime: new Date('2026-07-05T10:00:00+02:00'),
      endTime: new Date('2026-07-05T11:00:00+02:00'),
      lawyer: lawyerByBar['BAR-2026-0003']._id,
      attendees: [
        { user: userByEmail['nadia.elsherif@gmail.com']._id, role: 'client', attended: null },
      ],
      status: 'scheduled',
      notes: 'إحضار صورة من شهادات ميلاد الأبناء.',
    },
    {
      case: caseByNumber['CASE-2026-000101']._id,
      type: 'client_meeting',
      title: 'اجتماع مراجعة مستندات النزاع التجاري',
      location: 'مكتب المحامي محسن عبدالله',
      startTime: new Date('2026-06-30T13:00:00+02:00'),
      endTime: new Date('2026-06-30T14:30:00+02:00'),
      lawyer: lawyerByBar['BAR-2026-0001']._id,
      attendees: [
        { user: userByEmail['mahmoud.ezzat@gmail.com']._id, role: 'client', attended: null },
      ],
      status: 'scheduled',
      notes: 'مراجعة فواتير التوريد ومستندات الشحن.',
    },
    {
      case: caseByNumber['CASE-2026-000103']._id,
      type: 'internal_review',
      title: 'مراجعة داخلية لاستراتيجية الدفاع في الدعوى العمالية',
      location: 'قاعة الاجتماعات الرئيسية',
      startTime: new Date('2026-06-28T11:00:00+02:00'),
      endTime: new Date('2026-06-28T12:00:00+02:00'),
      lawyer: lawyerByBar['BAR-2026-0002']._id,
      attendees: [],
      status: 'completed',
      notes: 'تم الاتفاق على تقديم طلب تسوية ودية أولاً.',
    },
  ];

  const created = [];
  for (const data of sessionsData) {
    const s = await Session.create(data);
    created.push(s);
  }
  console.log(`📅 تم إنشاء ${created.length} جلسة`);
  return created;
}

// ---------------------------------------------------------------------------
// 6) المهام (Tasks)
// ---------------------------------------------------------------------------
async function seedTasks(cases, users) {
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const mohsen = userByEmail['mohsen.abdullah@maktab-legal.com'];
  const ahmed = userByEmail['ahmed.elsayed@maktab-legal.com'];
  const karim = userByEmail['karim.hosny@maktab-legal.com'];
  const heba = userByEmail['heba.mostafa@maktab-legal.com'];

  const tasksData = [
    {
      title: 'تحضير مذكرة دفاع للجلسة القادمة',
      description: 'إعداد مذكرة دفاع شاملة في نزاع عقد التوريد قبل الجلسة المقبلة.',
      case: caseByNumber['CASE-2026-000101']._id,
      assignedTo: karim._id,
      assignedBy: mohsen._id,
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date('2026-07-02T17:00:00+02:00'),
      slaHours: 72,
      comments: [
        { author: mohsen._id, text: 'يرجى التركيز على بند التأخير في التسليم بالعقد.' },
      ],
    },
    {
      title: 'تجميع مستندات الفصل التعسفي',
      description: 'جمع كل المستندات الخاصة بفصل العميل من العمل ومدة خدمته.',
      case: caseByNumber['CASE-2026-000103']._id,
      assignedTo: ahmed._id,
      assignedBy: mohsen._id,
      priority: 'medium',
      status: 'pending',
      dueDate: new Date('2026-07-04T17:00:00+02:00'),
      slaHours: 48,
      comments: [],
    },
    {
      title: 'جدولة موعد توقيع عقد تأسيس الفرع الجديد',
      description: 'التنسيق مع العميل محمود عزت لتحديد موعد توقيع مستندات تأسيس الفرع.',
      case: caseByNumber['CASE-2026-000105']._id,
      assignedTo: heba._id,
      assignedBy: mohsen._id,
      priority: 'low',
      status: 'pending',
      dueDate: new Date('2026-07-10T17:00:00+02:00'),
      slaHours: 96,
      comments: [],
    },
    {
      title: 'إرسال نسخة الحكم للعميل',
      description: 'استلام نسخة رسمية من حكم القضية العقارية وإرسالها للعميل.',
      case: caseByNumber['CASE-2026-000104']._id,
      assignedTo: heba._id,
      assignedBy: mohsen._id,
      priority: 'medium',
      status: 'completed',
      dueDate: new Date('2026-05-20T17:00:00+02:00'),
      completedAt: new Date('2026-05-18T15:30:00+02:00'),
      slaHours: 48,
      comments: [{ author: heba._id, text: 'تم إرسال النسخة بالبريد المسجل وتأكيد الاستلام.' }],
    },
  ];

  const created = await Task.insertMany(tasksData);
  console.log(`✅ تم إنشاء ${created.length} مهمة`);
  return created;
}

// ---------------------------------------------------------------------------
// 7) المستندات (Documents)
// ---------------------------------------------------------------------------
async function seedDocuments(cases, users) {
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const mohsen = userByEmail['mohsen.abdullah@maktab-legal.com'];
  const karim = userByEmail['karim.hosny@maktab-legal.com'];

  const documentsData = [
    {
      title: 'عقد توريد حديد تسليح - مؤسسة الدلتا',
      case: caseByNumber['CASE-2026-000101']._id,
      category: 'contract',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          filePath: '/uploads/cases/CASE-2026-000101/contract-v1.pdf',
          storageProvider: 'local',
          fileSize: 245000,
          uploadedBy: karim._id,
          note: 'النسخة الأصلية من العقد الموقع.',
        },
      ],
      extractedText: 'عقد توريد حديد تسليح بين شركة النور للمقاولات ومؤسسة الدلتا لتجارة الحديد والصلب...',
      uploadedBy: karim._id,
      isSigned: true,
    },
    {
      title: 'صورة طبق الأصل من حكم محكمة الجيزة الاقتصادية',
      case: caseByNumber['CASE-2026-000104']._id,
      category: 'judgment',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          filePath: '/uploads/cases/CASE-2026-000104/judgment-v1.pdf',
          storageProvider: 'local',
          fileSize: 180000,
          uploadedBy: mohsen._id,
          note: 'نسخة رسمية من الحكم الصادر.',
        },
      ],
      extractedText: 'حكمت المحكمة بتثبيت ملكية الأرض الصناعية موضوع النزاع لصالح المدعية...',
      uploadedBy: mohsen._id,
      isSigned: true,
    },
    {
      title: 'مذكرة دفاع أولية - الدعوى العمالية',
      case: caseByNumber['CASE-2026-000103']._id,
      category: 'memo',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          filePath: '/uploads/cases/CASE-2026-000103/memo-v1.docx',
          storageProvider: 'local',
          fileSize: 52000,
          uploadedBy: userByEmail['ahmed.elsayed@maktab-legal.com']._id,
          note: 'مسودة أولى قبل المراجعة.',
        },
      ],
      extractedText: 'تتلخص وقائع الدعوى في أن المدعي كان يعمل لدى الشركة المدعى عليها...',
      uploadedBy: userByEmail['ahmed.elsayed@maktab-legal.com']._id,
      isSigned: false,
    },
  ];

  const created = [];
  for (const data of documentsData) {
    const d = await Document.create(data);
    created.push(d);
  }
  console.log(`📄 تم إنشاء ${created.length} مستند`);
  return created;
}

// ---------------------------------------------------------------------------
// 8) الاستشارات (Consultations)
// ---------------------------------------------------------------------------
async function seedConsultations(clients, lawyers, users) {
  const clientByName = Object.fromEntries(clients.map((c) => [c.fullName, c]));
  const lawyerByBar = Object.fromEntries(lawyers.map((l) => [l.barNumber, l]));
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const consultationsData = [
    {
      client: clientByName['محمود عزت إبراهيم']._id,
      requestedBy: userByEmail['mahmoud.ezzat@gmail.com']._id,
      subject: 'استشارة بخصوص تأسيس فرع جديد للشركة',
      category: 'تجاري',
      description: 'عايز أعرف الإجراءات القانونية اللازمة لتأسيس فرع جديد لشركة الاستيراد والتصدير في الإسكندرية.',
      preferredLawyer: lawyerByBar['BAR-2026-0001']._id,
      assignedLawyer: lawyerByBar['BAR-2026-0001']._id,
      status: 'answered',
      messages: [
        {
          sender: userByEmail['mahmoud.ezzat@gmail.com']._id,
          senderRole: 'client',
          text: 'عايز أعرف الإجراءات القانونية اللازمة لتأسيس فرع جديد.',
        },
        {
          sender: lawyerByBar['BAR-2026-0001'].user,
          senderRole: 'lawyer',
          text: 'سيتم تجهيز قائمة بالمستندات المطلوبة وخطوات التسجيل في السجل التجاري.',
        },
      ],
    },
    {
      client: clientByName['نادية الشريف محمد']._id,
      requestedBy: userByEmail['nadia.elsherif@gmail.com']._id,
      subject: 'استشارة بخصوص رفع نسبة النفقة',
      category: 'أحوال شخصية',
      description: 'هل يمكن التقدم بطلب لزيادة النفقة المقررة سابقًا بسبب ارتفاع الأسعار؟',
      preferredLawyer: lawyerByBar['BAR-2026-0003']._id,
      assignedLawyer: lawyerByBar['BAR-2026-0003']._id,
      status: 'in_progress',
      messages: [
        {
          sender: userByEmail['nadia.elsherif@gmail.com']._id,
          senderRole: 'client',
          text: 'هل يمكن التقدم بطلب زيادة النفقة بسبب الغلاء؟',
        },
      ],
    },
    {
      client: clientByName['طارق منصور كامل']._id,
      requestedBy: userByEmail['heba.mostafa@maktab-legal.com']._id, // طلب تم تسجيله من السكرتارية
      subject: 'استشارة هاتفية - استحقاق مكافأة نهاية الخدمة',
      category: 'عمل',
      description: 'العميل اتصل تليفونيًا بخصوص استحقاقه لمكافأة نهاية الخدمة بعد الفصل.',
      preferredLawyer: null,
      assignedLawyer: lawyerByBar['BAR-2026-0002']._id,
      status: 'pending',
      messages: [],
    },
  ];

  const created = [];
  for (const data of consultationsData) {
    const c = await Consultation.create(data);
    created.push(c);
  }
  console.log(`💬 تم إنشاء ${created.length} استشارة`);
  return created;
}

// ---------------------------------------------------------------------------
// 9) المواعيد القانونية (Legal Deadlines)
// ---------------------------------------------------------------------------
async function seedLegalDeadlines(cases, lawyers) {
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));
  const lawyerByBar = Object.fromEntries(lawyers.map((l) => [l.barNumber, l]));

  const deadlinesData = [
    {
      case: caseByNumber['CASE-2026-000104']._id,
      type: 'appeal',
      title: 'الموعد النهائي للطعن بالاستئناف على الحكم العقاري',
      description: 'يجب تقديم صحيفة الاستئناف قبل انتهاء الميعاد القانوني المحدد بـ40 يومًا من تاريخ صدور الحكم.',
      dueDate: new Date('2026-07-15T23:59:59+02:00'),
      reminderLeadDays: [7, 3, 1],
      remindersSent: [],
      status: 'due_soon',
      responsibleLawyer: lawyerByBar['BAR-2026-0004']._id,
      relatedJudgment: {
        court: 'محكمة الجيزة الابتدائية',
        decisionDate: new Date('2026-05-10'),
        summary: 'صدور الحكم الابتدائي لصالح العميل بتثبيت الملكية.',
      },
    },
    {
      case: caseByNumber['CASE-2026-000101']._id,
      type: 'response_deadline',
      title: 'الرد على مذكرة المدعى عليه',
      description: 'يجب تقديم مذكرة الرد على دفوع مؤسسة الدلتا قبل الجلسة القادمة.',
      dueDate: new Date('2026-07-08T23:59:59+02:00'),
      reminderLeadDays: [5, 2, 1],
      remindersSent: [],
      status: 'pending',
      responsibleLawyer: lawyerByBar['BAR-2026-0001']._id,
    },
    {
      case: caseByNumber['CASE-2026-000103']._id,
      type: 'document_submission',
      title: 'تقديم مستندات مدة الخدمة للمحكمة',
      description: 'تقديم كافة مستندات إثبات مدة خدمة العميل ورواتبه قبل الجلسة المقبلة.',
      dueDate: new Date('2026-07-01T23:59:59+02:00'),
      reminderLeadDays: [3, 1],
      remindersSent: [3],
      status: 'due_soon',
      responsibleLawyer: lawyerByBar['BAR-2026-0002']._id,
    },
  ];

  const created = await LegalDeadline.insertMany(deadlinesData);
  console.log(`⏰ تم إنشاء ${created.length} موعد قانوني`);
  return created;
}

// ---------------------------------------------------------------------------
// 10) الإشعارات (Notifications)
// ---------------------------------------------------------------------------
async function seedNotifications(users, cases, deadlines) {
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));

  const notificationsData = [
    {
      recipient: userByEmail['mohsen.abdullah@maktab-legal.com']._id,
      title: 'موعد استئناف قريب',
      message: 'تبقى أقل من 20 يومًا على الموعد النهائي لتقديم الاستئناف في القضية رقم CASE-2026-000104.',
      type: 'warning',
      channel: 'in_app',
      relatedResource: { resourceType: 'LegalDeadline', resourceId: deadlines[0]._id },
      isRead: false,
    },
    {
      recipient: userByEmail['karim.hosny@maktab-legal.com']._id,
      title: 'مهمة جديدة مكلف بها',
      message: 'تم تكليفك بإعداد مذكرة دفاع لقضية نزاع التوريد التجاري.',
      type: 'info',
      channel: 'in_app',
      relatedResource: { resourceType: 'Case', resourceId: caseByNumber['CASE-2026-000101']._id },
      isRead: true,
      readAt: new Date('2026-06-25T10:00:00+02:00'),
    },
    {
      recipient: userByEmail['nadia.elsherif@gmail.com']._id,
      title: 'تذكير بجلسة محكمة',
      message: 'لديك جلسة بمحكمة الأسرة بالجيزة يوم 5 يوليو 2026 الساعة 10 صباحًا.',
      type: 'info',
      channel: 'email',
      relatedResource: { resourceType: 'Case', resourceId: caseByNumber['CASE-2026-000102']._id },
      isRead: false,
    },
    {
      recipient: userByEmail['ahmed.elsayed@maktab-legal.com']._id,
      title: 'مستند جديد تم رفعه',
      message: 'تم رفع مذكرة دفاع أولية على قضية النزاع العمالي.',
      type: 'success',
      channel: 'in_app',
      relatedResource: { resourceType: 'Case', resourceId: caseByNumber['CASE-2026-000103']._id },
      isRead: false,
    },
  ];

  const created = await Notification.insertMany(notificationsData);
  console.log(`🔔 تم إنشاء ${created.length} إشعار`);
  return created;
}

// ---------------------------------------------------------------------------
// 11) سجل التدقيق (Audit Logs)
// ---------------------------------------------------------------------------
async function seedAuditLogs(users, cases) {
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const caseByNumber = Object.fromEntries(cases.map((c) => [c.caseNumber, c]));

  const logsData = [
    {
      user: userByEmail['mohsen.abdullah@maktab-legal.com']._id,
      action: 'USER_LOGIN',
      resource: 'users',
      resourceId: userByEmail['mohsen.abdullah@maktab-legal.com']._id,
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      statusCode: 200,
      ipAddress: '41.45.12.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { rememberMe: true },
    },
    {
      user: userByEmail['mohsen.abdullah@maktab-legal.com']._id,
      action: 'CASE_CREATED',
      resource: 'cases',
      resourceId: caseByNumber['CASE-2026-000101']._id,
      method: 'POST',
      endpoint: '/api/v1/cases',
      statusCode: 201,
      ipAddress: '41.45.12.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { caseNumber: 'CASE-2026-000101' },
    },
    {
      user: userByEmail['karim.hosny@maktab-legal.com']._id,
      action: 'CASE_UPDATED',
      resource: 'cases',
      resourceId: caseByNumber['CASE-2026-000101']._id,
      method: 'PATCH',
      endpoint: '/api/v1/cases/CASE-2026-000101',
      statusCode: 200,
      ipAddress: '105.198.30.21',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
      metadata: { fieldsChanged: ['assignedLawyers'] },
    },
    {
      user: null, // محاولة تسجيل دخول فاشلة
      action: 'USER_LOGIN_FAILED',
      resource: 'users',
      resourceId: null,
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      statusCode: 401,
      ipAddress: '197.55.10.88',
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      metadata: { reason: 'invalid_credentials', attemptedEmail: 'unknown@example.com' },
    },
  ];

  const created = await AuditLog.insertMany(logsData);
  console.log(`📝 تم إنشاء ${created.length} سجل تدقيق`);
  return created;
}

// ---------------------------------------------------------------------------
// التنفيذ الرئيسي
// ---------------------------------------------------------------------------
async function run() {
  try {
    await connectDB();
    await clearCollections();

    const users = await seedUsers();
    const lawyers = await seedLawyers(users);
    const clients = await seedClients(users, lawyers);
    const cases = await seedCases(clients, lawyers, users);
    await seedSessions(cases, lawyers, users);
    await seedTasks(cases, users);
    await seedDocuments(cases, users);
    await seedConsultations(clients, lawyers, users);
    const deadlines = await seedLegalDeadlines(cases, lawyers);
    await seedNotifications(users, cases, deadlines);
    await seedAuditLogs(users, cases);

    console.log('\n🎉 تم زرع كل البيانات بنجاح!');
  } catch (err) {
    console.error('❌ حصل خطأ أثناء الزرع:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();