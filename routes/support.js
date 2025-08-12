const express = require("express");
const router = express.Router();
const {
  createSupportMessage,
  getAllSupportMessages,
  markMessageAsRead,
  replyToSupportMessage,
  getUnreadMessages,
  getReadMessages
} = require("../controllers/supportController");

// ✅ Submit message
router.post("/support", createSupportMessage);

// ✅ Fetch all messages or filter by user_id
router.get("/support", getAllSupportMessages);

// ✅ Mark message as read (supports both PUT and PATCH)
router.put("/support/:id/read", markMessageAsRead);
router.patch("/support/:id/read", markMessageAsRead);

// ✅ Admin reply to message (supports both POST and PUT)
router.post("/support/:id/reply", replyToSupportMessage);
router.put("/support/:id/reply", replyToSupportMessage);

// ✅ Fetch unread messages
router.get("/support/unread", getUnreadMessages);

// ✅ Fetch read messages
router.get("/support/read", getReadMessages);

module.exports = router;