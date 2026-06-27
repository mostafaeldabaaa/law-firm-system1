const express = require('express');
const caseController = require('../controllers/caseController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const {
  createCaseValidator,
  updateCaseStatusValidator,
  addCaseNoteValidator,
} = require('../validators/caseValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.CASES, ACTIONS.VIEW), caseController.getAllCases)
  .post(
    authorize(RESOURCES.CASES, ACTIONS.CREATE),
    createCaseValidator,
    validate,
    auditLog('CASE_CREATED', RESOURCES.CASES),
    caseController.createCase
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.CASES, ACTIONS.VIEW), caseController.getCase)
  .patch(
    authorize(RESOURCES.CASES, ACTIONS.EDIT),
    auditLog('CASE_UPDATED', RESOURCES.CASES),
    caseController.updateCase
  )
  .delete(
    authorize(RESOURCES.CASES, ACTIONS.DELETE),
    auditLog('CASE_DELETED', RESOURCES.CASES),
    caseController.deleteCase
  );

router.patch(
  '/:id/status',
  authorize(RESOURCES.CASES, ACTIONS.EDIT),
  updateCaseStatusValidator,
  validate,
  auditLog('CASE_STATUS_CHANGED', RESOURCES.CASES),
  caseController.updateCaseStatus
);

router.post(
  '/:id/notes',
  authorize(RESOURCES.CASES, ACTIONS.EDIT),
  addCaseNoteValidator,
  validate,
  auditLog('CASE_NOTE_ADDED', RESOURCES.CASES),
  caseController.addCaseNote
);

module.exports = router;
