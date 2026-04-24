const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/authMiddleware');

// Pharmacy: get order queue
router.get('/', verifyToken, orderController.getPharmacyOrders);

// Pharmacy: validate an order (smart checks)
router.get('/:patientId/:orderId/validate', verifyToken, orderController.validateOrder);

// Pharmacy: approve/reject an order
router.put('/:patientId/:orderId/respond', verifyToken, orderController.respondToOrder);

module.exports = router;
