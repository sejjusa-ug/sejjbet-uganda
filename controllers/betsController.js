const db = require("../models/db");

// Get bets for a specific user
exports.getUserBets = async (req, res) => {
  const userId = req.params.user_id;

  try {
    const [rows] = await db.execute(
      `SELECT id, fixture_id, market_type, selection, odds, stake, payout, status, placed_at
       FROM sejjusersbets
       WHERE user_id = ?
       ORDER BY placed_at DESC`,
      [userId]
    );

    return res.json({ bets: rows });
  } catch (error) {
    console.error("Error fetching user bets:", error);
    return res.status(500).json({ error: "Failed to fetch bets" });
  }
};
