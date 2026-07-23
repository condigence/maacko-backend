import { getState, save } from "./store.js";
import { hashValue, randomOtp } from "./crypto.js";

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_MINUTES = Number(process.env.OTP_EXPIRES_IN_MINUTES || 5);
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 30);
const MAX_ATTEMPTS = 5;

export class OtpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requestOtp(role, identifier) {
  const state = getState();
  const previous = state.otpCodes.filter((o) => o.role === role && o.identifier === identifier);
  const last = previous[previous.length - 1];

  if (last) {
    const secondsSinceLast = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      throw new OtpError(429, `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another OTP`);
    }
  }

  const otp = randomOtp(OTP_LENGTH);
  state.otpCodes.push({
    id: state.nextOtpId++,
    role,
    identifier,
    otp_hash: hashValue(otp),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
    attempts: 0,
    consumed: 0,
    created_at: new Date().toISOString(),
  });
  await save();

  console.log(`[auth-service] OTP for ${role}:${identifier} -> ${otp} (expires in ${OTP_TTL_MINUTES}m)`);

  return { otp, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyOtp(role, identifier, otp) {
  const state = getState();
  const candidates = state.otpCodes.filter((o) => o.role === role && o.identifier === identifier && !o.consumed);
  const record = candidates[candidates.length - 1];

  if (!record) {
    throw new OtpError(400, "No OTP requested for this identifier. Please request a new OTP.");
  }

  if (new Date(record.expires_at) < new Date()) {
    throw new OtpError(400, "OTP has expired. Please request a new one.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.consumed = 1;
    await save();
    throw new OtpError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  if (hashValue(otp) !== record.otp_hash) {
    record.attempts += 1;
    await save();
    throw new OtpError(401, "Incorrect OTP.");
  }

  record.consumed = 1;
  await save();
}
