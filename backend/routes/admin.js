const express = require('express');
const router = express.Router();
const Admin = require('../models/AdminT');
const TimeEntry = require('../models/TimeEntry');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin login
router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
      }
    });
        

// Get all timesheets
router.get('/timesheets', async (req, res) => {
    try {
      const timesheets = await TimeEntry.find().populate('user', 'firstName lastName');
      res.json(timesheets);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update timesheet status
  router.put('/timesheet/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const timesheet = await TimeEntry.findByIdAndUpdate(id, { status }, { new: true });
      res.json(timesheet);
    } catch (error) {
      console.error('Error updating timesheet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;