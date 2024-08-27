const mongoose = require('mongoose');
const Admin = require('./models/Admin'); // Adjust path if necessary
const bcrypt = require('bcrypt');

mongoose.connect('your_mongodb_connection_string', { useNewUrlParser: true, useUnifiedTopology: true });

const createAdmin = async () => {
  const username = 'admin';
  const password = 'password';
  const existingAdmin = await Admin.findOne({ username });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    console.log('Admin user created successfully');
  } else {
    console.log('Admin user already exists');
  }

  mongoose.connection.close();
};

createAdmin();
