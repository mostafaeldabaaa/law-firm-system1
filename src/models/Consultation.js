const mongoose = require('mongoose');

/**
 * Legal Consultation request.
 *
 * Lets a client request advice from the firm — either a general
 * request (routed to whichever lawyer/secretary picks it up) or
 * addressed to a specific lawyer. This is intentionally a lighter-
 * weight flow than a Case: a consultation does NOT automatically
 * become a case. Staff can optionally convert one into a real Case
 * later (see consultationController.convertToCase) once it's clear
 * representation is actually needed.
 */
const CONSULTATION_STATUSES = [
  'pending', // submitted, not yet picked up by a lawyer
  'in_progress', // a lawyer is actively responding
  'answered', // lawyer has provided a response
  'closed', // resolved / no further action needed
  'converted_to_case', // escalated into a full Case
];

const consultationMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['client', 'lawyer', 'staff'], required: true },
    text: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);

const consultationSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    requestedBy: {
      // The User who submitted the request (usually the client's own
      // portal account, but staff can log a consultation on a client's
      // behalf for phone/walk-in requests).
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Consultation subject is required'],
      trim: true,
    },
    category: {
      type: String,
      // e.g. 'Commercial', 'Family', 'Labor', 'Real Estate', 'Criminal', 'Other'
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Consultation description is required'],
      trim: true,
      maxlength: 4000,
    },
    // If the client requested a specific lawyer; null means "any
    // available lawyer" and it sits in a general queue for staff to assign.
    preferredLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      default: null,
    },
    assignedLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      default: null,
    },
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      default: 'pending',
    },
    messages: [consultationMessageSchema],
    convertedToCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

consultationSchema.index({ client: 1 });
consultationSchema.index({ assignedLawyer: 1, status: 1 });
consultationSchema.index({ status: 1 });

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = { Consultation, CONSULTATION_STATUSES };
