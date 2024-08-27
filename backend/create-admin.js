require('dotenv').config(); // Make sure this is at the top
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI; // Make sure this is in your .env file

async function createAdminAccount() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const admin = new Admin({
            username: 'admin',
            password: 'password' // Replace with a strong password
        });

        await admin.save();
        console.log('Admin account created successfully');
    } catch (error) {
        console.error('Error creating admin account:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createAdminAccount();