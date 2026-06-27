const express = require('express');
const documentController = require('../controllers/documentController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const auditLog = require('../middlewares/auditLog');
const upload = require('../middlewares/upload');
const uploadToCloudinary = require('../middlewares/uploadToCloudinary');
const { RESOURCES, ACTIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.DOCUMENTS, ACTIONS.VIEW), documentController.getAllDocuments)
  .post(
    authorize(RESOURCES.DOCUMENTS, ACTIONS.CREATE),
    upload.single('file'),
    uploadToCloudinary,
    auditLog('DOCUMENT_UPLOADED', RESOURCES.DOCUMENTS),
    documentController.createDocument
  );

router
  .route('/:id')
  .get(
    authorize(RESOURCES.DOCUMENTS, ACTIONS.VIEW),
    auditLog('DOCUMENT_VIEWED', RESOURCES.DOCUMENTS),
    documentController.getDocument
  )
  .delete(
    authorize(RESOURCES.DOCUMENTS, ACTIONS.DELETE),
    auditLog('DOCUMENT_DELETED', RESOURCES.DOCUMENTS),
    documentController.deleteDocument
  );

router.post(
  '/:id/versions',
  authorize(RESOURCES.DOCUMENTS, ACTIONS.EDIT),
  upload.single('file'),
  uploadToCloudinary,
  auditLog('DOCUMENT_VERSION_ADDED', RESOURCES.DOCUMENTS),
  documentController.addDocumentVersion
);

router.delete(
  '/:id/versions/:versionNumber',
  authorize(RESOURCES.DOCUMENTS, ACTIONS.DELETE),
  auditLog('DOCUMENT_VERSION_DELETED', RESOURCES.DOCUMENTS),
  documentController.deleteDocumentVersion
);

module.exports = router;
