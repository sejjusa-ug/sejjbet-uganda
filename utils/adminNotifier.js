function notifyAdmin(message) {
  console.log(`📣 ADMIN NOTICE: ${message}`);
  // Future: send to dashboard, email, or webhook
}

module.exports = { notifyAdmin };