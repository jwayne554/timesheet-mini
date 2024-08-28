const express = require('express');
const mongoose = require('mongoose');
const Admin = require('./models/AdminT');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const app = express();
const timesheetRoutes = require('./routes/timesheet');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const session = require('express-session');
const path = require('path');

const PORT = process.env.PORT || 5001;
const jwtSecret = process.env.JWT_SECRET;
console.log('JWT Secret:', jwtSecret); // Temporary for debugging


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors({
  origin: ['https://jwayne554.github.io', 'https://web.telegram.org'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Serve static files
app.use(express.static('public'));

// Admin routes
app.use('/admin', adminRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

// Middleware to verify JWT token
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
      next();
    });
  }
  function verifyAdminToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) return res.status(403).json({ message: 'No token provided' });
  
    const bearer = bearerHeader.split(' ');
    const token = bearer[1];
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Failed to authenticate token' });
      if (decoded.role !== 'admin' && decoded.role !== 'superadmin') return res.status(403).json({ message: 'Not authorized' });
      req.user = decoded;
      next();
    });
  }


app.use('/api/timesheet', verifyToken, timesheetRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Telegram Timesheet App API');
});

app.get('/admin', (req, res) => {
  res.render('admin-login', { error: null });
});

app.get('/admin-dashboard', verifyAdminToken, async (req, res) => {
  try {
      const timesheets = await TimeEntry.find().populate('user', 'firstName lastName');
      const isSuperAdmin = req.user.role === 'superadmin';

      // Log information about the user trying to access the dashboard
      console.log(`Rendering admin dashboard. User ID: ${req.adminId}, Role: ${req.adminRole}`);

      // Render the admin-dashboard.ejs file located in the views directory
      res.render('admin-dashboard', { 
          timesheets, 
          isSuperAdmin 
      });
  } catch (error) {
      console.error('Error rendering admin dashboard:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
  }
});




// Create default admin user
const createDefaultAdmin = async () => {
    try {
      const existingAdmin = await Admin.findOne({ username: 'admin' });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('password', 10);
        const admin = new Admin({ username: 'admin', password: hashedPassword });
        await admin.save();
        console.log('Default admin user created');
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  };
  createDefaultAdmin();

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${server.address().port}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;

