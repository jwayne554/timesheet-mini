const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  timeEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeEntry', required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
});

module.exports = mongoose.model('Payment', paymentSchema);