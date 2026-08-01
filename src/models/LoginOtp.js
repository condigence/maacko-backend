import { Schema, model } from "mongoose";

// One record per login OTP request, tied to the specific User resolved at
// request time (role+identifier already matched to that user before the
// OTP was ever generated) so verify doesn't need to re-resolve anything.
const loginOtpSchema = new Schema(
  {
    role: { type: String, enum: ["customer", "vendor", "admin"], required: true },
    identifier: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    otp_hash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expires_at: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// Auto-purge once expired so this collection doesn't grow unbounded.
loginOtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const LoginOtp = model("LoginOtp", loginOtpSchema);
export default LoginOtp;
