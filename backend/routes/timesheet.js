const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const jwt = require('jsonwebtoken');
const { validateTimeEntry, validatePayment, handleValidationErrors } = require('../middleware/validators');
const Payment = require('../models/Payment');

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) return res.status(403).json({ message: 'No token provided' });
  
  const bearer = bearerHeader.split(' ');
  const token = bearer[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ message: 'Failed to authenticate token' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
}

function isManager(req, res, next) {
  if (req.userRole !== 'manager') {
    return res.status(403).json({ message: 'Access denied. Manager role required.' });
  }
  next();
}

async function ensureUser(req, res, next) {
  const { telegramId, firstName, lastName } = req.body;
  let user = await User.findOne({ telegramId });
  if (!user) {
    user = new User({ telegramId, firstName, lastName });
    await user.save();
  }
  req.user = user;
  next();
}

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

router.post('/clock-in', verifyToken, validateTimeEntry, handleValidationErrors, async (req, res) => {
  try {
    const { telegramId, firstName, lastName } = req.body;

    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({ telegramId, firstName, lastName });
      await user.save();
    }

    const existingEntry = await TimeEntry.findOne({ user: user._id, clockOut: null });
    if (existingEntry) {
      return res.status(400).json({ message: 'You are already clocked in' });
    }

    const timeEntry = new TimeEntry({
      user: user._id,
      clockIn: new Date(),
    });
    await timeEntry.save();

    res.status(201).json({ message: 'Clocked in successfully', timeEntry });
  } catch (error) {
    console.error('Clock-in error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/clock-out', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const timeEntry = await TimeEntry.findOne({ user: user._id, clockOut: null });
    if (!timeEntry) {
      return res.status(400).json({ message: 'No active clock-in found' });
    }

    timeEntry.clockOut = new Date();
    timeEntry.duration = (timeEntry.clockOut - timeEntry.clockIn) / 1000; // Duration in seconds
    await timeEntry.save();

    res.json({ message: 'Clocked out successfully', timeEntry });
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/pending-entries', verifyToken, isManager, async (req, res) => {
  try {
    const pendingEntries = await TimeEntry.find({ status: 'pending' }).populate('user', 'firstName lastName');
    res.json(pendingEntries);
  } catch (error) {
    console.error('Error fetching pending entries:', error);
    res.status(500).json({ message: 'Error fetching pending entries', error: error.message });
  }
});

router.post('/review-entry', verifyToken, isManager, async (req, res) => {
  const { entryId, status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const updatedEntry = await TimeEntry.findByIdAndUpdate(entryId, { status }, { new: true });
    if (!updatedEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    res.json({ message: 'Time entry updated successfully', entry: updatedEntry });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ message: 'Error updating time entry', error: error.message });
  }
});

router.post('/process-payment', verifyToken, isManager, validatePayment, handleValidationErrors, async (req, res) => {
  const { entryId, amount } = req.body;
  try {
    const timeEntry = await TimeEntry.findById(entryId);
    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    if (timeEntry.status !== 'approved') {
      return res.status(400).json({ message: 'Cannot process payment for unapproved time entry' });
    }
    const payment = new Payment({
      timeEntry: entryId,
      amount,
    });
    await payment.save();
    timeEntry.status = 'paid';
    await timeEntry.save();
    res.json({ message: 'Payment processed successfully', payment });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
});

module.exports = router;