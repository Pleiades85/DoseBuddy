const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const verifyToken = require('../middleware/authMiddleware');

// Create a share request (patient or pharmacy)
router.post('/', verifyToken, shareController.createShareRequest);

// Pharmacy: get incoming share requests
router.get('/incoming', verifyToken, shareController.getIncomingRequests);

// Pharmacy: approve/reject share request
router.put('/:id/respond', verifyToken, shareController.respondToShareRequest);

// Patient: get their active shares
router.get('/my-shares', verifyToken, shareController.getPatientShares);

// Revoke a share
router.delete('/:id', verifyToken, shareController.revokeShare);

// List all pharmacies (for patient selection)
router.get('/pharmacies', verifyToken, shareController.listPharmacies);

module.exports = router;
