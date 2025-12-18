const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { getInsights } = require('../controllers/insightsController');

router.get('/insights', requireLogin, getInsights);

module.exports = router;