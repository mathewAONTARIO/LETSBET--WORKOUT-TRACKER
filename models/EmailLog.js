const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ['verify', 'reset'], required: true },
    sentAt: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

EmailLogSchema.index({ email: 1, type: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', EmailLogSchema);