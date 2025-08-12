const db = require('../models/db');
const { generateRandomEvent } = require('../utils/eventGenerator');
const {
  saveEventToDB,
  updateMatchTime,
  updateMatchStatus,
  broadcastToFrontend
} = require('../utils/matchUtils');
const { notifyAdmin } = require('../utils/adminNotifier'); // ✅ NEW

const WAIT_TIME = 30 * 1000;
const MATCH_DURATION = 300;
const EXTRA_TIME = 60;
const BREAK_TIME = 30 * 1000;
const MAX_GOALS = 3;
const MATCH_COUNT = 249;

let matchGoals = {};
let completedCount = 0;

async function getReadyFixtures() {
  const [rows] = await db.query(`
    SELECT id, match_date
    FROM sejjfixtures
    WHERE status = 'upcoming'
    ORDER BY match_date ASC
    LIMIT ?
  `, [MATCH_COUNT]);

  const now = new Date();
  const ready = rows.filter(row => {
    const matchTime = new Date(row.match_date);
    return matchTime <= now;
  });

  return ready;
}

async function startSimulationCycle() {
  console.log(`⏳ Waiting 30 seconds before starting simulations...`);
  await new Promise(res => setTimeout(res, WAIT_TIME));

  const fixtures = await getReadyFixtures();
  if (fixtures.length === 0) {
    console.log("🚫 No fixtures ready to simulate.");
    return startSimulationCycle(); // Retry after wait
  }

  console.log(`🚀 Starting simulations for ${fixtures.length} fixtures...`);
  matchGoals = {};
  completedCount = 0;

  for (const { id } of fixtures) {
    matchGoals[id] = 0;
    startFirstHalf(id);
  }
}

function startFirstHalf(fixtureId) {
  let time = 0;
  updateMatchStatus(fixtureId, '1st Half');
  notifyAdmin(`Match ${fixtureId} has started (1st Half)`); // ✅ NEW

  const interval = setInterval(async () => {
    time++;
    await updateMatchTime(fixtureId, time);
    await maybeGenerateEvent(fixtureId, time);

    if (time === MATCH_DURATION) {
      clearInterval(interval);
      await updateMatchStatus(fixtureId, 'Half-Time');
      notifyAdmin(`Match ${fixtureId} reached Half-Time`); // ✅ NEW
      setTimeout(() => startSecondHalf(fixtureId), BREAK_TIME);
    }
  }, 1000);
}

function startSecondHalf(fixtureId) {
  let time = MATCH_DURATION;
  updateMatchStatus(fixtureId, '2nd Half');
  notifyAdmin(`Match ${fixtureId} has resumed (2nd Half)`); // ✅ NEW

  const interval = setInterval(async () => {
    time++;
    await updateMatchTime(fixtureId, time);
    await maybeGenerateEvent(fixtureId, time);

    if (time === MATCH_DURATION * 2) {
      clearInterval(interval);
      await updateMatchStatus(fixtureId, 'Extra Time');
      notifyAdmin(`Match ${fixtureId} entered Extra Time`); // ✅ NEW
      setTimeout(() => endMatch(fixtureId), EXTRA_TIME * 1000);
    }
  }, 1000);
}

async function endMatch(fixtureId) {
  await updateMatchStatus(fixtureId, 'Full Time');
  await db.query(`UPDATE sejjfixtures SET status = 'completed' WHERE id = ?`, [fixtureId]);
  notifyAdmin(`Match ${fixtureId} has ended (Full Time)`); // ✅ NEW
  completedCount++;

  if (completedCount === MATCH_COUNT) {
    console.log(`✅ All ${MATCH_COUNT} matches completed. Preparing next cycle...`);
    await insertNewFixtures();
  }
}

async function maybeGenerateEvent(fixtureId, time) {
  const chance = Math.random();
  if (chance < 0.05 && matchGoals[fixtureId] < MAX_GOALS) {
    const event = await generateRandomEvent(fixtureId, time);
    if (event.type === 'goal') matchGoals[fixtureId]++;
    await saveEventToDB(fixtureId, event);
    broadcastToFrontend(fixtureId, event);
  }
}

async function insertNewFixtures() {
  const [teams] = await db.query(`SELECT DISTINCT team FROM sejjplayers`);
  const teamList = teams.map(t => t.team);
  const fixtures = [];

  for (let i = 0; i < MATCH_COUNT; i++) {
    let home = teamList[Math.floor(Math.random() * teamList.length)];
    let away;
    do {
      away = teamList[Math.floor(Math.random() * teamList.length)];
    } while (away === home);

    fixtures.push([
      new Date(Date.now() + i * 60000), // staggered start times
      home,
      away,
      'upcoming'
    ]);
  }

  await db.query(
    `INSERT INTO sejjfixtures (match_date, home_team, away_team, status) VALUES ?`,
    [fixtures]
  );

  console.log(`🆕 Inserted ${MATCH_COUNT} new upcoming fixtures.`);
}

// ♻️ Start endless loop
(async function loopSimulations() {
  while (true) {
    await startSimulationCycle();
  }
})();