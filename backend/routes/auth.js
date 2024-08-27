const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Function to validate Telegram's initData
function validateTelegramWebAppData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  urlParams.sort();

  let dataCheckString = '';
  for (const [key, value] of urlParams.entries()) {
    dataCheckString += `${key}=${value}\n`;
  }
  dataCheckString = dataCheckString.slice(0, -1);

  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN);
  const calculatedHash = crypto
    .createHmac('sha256', secret.digest())
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

router.post('/authenticate', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!validateTelegramWebAppData(initData)) {
      return res.status(401).json({ message: 'Invalid Telegram data' });
    }

    const urlParams = new URLSearchParams(initData);
    const userData = JSON.parse(urlParams.get('user'));

    let user = await User.findOne({ telegramId: userData.id });
    if (!user) {
      user = new User({
        telegramId: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name || '',
        username: userData.username || '',
        role: userData.id === 6120388297 ? 'superadmin' : 'employee'
      });
      await user.save();
    } else if (userData.id === 6120388297 && user.role !== 'superadmin') {
      user.role = 'superadmin';
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Error during authentication' });
  }
});

router.post('/refresh-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, telegramId: decoded.telegramId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;