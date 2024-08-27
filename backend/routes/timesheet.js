const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const Payment = require('../models/Payment');
const { validateTimeEntry, validatePayment, handleValidationErrors } = require('../middleware/validators');

// Middleware to check if user is a manager
function isManager(req, res, next) {
  if (req.userRole !== 'manager') {
    return res.status(403).json({ message: 'Access denied. Manager role required.' });
  }
  next();
}

// Clock In
router.post('/clock-in', async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
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
  
  // Clock Out
  router.post('/clock-out', async (req, res) => {
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

// Get Pending Entries (Manager Only)
router.get('/pending-entries', isManager, async (req, res) => {
  try {
    const pendingEntries = await TimeEntry.find({ status: 'pending' }).populate('user', 'firstName lastName');
    res.json(pendingEntries);
  } catch (error) {
    console.error('Error fetching pending entries:', error);
    res.status(500).json({ message: 'Error fetching pending entries', error: error.message });
  }
});

// Review Time Entry (Manager Only)
router.post('/review-entry', isManager, async (req, res) => {
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

// Process Payment (Manager Only)
router.post('/process-payment', isManager, validatePayment, handleValidationErrors, async (req, res) => {
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

// Get User's Time Entries
router.get('/my-entries', async (req, res) => {
  try {
    const entries = await TimeEntry.find({ user: req.userId }).sort({ clockIn: -1 });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching user entries:', error);
    res.status(500).json({ message: 'Error fetching time entries', error: error.message });
  }
});

// Get User's Total Hours
router.get('/total-hours', async (req, res) => {
  try {
    const entries = await TimeEntry.find({ user: req.userId, status: 'approved' });
    const totalSeconds = entries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const totalHours = totalSeconds / 3600;
    res.json({ totalHours: totalHours.toFixed(2) });
  } catch (error) {
    console.error('Error calculating total hours:', error);
    res.status(500).json({ message: 'Error calculating total hours', error: error.message });
  }
});

module.exports = router;