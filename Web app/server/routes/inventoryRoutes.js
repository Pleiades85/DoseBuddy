const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const verifyToken = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');

router.get('/', verifyToken, inventoryController.getAllInventory);
router.post('/', verifyToken, validateRequest('addInventoryItem'), inventoryController.addItem);

module.exports = router;
