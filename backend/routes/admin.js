const express = require('express');
const router = express.Router();
const Admin = require('../models/AdminT');
const TimeEntry = require('../models/TimeEntry');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.render('admin-login', { error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render('admin-login', { error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Store the token in a session or cookie
    req.session.adminToken = token;
    
    // Redirect to the dashboard
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin-login', { error: 'Server error' });
  }
});

// In your admin.js routes file
router.get('/dashboard', async (req, res) => {
    try {
      // Check if admin is authenticated
      if (!req.session.adminToken) {
        return res.redirect('/admin');
      }
      
      // Fetch timesheets
      const timesheets = await TimeEntry.find().populate('user', 'firstName lastName');
      
      res.render('admin-dashboard', { timesheets });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('admin-dashboard', { error: 'Error fetching timesheets', timesheets: [] });
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
router.post('/timesheet/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      await TimeEntry.findByIdAndUpdate(id, { status });
      
      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('Timesheet update error:', error);
      res.redirect('/admin/dashboard');
    }
  });

// Add a logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/admin');
    });
  });

module.exports = router;