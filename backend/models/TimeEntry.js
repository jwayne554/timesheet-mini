const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    duration: { type: Number },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
});

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
