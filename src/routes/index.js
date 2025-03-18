const express = require('express');
const router = express.Router();
const googleSheetsRoutes = require('./google-sheets');

// Mount Google Sheets routes
router.use('/google-sheets', googleSheetsRoutes);

module.exports = router; 