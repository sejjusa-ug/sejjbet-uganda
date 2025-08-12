const express = require('express');
const router = express.Router();
const { getAllFixtures } = require('../controllers/fixturesController');

router.get('/fixtures', getAllFixtures);

module.exports = router;