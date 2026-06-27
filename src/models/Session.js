const mongoose = require('mongoose');

/**
 * Court / client session tied to a case.
 * Conflict detection (ensuring a lawyer isn't double-booked) is enforced
 * in services/sessionService.js at creation/reschedule time — the schema
 * itself only models the data shape, not the business rule.
 */
const sessionSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    type: {
      type: String,
      enum: ['court_hearing', 'client_meeting', 'internal_review', 'mediation'],
      default: 'court_hearing',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Session start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'Session end time is required'],
    },
    lawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      required: true,
    },
    attendees: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String }, // e.g. 'lawyer', 'client', 'witness'
        attended: { type: Boolean, default: null }, // null = not yet known
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    // Tracks which proactive reminder lead-times (in hours before
    // startTime) have already been sent, so jobs/deadlineReminder.js
    // never notifies the lawyer twice for the same threshold.
    remindersSent: {
      type: [Number],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ lawyer: 1, startTime: 1 });
sessionSchema.index({ case: 1 });
sessionSchema.index({ status: 1 });

// Schema-level guard: end must be after start
sessionSchema.pre('validate', function validateTimes(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    return next(new Error('Session end time must be after start time.'));
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
