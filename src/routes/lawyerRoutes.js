const express = require('express');
const lawyerController = require('../controllers/lawyerController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const { createLawyerValidator, updateLawyerValidator } = require('../validators/lawyerValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.LAWYERS, ACTIONS.VIEW), lawyerController.getAllLawyers)
  .post(
    authorize(RESOURCES.LAWYERS, ACTIONS.CREATE),
    createLawyerValidator,
    validate,
    auditLog('LAWYER_CREATED', RESOURCES.LAWYERS),
    lawyerController.createLawyer
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.LAWYERS, ACTIONS.VIEW), lawyerController.getLawyer)
  .patch(
    authorize(RESOURCES.LAWYERS, ACTIONS.EDIT),
    updateLawyerValidator,
    validate,
    auditLog('LAWYER_UPDATED', RESOURCES.LAWYERS),
    lawyerController.updateLawyer
  )
  .delete(
    authorize(RESOURCES.LAWYERS, ACTIONS.DELETE),
    auditLog('LAWYER_DELETED', RESOURCES.LAWYERS),
    lawyerController.deleteLawyer
  );

router.get('/:id/performance', authorize(RESOURCES.LAWYERS, ACTIONS.VIEW), lawyerController.getLawyerPerformance);

module.exports = router;
