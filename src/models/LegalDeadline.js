const mongoose = require('mongoose');

/**
 * Legal Deadline / Procedure tracker.
 *
 * Distinct from Session (court hearings/meetings): this models the
 * *procedural clock* of a case — appeal windows, cassation (نقض)
 * deadlines, statute-of-limitations cutoffs, response deadlines, etc.
 * Missing one of these can mean losing a right permanently, which is
 * why they're tracked separately from the general case timeline and
 * surfaced through dedicated proactive reminders (see jobs/deadlineReminder.js).
 */
const DEADLINE_TYPES = [
  'appeal', // استئناف
  'cassation', // طعن بالنقض
  'objection', // اعتراض / تظلم
  'response_deadline', // رد على دعوى/مذكرة
  'statute_of_limitations', // سقوط الحق بالتقادم
  'document_submission', // تقديم مستندات لازمة
  'execution', // تنفيذ حكم
  'other',
];

const DEADLINE_STATUSES = [
  'pending', // still open, not yet due
  'due_soon', // within the reminder window, not yet handled
  'completed', // the procedure was carried out in time
  'missed', // deadline passed without action — serious, flagged for review
  'cancelled', // no longer relevant (e.g. case closed/settled)
];

const legalDeadlineSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    type: {
      type: String,
      enum: DEADLINE_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Deadline title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    // How many days before dueDate to start sending reminders.
    // Legal appeal/cassation windows are short and strict, so this
    // defaults to a wider lead time than a regular task's SLA.
    reminderLeadDays: {
      type: [Number],
      default: [7, 3, 1], // sends a reminder at each of these thresholds
    },
    remindersSent: {
      type: [Number], // tracks which lead-day reminders have already fired, to avoid duplicates
      default: [],
    },
    status: {
      type: String,
      enum: DEADLINE_STATUSES,
      default: 'pending',
    },
    responsibleLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      required: true,
    },
    relatedJudgment: {
      // The judgment/decision this deadline is reacting to, if any
      // (e.g. an appeal deadline triggered by a first-instance ruling).
      court: String,
      decisionDate: Date,
      summary: String,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

legalDeadlineSchema.index({ case: 1 });
legalDeadlineSchema.index({ responsibleLawyer: 1, status: 1 });
legalDeadlineSchema.index({ dueDate: 1, status: 1 });

const LegalDeadline = mongoose.model('LegalDeadline', legalDeadlineSchema);

module.exports = { LegalDeadline, DEADLINE_TYPES, DEADLINE_STATUSES };
