const express = require("express");
const router = express.Router();
const db = require('../models/db'); // adjust path if needed

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        w.id AS wallet_id,
        w.user_id,
        u.first_name,
        u.last_name,
        u.mobile,
        w.balance,
        w.currency,
        w.created_at
      FROM sejjwallets w
      JOIN sejjbetusers u ON w.user_id = u.id
      ORDER BY w.id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching wallets:", err);
    res.status(500).json({ error: "Failed to fetch wallet data." });
  }
});

module.exports = router;