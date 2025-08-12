const db = require('../models/db');

exports.getAllFixtures = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id,
        home_team,
        away_team,
        match_day,
        match_date,
        odds_full_home_win,
        odds_full_draw,
        odds_full_away_win,
        odds_half_home_win,
        odds_half_draw,
        odds_half_away_win,
        odds_second_half_home_win,
        odds_second_half_draw,
        odds_second_half_away_win,
        odds_over_2_5_goals,
        odds_under_2_5_goals,
        odds_over_1_5_yellow,
        odds_over_0_5_red
      FROM sejjfixtures
      ORDER BY match_day ASC, match_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching fixtures' });
  }
};