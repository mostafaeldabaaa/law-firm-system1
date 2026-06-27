const mongoose = require('mongoose');

/**
 * Lawyer profile — extends a User (role: 'lawyer' | 'senior_lawyer' | 'branch_manager')
 * with professional details. Kept as a separate collection (rather than
 * embedding into User) so the User model stays lean and reusable for
 * every role, while lawyer-specific fields don't pollute clients/staff.
 */
const lawyerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    barNumber: {
      type: String,
      required: [true, 'Bar registration number is required'],
      unique: true,
      trim: true,
    },
    specialties: {
      type: [String],
      default: [],
      // e.g. ['Commercial Law', 'Criminal Law', 'Family Law']
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    // Denormalized performance counters, recalculated by a scheduled job
    // (see services/analyticsService.js) for fast dashboard reads.
    performance: {
      casesClosed: { type: Number, default: 0 },
      casesWon: { type: Number, default: 0 },
      casesLost: { type: Number, default: 0 },
      activeCases: { type: Number, default: 0 },
      averageResolutionDays: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 }, // % of sessions attended
      lastCalculatedAt: { type: Date, default: null },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

lawyerSchema.index({ specialties: 1 });

// Virtual: win rate computed on the fly, never stored, to avoid drift
lawyerSchema.virtual('winRate').get(function getWinRate() {
  const decided = this.performance.casesWon + this.performance.casesLost;
  if (decided === 0) return 0;
  return Math.round((this.performance.casesWon / decided) * 100);
});

lawyerSchema.set('toJSON', { virtuals: true });
lawyerSchema.set('toObject', { virtuals: true });

const Lawyer = mongoose.model('Lawyer', lawyerSchema);

module.exports = Lawyer;
