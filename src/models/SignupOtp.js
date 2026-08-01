import { Schema, model } from "mongoose";

// One record per signup attempt. Both the email OTP and mobile OTP live on
// the same document so verification can require both at once, tied to the
// exact (email, mobile) pair they were issued for - no mixing OTPs across
// different signup attempts.
const signupOtpSchema = new Schema(
  {
    role: { type: String, enum: ["customer", "vendor", "admin"], required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email_otp_hash: { type: String, required: true },
    mobile_otp_hash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expires_at: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// Auto-purge once expired so this collection doesn't grow unbounded.
signupOtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const SignupOtp = model("SignupOtp", signupOtpSchema);
export default SignupOtp;
