const express = require('express');
const router = express.Router();
const db = require("../models/db");

const {
  getMatchState,
  setMatchState,
  getMatchEvents
} = require('../services/matchStore');
const { startSimulation } = require('../services/matchSimulator');

console.log("getMatchEvents type:", typeof getMatchEvents);

// ✅ GET /api/fixtures → fetch latest 10 fixtures from DB
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, home_team AS homeTeam, away_team AS awayTeam, match_date AS matchDate
      FROM sejjfixtures
      ORDER BY id DESC
      LIMIT 10
    `);

    // Convert matchDate to East Africa Time (UTC+3)
    const formatted = rows.map(row => ({
      ...row,
      matchDate: new Date(row.matchDate).toLocaleString('en-GB', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Failed to fetch fixtures:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET /api/fixtures/:id → basic fixture info (updated)
router.get('/:id', (req, res) => {
  const fixtureId = req.params.id;
  const state = getMatchState(fixtureId);
  if (!state) return res.status(404).json({ success: false, error: 'Fixture not found' });

  const { homeTeam, awayTeam, scoreHome, scoreAway, minute } = state;

  // ✅ Return raw match object (no success wrapper)
  res.json({ homeTeam, awayTeam, scoreHome, scoreAway, minute });
});

// ✅ GET /api/fixtures/:id/events → event history
router.get('/:id/events', async (req, res) => {
  const fixtureId = req.params.id;
  try {
    const events = await getMatchEvents(fixtureId);
    res.status(200).json(events);
  } catch (err) {
    console.error(`❌ Failed to fetch events for fixture ${fixtureId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET /api/fixtures/:id/state → full match state (auto-seeds if missing)
router.get('/:id/state', async (req, res) => {
  const fixtureId = req.params.id;
  let state = getMatchState(fixtureId);

  if (!state) {
    try {
      const [rows] = await db.query(`
        SELECT home_team AS homeTeam, away_team AS awayTeam, match_date AS matchDate
        FROM sejjfixtures
        WHERE id = ?
        LIMIT 1
      `, [fixtureId]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Fixture not found in DB' });
      }

      const fixture = rows[0];

      const formattedDate = new Date(fixture.matchDate).toLocaleString('en-GB', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      state = {
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        matchDate: formattedDate,
        match_time: 0,
        score: { home: 0, away: 0 },
        status: 'NOT_STARTED',
        events: []
      };

      await setMatchState(fixtureId, state);
    } catch (err) {
      console.error(`❌ Failed to seed match state for fixture ${fixtureId}:`, err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  res.json({ success: true, state });
});

// ✅ POST /api/fixtures/:id/state → override match state
router.post('/:id/state', async (req, res) => {
  const fixtureId = req.params.id;
  const newState = req.body;
  try {
    await setMatchState(fixtureId, newState);
    res.status(200).json({ success: true, updated: newState });
  } catch (err) {
    console.error(`❌ Failed to set match state for fixture ${fixtureId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ POST /api/fixtures/:id/simulate → start simulation
router.post('/:id/simulate', async (req, res) => {
  const fixtureId = req.params.id;
  try {
    await startSimulation(fixtureId);
    res.status(200).json({ success: true, message: 'Simulation started' });
  } catch (err) {
    console.error(`❌ Simulation failed for fixture ${fixtureId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;