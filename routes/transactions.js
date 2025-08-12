router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        t.id,
        t.user_id,
        u.first_name,
        u.last_name,
        t.transaction_type,
        t.amount,
        t.description,
        t.created_at
      FROM sejjtransactions t
      JOIN sejjbetusers u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
});
