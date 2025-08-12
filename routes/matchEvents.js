// backend/routes/matchEvents.js
const express = require('express');
const router = express.Router();
const { addMatchEvent } = require('../services/matchStore');

// ✅ POST /api/fixtures/:id/event → add new event
router.post('/:id/event', async (req, res) => {
  const fixtureId = req.params.id;
  const event = req.body;

  if (!fixtureId || !event || !event.type || !event.team || !event.player || typeof event.minute !== 'number') {
    return res.status(400).json({ success: false, error: 'Invalid event structure' });
  }

  try {
    await addMatchEvent(fixtureId, event);
    res.status(200).json({ success: true, event });
  } catch (err) {
    console.error(`❌ Failed to add event for fixture ${fixtureId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;