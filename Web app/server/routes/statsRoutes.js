const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, statsController.getStats);

module.exports = router;
