import { Schema, model } from "mongoose";

const otpCodeSchema = new Schema(
  {
    role: { type: String, required: true },
    identifier: { type: String, required: true },
    otp_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const OtpCode = model("OtpCode", otpCodeSchema);
export default OtpCode;
