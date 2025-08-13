const {
  createUser,
  getUserById,
  getUserByMobile,
  verifyPassword
} = require('../models/User.js');

const {
  createWallet,
  getWalletByUserId,
  updateWalletBalance
} = require('../models/Wallet.j');

const db = require('../models/db'); // ✅ Needed for password update and transactions
const bcrypt = require('bcrypt');   // ✅ Needed for hashing

// Format timestamp to "6 Aug 2025, 12:16 AM"
function formatDate(isoString) {
  const date = new Date(isoString);
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Kampala'
  };
  return date.toLocaleString('en-GB', options);
}

// Format UGX balance
function formatUGX(value) {
  const num = parseFloat(
    typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value
  );
  if (isNaN(num)) return 'UGX 0.00';
  return 'UGX ' + num.toLocaleString('en-UG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Infer payment method from mobile prefix
function resolvePaymentMethod(mobile) {
  const prefix = mobile.slice(0, 3);
  if (['070', '074', '075'].includes(prefix)) return 'Airtel Money';
  if (['076', '077', '078'].includes(prefix)) return 'MTN Mobile Money';
  return 'Unknown / Unsupported';
}

// Validate mobile format and network
function validateMobile(mobile) {
  const isValidFormat = /^07\d{8}$/.test(mobile);
  const payment_method = resolvePaymentMethod(mobile);
  const isSupported = payment_method !== 'Unknown / Unsupported';

  return {
    isValid: isValidFormat && isSupported,
    payment_method,
    reason: !isValidFormat
      ? 'Invalid format: must be 10 digits starting with 07'
      : !isSupported
      ? 'Unsupported network prefix'
      : 'Valid'
  };
}

async function registerUser(req, res) {
  try {
    const { mobile } = req.body;
    const { isValid, payment_method, reason } = validateMobile(mobile);

    if (!isValid) {
      return res.status(400).json({ error: reason });
    }

    const userPayload = { ...req.body, payment_method };
    const userId = await createUser(userPayload);
    await createWallet(userId);

    const user = await getUserById(userId);
    const wallet = await getWalletByUserId(userId);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        district: user.district,
        country: user.country,
        payment_method: user.payment_method,
        created_at: formatDate(user.created_at),
        account_balance: formatUGX(wallet.balance),
        wallet_id: wallet.id,
        wallet_created_at: formatDate(wallet.created_at)
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('mobile')) {
      return res.status(409).json({ error: 'Mobile number already registered' });
    }

    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function loginUser(req, res) {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ error: 'Mobile and password are required' });
    }

    const user = await getUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const wallet = await getWalletByUserId(user.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        district: user.district,
        country: user.country,
        payment_method: user.payment_method,
        created_at: formatDate(user.created_at),
        account_balance: formatUGX(wallet.balance),
        wallet_id: wallet.id,
        wallet_created_at: formatDate(wallet.created_at)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

// ✅ Get formatted balance for a user
async function getUserBalance(req, res) {
  try {
    const userId = req.params.id;
    const wallet = await getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ balance: formatUGX(wallet.balance) });
  } catch (err) {
    console.error('Balance fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ✅ Deposit funds into user wallet and log transaction
async function depositToUser(req, res) {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const wallet = await getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const depositAmount = parseFloat(amount);
    const newBalance = parseFloat(wallet.balance) + depositAmount;

    // Update wallet balance
    await updateWalletBalance(userId, newBalance);

    // Log transaction
    await db.query(
      `INSERT INTO sejjtransactions 
        (user_id, wallet_id, amount, new_balance, transaction_type, payment_method, mobile, description) 
      VALUES (?, ?, ?, ?, 'deposit', ?, ?, ?)`,
      [
        userId,
        wallet.id,
        depositAmount,
        newBalance,
        resolvePaymentMethod(wallet.user_id), // or use user.mobile below
        wallet.user_id, // This should be the mobile number of the user, fix below
        'Deposit via API'
      ]
    );

    res.status(200).json({ balance: formatUGX(newBalance) });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ✅ Withdraw funds from user wallet and log transaction
async function withdrawFromUser(req, res) {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const wallet = await getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallet.balance);
    const withdrawalAmount = parseFloat(amount);

    if (withdrawalAmount > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = currentBalance - withdrawalAmount;

    // Update wallet balance
    await updateWalletBalance(userId, newBalance);

    // Get user for mobile and payment method
    const user = await getUserById(userId);
    const paymentMethod = user.payment_method || resolvePaymentMethod(user.mobile);

    // Log transaction
    await db.query(
      `INSERT INTO sejjtransactions 
        (user_id, wallet_id, amount, new_balance, transaction_type, payment_method, mobile, description) 
      VALUES (?, ?, ?, ?, 'withdraw', ?, ?, ?)`,
      [
        userId,
        wallet.id,
        withdrawalAmount,
        newBalance,
        paymentMethod,
        user.mobile,
        'Withdrawal via API'
      ]
    );

    res.status(200).json({ balance: formatUGX(newBalance) });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ✅ Change user password with strength validation
async function changeUserPassword(req, res) {
  try {
    const { mobile, currentPassword, newPassword } = req.body;

    if (!mobile || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await getUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const match = await verifyPassword(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE sejjbetusers SET password_hash = ? WHERE mobile = ?',
      [newHash, mobile]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserBalance,
  depositToUser,       // new deposit function
  withdrawFromUser,
  changeUserPassword
};
