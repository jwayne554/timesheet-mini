const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const jwt = require('jsonwebtoken');
const { validateTimeEntry, validatePayment, handleValidationErrors } = require('../middleware/validators');
const Payment = require('../models/Payment');

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(500).json({ message: 'Failed to authenticate token' });
      req.userId = decoded.id;
      req.userRole = decoded.role;
      next();
    });
  }
  // Middleware to check if user is a manager
function isManager(req, res, next) {
    if (req.userRole !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Manager role required.' });
    }
    next();
  }
  // Update the ensureUser middleware
async function ensureUser(req, res, next) {
    const { telegramId, firstName, lastName } = req.body;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({ telegramId, firstName, lastName });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: 86400 }); // 24 hours
    req.user = user;
    req.token = token;
    next();
  }
// Middleware to check if user exists, create if not
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
// Add a new route to set user role (for demonstration purposes)
router.post('/set-role', async (req, res) => {
    const { telegramId, role } = req.body;
    if (!['employee', 'manager'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findOneAndUpdate({ telegramId }, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Role updated successfully', user });
  });
  
// Clock In
router.post('/clock-in', validateTimeEntry, handleValidationErrors, verifyToken, async (req, res) => {
    try {
    const timeEntry = new TimeEntry({
      user: req.user._id,
      clockIn: new Date(),
    });
    await timeEntry.save();
    res.status(201).json({ message: 'Clocked in successfully', timeEntry });
  } catch (error) {
    res.status(500).json({ message: 'Error clocking in', error: error.message });
  }
});

// Clock Out
router.post('/clock-out', validateTimeEntry, handleValidationErrors, verifyToken, async (req, res) => {
    try {
    const lastEntry = await TimeEntry.findOne({ user: req.user._id, clockOut: null }).sort('-clockIn');
    if (!lastEntry) {
      return res.status(400).json({ message: 'No active clock-in found' });
    }
    lastEntry.clockOut = new Date();
    lastEntry.duration = (lastEntry.clockOut - lastEntry.clockIn) / 1000 / 60; // Duration in minutes
    await lastEntry.save();
    res.json({ message: 'Clocked out successfully', timeEntry: lastEntry });
  } catch (error) {
    res.status(500).json({ message: 'Error clocking out', error: error.message });
  }
});
// Authentication route
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
      res.status(500).json({ message: 'Error during authentication', error: error.message });
    }
  });
// Get all pending time entries (for managers)
router.get('/pending-entries', verifyToken, isManager, async (req, res) => {
    try {
      const pendingEntries = await TimeEntry.find({ status: 'pending' }).populate('user', 'firstName lastName');
      res.json(pendingEntries);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching pending entries', error: error.message });
    }
  });
  
  // Approve or reject a time entry (for managers)
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
      res.status(500).json({ message: 'Error updating time entry', error: error.message });
    }
  });
// Process payment for a time entry
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
      res.status(500).json({ message: 'Error processing payment', error: error.message });
    }
  });
module.exports = router;