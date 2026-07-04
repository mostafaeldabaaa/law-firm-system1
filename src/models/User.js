const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Roles hierarchy (from highest to lowest privilege).
 * Stored as a flat enum on the user for simplicity; the actual
 * permission matrix lives in config/permissions.js so it can be
 * audited and changed independently of the schema.
 */
const ROLES = [
  'super_admin',
  'branch_manager',
  'senior_lawyer',
  'lawyer',
  'secretary',
  'client',
];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'client',
    },nationalId: {
  type: String,
  trim: true,
  default: null,
  validate: {
    validator: function (v) {
      return v == null || /^\d{14}$/.test(v);
    },
    message: 'الرقم القومي يجب أن يتكون من 14 رقم',
  },
},
    
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: Date,
    // --- Password reset via OTP ---
    // The OTP itself is never stored in plaintext — only its bcrypt
    // hash — exactly like the password field, so a database leak
    // doesn't directly expose valid reset codes either.
    passwordResetOTP: {
      type: String,
      select: false,
      default: undefined,
    },
    passwordResetOTPExpires: {
      type: Date,
      select: false,
      default: undefined,
    },
    // Set once verifyResetOTP succeeds, consumed by resetPassword.
    // Without this gate, anyone who can guess/intercept the *next*
    // request after a correct OTP could reset the password without
    // ever having proven they own the OTP themselves.
    passwordResetVerified: {
      type: Boolean,
      select: false,
      default: false,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
        userAgent: String,
        ip: String,
      },
    ],
    // FCM device/browser registration tokens for push notifications.
    // A user can have multiple (phone + laptop + tablet), so this is a
    // list rather than a single field. Tokens are added via
    // POST /api/v1/users/me/fcm-token and pruned automatically by
    // pushNotificationService when FCM reports them as invalid/expired.
    fcmTokens: [
      {
        token: { type: String, required: true },
        device: { type: String, default: 'unknown' }, // e.g. 'web', 'android', 'ios'
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ branch: 1 });

// Hash password before saving, only if it was modified
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // Skip on creation; only relevant when password changes after the fact
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

// Instance method: compare plaintext password against the hash
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Instance method: was the password changed after a given JWT timestamp?
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  return jwtTimestamp < changedTimestamp;
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.fcmTokens;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
