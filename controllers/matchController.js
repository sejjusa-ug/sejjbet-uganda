// controllers/matchController.js
const { startSimulation } = require('../services/matchSimulator');

async function startMatch(req, res) {
  const { fixtureId } = req.body;

  try {
    await startSimulation(fixtureId);
    res.status(200).json({ success: true, message: 'Simulation started' });
  } catch (err) {
    console.error(`❌ Failed to start simulation for fixture ${fixtureId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { startMatch };