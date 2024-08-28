const express = require('express');
const router = express.Router();
const Admin = require('../models/AdminT');
const TimeEntry = require('../models/TimeEntry');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// Middleware to check if user is a super admin
const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }
  next();
};

// Admin dashboard
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const timesheets = await TimeEntry.find().populate('user', 'firstName lastName');
    const isSuperAdmin = req.user.role === 'superadmin';

    res.render('admin-dashboard', { timesheets, isSuperAdmin });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin-dashboard', { error: 'Error fetching timesheets', timesheets: [], isSuperAdmin: false });
  }
});

// Super Admin: Export all data
router.get('/export', verifyAdminToken, isSuperAdmin, async (req, res) => {
  try {
    const allData = await TimeEntry.find().populate('user', 'firstName lastName telegramId');
    res.json(allData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
});

// Super Admin: Edit timesheet
router.put('/timesheet/:id', verifyAdminToken, isSuperAdmin, async (req, res) => {
  try {
    const updatedTimesheet = await TimeEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTimesheet) return res.status(404).json({ message: 'Timesheet not found' });
    res.json(updatedTimesheet);
  } catch (error) {
    console.error('Edit timesheet error:', error);
    res.status(500).json({ message: 'Error updating timesheet' });
  }
});

// Super Admin: Delete timesheet
router.delete('/timesheet/:id', verifyAdminToken, isSuperAdmin, async (req, res) => {
  try {
    const deletedTimesheet = await TimeEntry.findByIdAndDelete(req.params.id);
    if (!deletedTimesheet) return res.status(404).json({ message: 'Timesheet not found' });
    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Delete timesheet error:', error);
    res.status(500).json({ message: 'Error deleting timesheet' });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: admin._id, role: admin.isSuperAdmin ? 'superadmin' : 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, redirect: '/admin/dashboard' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all timesheets
router.get('/timesheets', verifyAdminToken, async (req, res) => {
  try {
    const timesheets = await TimeEntry.find().populate('user', 'firstName lastName');
    res.json(timesheets);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update timesheet status
router.post('/timesheet/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';

    const updatedTimesheet = await TimeEntry.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedTimesheet) return res.status(404).json({ message: 'Timesheet not found' });
    res.json(updatedTimesheet);
  } catch (error) {
    console.error('Timesheet update error:', error);
    res.status(500).json({ message: 'Error updating timesheet' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;