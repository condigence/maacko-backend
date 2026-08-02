import mongoose from "mongoose";

const { Schema } = mongoose;

const options = {
  discriminatorKey: "role", // this field decides which sub-schema applies
  timestamps: true,
  collection: "users", // all 3 types live in ONE collection, split by `role`
};

const baseUserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    // email/phone are optional at the field level — at least one is
    // enforced below via the pre('validate') hook, and also in validateRegister.js
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Enter a valid 10-digit phone number"],
    },
    photo: {
      type: String, // store URL / file path (upload handled separately)
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    // OTP fields — hashed OTP + expiry, checked in verifyOtp
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
  },
  options,
);

// Backstop: even if something bypasses the request-level (Zod) validator,
// Mongoose itself refuses to save a user with neither email nor phone.
baseUserSchema.pre("validate", function () {
  if (!this.email && !this.phone) {
    this.invalidate("email", "Either email or phone is required");
    this.invalidate("phone", "Either email or phone is required");
  }
});

const User = mongoose.model("User", baseUserSchema);

/**
 * CUSTOMER
 * Address is intentionally NOT required at registration —
 * it's only enforced when the customer proceeds to checkout
 * (that check happens in the order/checkout controller, not here).
 */
const customerSchema = new Schema({
  address: {
    line1: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
});
const Customer = User.discriminator("customer", customerSchema);

/**
 * VENDOR
 */
const vendorSchema = new Schema({
  storeAddress: {
    line1: {
      type: String,
      required: [true, "Store address is required"],
      trim: true,
    },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  pan: {
    type: String,
    required: [true, "PAN is required"],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN number"],
  },
  gst: {
    type: String,
    required: [true, "GST number is required"],
    uppercase: true,
    trim: true,
    match: [/^[0-9]{2}[A-Z0-9]{13}$/, "Enter a valid GST number"],
  },
  bankDetails: {
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, required: true, trim: true },
  },
  isApproved: {
    // vendors usually need admin approval before they can sell
    type: Boolean,
    default: false,
  },
});
const Vendor = User.discriminator("vendor", vendorSchema);

/**
 * ADMIN
 */
const adminSchema = new Schema({
  pan: {
    type: String,
    required: [true, "PAN is required"],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN number"],
  },
  bankDetails: {
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, required: true, trim: true },
  },
  permanentAddress: {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  temporaryAddress: {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
});
const Admin = User.discriminator("admin", adminSchema);

export { User, Customer, Vendor, Admin };
