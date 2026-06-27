const express = require('express');
const userController = require('../controllers/userController');
const fcmController = require('../controllers/fcmController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const { createUserValidator } = require('../validators/userValidators');
const { registerFcmTokenValidator, removeFcmTokenValidator } = require('../validators/fcmValidators');

const router = express.Router();

router.use(protect);

// IMPORTANT: these /me/* routes must be declared before the /:id routes
// below, otherwise Express would match "me" as an :id parameter.
router
  .route('/me/fcm-token')
  .post(registerFcmTokenValidator, validate, fcmController.addFcmToken)
  .delete(removeFcmTokenValidator, validate, fcmController.deleteFcmToken);

router
  .route('/')
  .get(authorize(RESOURCES.USERS, ACTIONS.VIEW), userController.getAllUsers)
  .post(
    authorize(RESOURCES.USERS, ACTIONS.CREATE),
    createUserValidator,
    validate,
    auditLog('STAFF_USER_CREATED', RESOURCES.USERS),
    userController.createUser
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.USERS, ACTIONS.VIEW), userController.getUser)
  .patch(
    authorize(RESOURCES.USERS, ACTIONS.EDIT),
    auditLog('USER_UPDATED', RESOURCES.USERS),
    userController.updateUser
  )
  .delete(
    authorize(RESOURCES.USERS, ACTIONS.DELETE),
    auditLog('USER_DEACTIVATED', RESOURCES.USERS),
    userController.deleteUser
  );

module.exports = router;
