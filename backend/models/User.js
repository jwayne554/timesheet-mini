const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  username: { type: String },
  role: { type: String, enum: ['employee', 'manager', 'admin', 'superadmin'], default: 'employee' },
});


module.exports = mongoose.model('User', userSchema);