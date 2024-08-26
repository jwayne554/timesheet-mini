const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/authenticate', async (req, res) => {
  try {
    const { telegramId, firstName, lastName } = req.body;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({ telegramId, firstName, lastName });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Error during authentication', error: error.message });
  }
});

router.post('/refresh-token', (req, res) => {
    const token = req.cookies.token; // Assuming the token is stored in a cookie named 'token'
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const newToken = jwt.sign({ id: decoded.id, role: decoded.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', newToken, { httpOnly: true, secure: true }); // Set the new token as an HTTP-only cookie
      res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  });

module.exports = router;