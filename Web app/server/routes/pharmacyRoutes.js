const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, pharmacyController.getProfile);
router.put('/profile', verifyToken, pharmacyController.updateProfile);

module.exports = router;
