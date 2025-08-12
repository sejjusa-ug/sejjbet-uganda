const matchStates = {};
const {
  saveEventToDB,
  updateMatchTime,
  updateMatchStatus
} = require('../utils/matchUtils');

// ✅ Return full match state or null if not found
function getMatchState(id) {
  return matchStates[id] || null;
}

async function addMatchEvent(id, event) {
  // Save to DB
  await saveEventToDB(id, event);
  await updateMatchTime(id, event.minute);

  // Initialize in-memory state if missing
  if (!matchStates[id]) {
    matchStates[id] = {
      homeTeam: 'Home',
      awayTeam: 'Away',
      match_time: event.minute,
      status: 'LIVE',
      score: { home: 0, away: 0 },
      events: []
    };
  }

  // Update score if it's a goal
  if (event.type === 'goal') {
    matchStates[id].score[event.team]++;
  }

  matchStates[id].events.push(event);
  matchStates[id].match_time = event.minute;
}

async function setMatchState(id, newState) {
  matchStates[id] = {
    homeTeam: newState.homeTeam || 'Home',
    awayTeam: newState.awayTeam || 'Away',
    match_time: newState.match_time || 0,
    status: newState.status || 'LIVE',
    score: newState.score || { home: 0, away: 0 },
    events: newState.events || []
  };

  await updateMatchStatus(id, matchStates[id].status);
}

// ✅ Get all events for a fixture
function getMatchEvents(id) {
  const state = matchStates[id];
  return state?.events || [];
}

// ✅ Export all functions
module.exports = {
  getMatchState,
  addMatchEvent,
  setMatchState,
  getMatchEvents
};