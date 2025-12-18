// routes/insightsRoutes.js
const express = require('express');
const router = express.Router();
const { getDaySummary, getWeekOverview } = require('../controllers/insightsController');

router.get('/day/:date', getDaySummary);     // /day/2025-12-18
router.get('/week', getWeekOverview);        // /week (current week) or /week?start=YYYY-MM-DD

module.exports = router;