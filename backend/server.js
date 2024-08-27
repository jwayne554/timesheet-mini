const express = require('express');
const mongoose = require('mongoose');
const Admin = require('./models/AdminT'); // Adjust path if necessary
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const app = express();
const timesheetRoutes = require('./routes/timesheet');
const authRoutes = require('./routes/auth');
const PORT = process.env.PORT || 5001;
const jwtSecret = process.env.JWT_SECRET;
console.log('JWT Secret:', jwtSecret); // Temporary for debugging
const adminRoutes = require('./routes/admin');

app.use('/api/admin', adminRoutes);
// Enhanced CORS configuration
app.use(cors({
  origin: ['https://jwayne554.github.io', 'https://web.telegram.org'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  const createDefaultAdmin = async () => {
    try {
      const existingAdmin = await Admin.findOne({ username: 'admin' });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('password', 10);
        const admin = new Admin({ username: 'admin', password: hashedPassword });
        await admin.save();
        console.log('Default admin user created: admin');
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  };
  createDefaultAdmin(); // Call the function when the server starts

// Apply verifyToken middleware to protected routes
app.use('/api/timesheet', verifyToken, timesheetRoutes);
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Telegram Timesheet App API');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
  });
    

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${server.address().port}`);
});

// Handle server shutdown
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

// Export app for testing purposes
module.exports = app;