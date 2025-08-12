const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));
app.use(express.json());

// ✅ Log incoming request bodies
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`📥 ${req.method} ${req.url} - Payload:`, req.body);
  }
  next();
});

// Routes
const userRoutes = require('./routes/userRoutes');
const supportRoutes = require('./routes/support');
const walletsRoute = require('./routes/wallets');
const fixturesRoute = require('./routes/fixturesRoute');
const betsRouter = require("./routes/bets");
const adminRoutes = require('./routes/admin'); // ✅ Admin route

app.use('/api/users', userRoutes);
app.use('/api', supportRoutes);
app.use('/api/wallets', walletsRoute);
app.use('/api', fixturesRoute);
app.use("/api/bets", betsRouter);
app.use('/api/admin', adminRoutes); // ✅ Admin login

// ✅ Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});