const db = require("../models/db");

// 🕒 Format timestamp in Uganda time with weekday
const formatUgandaTime = iso => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-UG", {
    timeZone: "Africa/Kampala",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
};

// ✅ Create a new support message with auto-reply every time
exports.createSupportMessage = async (req, res) => {
  const { user_id, first_name, last_name, mobile, district, message } = req.body;

  if (!user_id || !first_name || !last_name || !mobile || !message) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount > 100) {
    return res.status(400).json({ success: false, error: "Message must not exceed 100 words." });
  }

  // 🧠 Classify message
  const classifyMessage = msg => {
    const lower = msg.toLowerCase();
    if (lower.includes("deposit") || lower.includes("payment")) return "deposit";
    if (lower.includes("withdraw") || lower.includes("cash out")) return "withdrawal";
    if (lower.includes("loading") || lower.includes("not opening") || lower.includes("bug")) return "app_bug";
    if (lower.includes("login") || lower.includes("password")) return "login";
    if (lower.includes("bonus") || lower.includes("promo")) return "bonus";
    if (lower.includes("bet") || lower.includes("settlement")) return "bet_settlement";
    if (lower.includes("delay") || lower.includes("long")) return "delay";
    if (lower.includes("verify") || lower.includes("documents")) return "verification";
    return "general";
  };

  // 🧾 Reply templates
  const autoReplies = {
    deposit: "Thanks for your deposit query. We're checking your transaction and will update your balance shortly.",
    withdrawal: "Withdrawal requests are being processed. Kindly allow up to 24 hours and ensure your account is verified.",
    app_bug: "Sorry you're experiencing issues with the app. Please try restarting or updating. We're investigating further.",
    login: "Login issues can be frustrating. Please use the 'Forgot Password' option or contact support for manual reset.",
    bonus: "Bonus claims are reviewed automatically. If you qualified, it should reflect soon. Let us know if not.",
    bet_settlement: "We’re reviewing your bet slip and will confirm the outcome shortly. Thanks for your patience.",
    delay: "We’re working to resolve delays. Your request is in queue and will be handled as soon as possible.",
    verification: "To verify your account, please upload a valid ID and proof of address. Our team will confirm within 24 hours.",
    general: "Thanks for reaching out. We'll get back to you as soon as possible."
  };

  try {
    // Insert the user's message
    const [result] = await db.query(
      `INSERT INTO support_messages (user_id, first_name, last_name, mobile, district, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, first_name, last_name, mobile, district || null, message]
    );

    const insertedId = result.insertId;

    // 🧠 Generate context-aware auto-reply
    const category = classifyMessage(message);
    const autoReply = autoReplies[category] || autoReplies.general;

    // Immediately auto-reply to that message
    await db.query(
      `UPDATE support_messages
       SET admin_reply = ?, replied_at = NOW(), status = 'Read', is_read = 1
       WHERE id = ?`,
      [autoReply, insertedId]
    );

    res.status(201).json({
      success: true,
      message: "Support message saved and auto-replied.",
      id: insertedId
    });
  } catch (err) {
    console.error("Error saving support message:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// ✅ Get all support messages
exports.getAllSupportMessages = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM support_messages ORDER BY submitted_at DESC`);

    const formatted = rows.map(msg => ({
      ...msg,
      submitted_at: formatUgandaTime(msg.submitted_at),
      updated_at: formatUgandaTime(msg.updated_at),
      replied_at: msg.replied_at ? formatUgandaTime(msg.replied_at) : null
    }));

    res.status(200).json({ success: true, messages: formatted });
  } catch (err) {
    console.error("Error fetching support messages:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// ✅ Mark message as read
exports.markMessageAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(`UPDATE support_messages SET is_read = TRUE WHERE id = ?`, [id]);
    res.status(200).json({ success: true, message: "Message marked as read." });
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// ✅ Reply to message and set replied_at timestamp (now returns full updated row)
exports.replyToSupportMessage = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || reply.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Reply cannot be empty." });
  }

  try {
    await db.query(
      `UPDATE support_messages
       SET admin_reply = ?, replied_at = NOW(), status = 'Resolved'
       WHERE id = ?`,
      [reply, id]
    );

    const [rows] = await db.query(`SELECT * FROM support_messages WHERE id = ?`, [id]);
    const updatedMessage = rows[0];

    if (!updatedMessage) {
      return res.status(404).json({ success: false, error: "Message not found after update." });
    }

    updatedMessage.submitted_at = formatUgandaTime(updatedMessage.submitted_at);
    updatedMessage.updated_at = formatUgandaTime(updatedMessage.updated_at);
    updatedMessage.replied_at = updatedMessage.replied_at ? formatUgandaTime(updatedMessage.replied_at) : null;

    res.status(200).json({
      success: true,
      message: "Reply saved.",
      data: updatedMessage
    });
  } catch (err) {
    console.error("Error replying to message:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// ✅ Get unread messages
exports.getUnreadMessages = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM support_messages WHERE is_read = FALSE ORDER BY submitted_at DESC`);

    const formatted = rows.map(msg => ({
      ...msg,
      submitted_at: formatUgandaTime(msg.submitted_at),
      updated_at: formatUgandaTime(msg.updated_at),
      replied_at: msg.replied_at ? formatUgandaTime(msg.replied_at) : null
    }));

    res.status(200).json({ success: true, messages: formatted });
  } catch (err) {
    console.error("Error fetching unread messages:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// ✅ Get read messages
exports.getReadMessages = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM support_messages WHERE is_read = TRUE ORDER BY submitted_at DESC`);

    const formatted = rows.map(msg => ({
      ...msg,
      submitted_at: formatUgandaTime(msg.submitted_at),
      updated_at: formatUgandaTime(msg.updated_at),
      replied_at: msg.replied_at ? formatUgandaTime(msg.replied_at) : null
    }));

    res.status(200).json({ success: true, messages: formatted });
  } catch (err) {
    console.error("Error fetching read messages:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};