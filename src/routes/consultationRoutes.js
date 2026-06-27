const express = require('express');
const consultationController = require('../controllers/consultationController');
const protect = require('../middlewares/protect');
const { authorize, restrictTo } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const {
  createConsultationValidator,
  addMessageValidator,
  assignLawyerValidator,
  updateConsultationStatusValidator,
} = require('../validators/consultationValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.CONSULTATIONS, ACTIONS.VIEW), consultationController.getAllConsultations)
  .post(
    authorize(RESOURCES.CONSULTATIONS, ACTIONS.CREATE),
    createConsultationValidator,
    validate,
    auditLog('CONSULTATION_CREATED', RESOURCES.CONSULTATIONS),
    consultationController.createConsultation
  );

router.get('/:id', authorize(RESOURCES.CONSULTATIONS, ACTIONS.VIEW), consultationController.getConsultation);

router.post(
  '/:id/messages',
  authorize(RESOURCES.CONSULTATIONS, ACTIONS.VIEW), // any party who can view may reply
  addMessageValidator,
  validate,
  consultationController.addMessage
);

router.patch(
  '/:id/assign',
  authorize(RESOURCES.CONSULTATIONS, ACTIONS.EDIT),
  assignLawyerValidator,
  validate,
  auditLog('CONSULTATION_ASSIGNED', RESOURCES.CONSULTATIONS),
  consultationController.assignLawyer
);

router.patch(
  '/:id/status',
  authorize(RESOURCES.CONSULTATIONS, ACTIONS.EDIT),
  updateConsultationStatusValidator,
  validate,
  auditLog('CONSULTATION_STATUS_UPDATED', RESOURCES.CONSULTATIONS),
  consultationController.updateStatus
);

router.post(
  '/:id/convert-to-case',
  restrictTo('super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'),
  auditLog('CONSULTATION_CONVERTED_TO_CASE', RESOURCES.CONSULTATIONS),
  consultationController.convertToCase
);

module.exports = router;
