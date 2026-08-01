import SignupOtp from "../../models/SignupOtp.js";
import LoginOtp from "../../models/LoginOtp.js";
import { hashValue, randomOtp } from "./crypto.js";

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_MINUTES = Number(process.env.OTP_EXPIRES_IN_MINUTES || 5);
const MAX_ATTEMPTS = 5;

export class OtpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requestSignupOtp({ name, role, email, mobile }) {
  const emailOtp = randomOtp(OTP_LENGTH);
  const mobileOtp = randomOtp(OTP_LENGTH);

  await SignupOtp.create({
    role,
    name,
    email,
    mobile,
    email_otp_hash: hashValue(emailOtp),
    mobile_otp_hash: hashValue(mobileOtp),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  console.log(`[auth-service] signup email OTP for ${email} -> ${emailOtp} (expires in ${OTP_TTL_MINUTES}m)`);
  console.log(`[auth-service] signup mobile OTP for ${mobile} -> ${mobileOtp} (expires in ${OTP_TTL_MINUTES}m)`);

  return { emailOtp, mobileOtp, expiresInMinutes: OTP_TTL_MINUTES };
}

// Both OTPs must match the SAME pending signup record (same email+mobile
// pair as issued together) - you can't mix an OTP from one attempt with
// another, and both channels must be correct in a single call.
export async function verifySignupOtp({ email, emailOtp, mobile, mobileOtp }) {
  const record = await SignupOtp.findOne({ email, mobile, consumed: false }).sort({ created_at: -1 });

  if (!record) {
    throw new OtpError(400, "No pending signup found for this email/mobile. Please start signup again.");
  }

  if (record.expires_at < new Date()) {
    throw new OtpError(400, "OTP has expired. Please request a new one.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.consumed = true;
    await record.save();
    throw new OtpError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  const emailMatches = hashValue(emailOtp) === record.email_otp_hash;
  const mobileMatches = hashValue(mobileOtp) === record.mobile_otp_hash;

  if (!emailMatches || !mobileMatches) {
    record.attempts += 1;
    await record.save();

    if (!emailMatches && !mobileMatches) {
      throw new OtpError(401, "Incorrect email OTP and mobile OTP.");
    }
    throw new OtpError(401, `Incorrect ${emailMatches ? "mobile" : "email"} OTP.`);
  }

  record.consumed = true;
  await record.save();

  return record;
}

export async function requestLoginOtp({ role, identifier, userId }) {
  const otp = randomOtp(OTP_LENGTH);
  await LoginOtp.create({
    role,
    identifier,
    user_id: userId,
    otp_hash: hashValue(otp),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  console.log(`[auth-service] login OTP for ${role}:${identifier} -> ${otp} (expires in ${OTP_TTL_MINUTES}m)`);

  return { otp, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyLoginOtp({ role, identifier, otp }) {
  const record = await LoginOtp.findOne({ role, identifier, consumed: false }).sort({ created_at: -1 });

  if (!record) {
    throw new OtpError(400, "No OTP requested for this identifier. Please request a new OTP.");
  }

  if (record.expires_at < new Date()) {
    throw new OtpError(400, "OTP has expired. Please request a new one.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.consumed = true;
    await record.save();
    throw new OtpError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  if (hashValue(otp) !== record.otp_hash) {
    record.attempts += 1;
    await record.save();
    throw new OtpError(401, "Incorrect OTP.");
  }

  record.consumed = true;
  await record.save();

  return record;
}
