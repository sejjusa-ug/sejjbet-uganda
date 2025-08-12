const express = require("express");
const router = express.Router();
const db = require("../models/db");

const UG_TZ = "Africa/Kampala";

// Native formatter for Uganda timezone
const formatUGDate = (date) => {
  return new Intl.DateTimeFormat("en-UG", {
    timeZone: UG_TZ,
    weekday: "short",     // e.g. "Sun"
    year: "numeric",      // e.g. "2025"
    month: "short",       // e.g. "Aug"
    day: "2-digit",       // e.g. "10"
    hour: "2-digit",      // e.g. "17"
    minute: "2-digit",    // e.g. "13"
    second: "2-digit",    // e.g. "21"
    hour12: false         // 24-hour format
  }).format(new Date(date));
};

// Payout multiplier to boost returns (e.g. 1.1 = 10% boost)
const PAYOUT_MULTIPLIER = 1.1;

// Fetch all bets (GET /api/bets)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM sejjusersbets ORDER BY placed_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching all bets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Place new bet (POST /api/bets)
router.post("/", async (req, res) => {
  try {
    const { user_id, stake, selections } = req.body;

    if (
      !user_id ||
      !stake ||
      !selections ||
      !Array.isArray(selections) ||
      selections.length === 0
    ) {
      return res.status(400).json({ message: "Missing or invalid parameters" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const sel of selections) {
        const { fixture_id, market_type, selection, odds } = sel;

        // Calculate payout with multiplier
        const basePayout = parseFloat(odds) * parseFloat(stake);
        const boostedPayout = basePayout * PAYOUT_MULTIPLIER;

        await conn.query(
          `INSERT INTO sejjusersbets 
           (user_id, fixture_id, market_type, selection, odds, stake, payout, status, placed_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            user_id,
            fixture_id,
            market_type,
            selection,
            parseFloat(odds), // ensure odds is numeric
            parseFloat(stake),
            parseFloat(boostedPayout.toFixed(2)), // ✅ store as numeric
          ]
        );
      }

      await conn.commit();
      conn.release();

      res.status(201).json({ message: "Bet placed successfully" });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (error) {
    console.error("Error placing bet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch bets by user with fixture info and Uganda timezone formatting
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const [rows] = await db.query(
      `
      SELECT b.*, 
        f.home_team, 
        f.away_team, 
        f.match_date, 
        f.match_day 
      FROM sejjusersbets b
      JOIN sejjfixtures f ON b.fixture_id = f.id
      WHERE b.user_id = ?
      ORDER BY b.placed_at DESC
      `,
      [user_id]
    );

    // Format date/time fields to Uganda timezone
    const formattedRows = rows.map((row) => ({
      ...row,
      match_date: formatUGDate(row.match_date),
      placed_at: formatUGDate(row.placed_at),
      stake: row.stake !== null ? parseFloat(row.stake) : 0,
      payout: row.payout !== null ? parseFloat(row.payout) : 0, // ✅ always number
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching bets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// New: Settle pending bets older than 2 minutes by randomly marking them 'win' or 'lost'
router.post("/settle-old-bets", async (req, res) => {
  try {
    // Date 2 minutes ago
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Find pending bets older than 2 minutes
    const [oldPendingBets] = await db.query(
      `SELECT id FROM sejjusersbets WHERE status = 'pending' AND placed_at <= ?`,
      [twoMinsAgo]
    );

    if (oldPendingBets.length === 0) {
      return res.json({ message: "No bets to settle." });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const bet of oldPendingBets) {
        // Randomly assign 'win' or 'lost' for demo
        const newStatus = Math.random() > 0.5 ? "win" : "lost";

        await conn.query(
          `UPDATE sejjusersbets SET status = ? WHERE id = ?`,
          [newStatus, bet.id]
        );
      }

      await conn.commit();
      conn.release();

      res.json({ message: `Settled ${oldPendingBets.length} bets.` });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (error) {
    console.error("Error settling old bets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
