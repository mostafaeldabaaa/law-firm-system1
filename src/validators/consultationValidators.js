

// const { body } = require('express-validator');
// const { CONSULTATION_STATUSES } = require('../models/Consultation');

// const createConsultationValidator = [
//   // client اختياري في الـ body: العميل (role: client) بيتحدد تلقائيًا في
//   // الكونترولر من حسابه هو، ومش لازم/مسموحله يبعت client id يدوي.
//   // الموظف/الإدارة لسه لازم يبعتوه لما يسجلوا استشارة نيابة عن عميل.
//   body('client').optional().isMongoId().withMessage('validation.clientIdRequired'),
//   body('subject').trim().notEmpty().withMessage('validation.consultationSubjectRequired'),
//   body('description').trim().notEmpty().withMessage('validation.consultationDescriptionRequired'),
//   body('category').optional().isString(),
//   body('preferredLawyer').optional().isMongoId().withMessage('validation.lawyerIdRequired'),
// ];

// const addMessageValidator = [
//   body('text').trim().notEmpty().withMessage('validation.commentTextRequired'),
// ];

// const assignLawyerValidator = [
//   body('assignedLawyer').isMongoId().withMessage('validation.lawyerIdRequired'),
// ];

// const updateConsultationStatusValidator = [
//   body('status').isIn(CONSULTATION_STATUSES).withMessage('validation.consultationStatusInvalid'),
// ];

// module.exports = {
//   createConsultationValidator,
//   addMessageValidator,
//   assignLawyerValidator,
//   updateConsultationStatusValidator,
// };


const { body } = require('express-validator');
const { CONSULTATION_STATUSES } = require('../models/Consultation');

const createConsultationValidator = [
  // client اختياري في الـ body: العميل (role: client) بيتحدد تلقائيًا في
  // الكونترولر من حسابه هو، ومش لازم/مسموحله يبعت client id يدوي.
  // الموظف/الإدارة لسه لازم يبعتوه لما يسجلوا استشارة نيابة عن عميل.
  body('client').optional().isMongoId().withMessage('validation.clientIdRequired'),
  body('subject').trim().notEmpty().withMessage('validation.consultationSubjectRequired'),
  body('description').trim().notEmpty().withMessage('validation.consultationDescriptionRequired'),
  body('category').optional().isString(),
  body('preferredLawyer').optional().isMongoId().withMessage('validation.lawyerIdRequired'),
];

const addMessageValidator = [
  // النص بقى اختياري هنا — لو مفيش مرفق (req.file)، الكونترولر هو اللي
  // هيرفض الطلب لو النص فاضي. كده رسالة "مرفق بس من غير نص" ممكنة.
  body('text').optional().trim(),
];

const assignLawyerValidator = [
  body('assignedLawyer').isMongoId().withMessage('validation.lawyerIdRequired'),
];

const updateConsultationStatusValidator = [
  body('status').isIn(CONSULTATION_STATUSES).withMessage('validation.consultationStatusInvalid'),
];

module.exports = {
  createConsultationValidator,
  addMessageValidator,
  assignLawyerValidator,
  updateConsultationStatusValidator,
};