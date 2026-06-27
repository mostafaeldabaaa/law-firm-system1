const mongoose = require('mongoose');

/**
 * Client profile. A client may optionally have a linked User account
 * (role: 'client') for portal access, or exist purely as a record
 * managed by staff (e.g. a client who never logs in themselves).
 */
const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['individual', 'company'],
      default: 'individual',
    },
    fullName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    nationalId: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
    assignedLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      default: null,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

clientSchema.index({ fullName: 'text', companyName: 'text', email: 'text' });
clientSchema.index({ assignedLawyer: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
