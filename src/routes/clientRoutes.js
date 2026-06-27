const express = require('express');
const clientController = require('../controllers/clientController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const { createClientValidator, updateClientValidator } = require('../validators/clientValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.CLIENTS, ACTIONS.VIEW), clientController.getAllClients)
  .post(
    authorize(RESOURCES.CLIENTS, ACTIONS.CREATE),
    createClientValidator,
    validate,
    auditLog('CLIENT_CREATED', RESOURCES.CLIENTS),
    clientController.createClient
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.CLIENTS, ACTIONS.VIEW), clientController.getClient)
  .patch(
    authorize(RESOURCES.CLIENTS, ACTIONS.EDIT),
    updateClientValidator,
    validate,
    auditLog('CLIENT_UPDATED', RESOURCES.CLIENTS),
    clientController.updateClient
  )
  .delete(
    authorize(RESOURCES.CLIENTS, ACTIONS.DELETE),
    auditLog('CLIENT_DELETED', RESOURCES.CLIENTS),
    clientController.deleteClient
  );

module.exports = router;
