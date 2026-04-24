const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const verifyToken = require('../middleware/authMiddleware');
const requirePharmacyRole = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const multer = require('multer');

// File upload config with size limit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.get('/', verifyToken, patientController.getAllPatients);
router.get('/:id', verifyToken, patientController.getPatientById);
router.post('/', verifyToken, requirePharmacyRole, validateRequest('addPatient'), patientController.addPatient);
router.put('/:id', verifyToken, requirePharmacyRole, validateRequest('updatePatient'), patientController.updatePatient);
router.post('/link', verifyToken, requirePharmacyRole, validateRequest('linkPatient'), patientController.linkPatient);

// Prescription Upload & Confirm
router.post('/upload-prescription/:id', verifyToken, upload.single('file'), patientController.analyzePrescription);
router.post('/confirm-prescription/:id', verifyToken, validateRequest('confirmPrescription'), patientController.confirmPrescription);

router.post('/:id/access-code', verifyToken, requirePharmacyRole, validateRequest('regenerateAccessCode'), patientController.regenerateAccessCode);
router.get('/:id/logs', verifyToken, requirePharmacyRole, patientController.getPatientLogs);

// Prescription image — now requires authentication
router.get('/prescription-image/:id', verifyToken, patientController.getPrescriptionImage);

module.exports = router;
