import { Router } from "express";
import { requestSignupOtp, verifySignupOtp, OtpError } from "./otp.js";
import { findExistingUser, createUser } from "./db.js";
import { issueTokenPair } from "./tokens.js";
import {
  isValidEmail,
  isValidMobile,
  isValidRole,
  normalizeEmail,
  normalizeMobile,
  ROLES,
} from "./validators.js";

export const signupRouter = Router();

// Step 1: collect name/role/email/mobile, send an OTP to both channels.
// No DB row is created yet - that only happens once both OTPs verify.
signupRouter.post("/signup", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const role = String(req.body?.role || "").trim().toLowerCase();
  const email = normalizeEmail(req.body?.email);
  const mobile = normalizeMobile(req.body?.mobile);

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ error: "A valid 10-digit mobile number is required" });
  }

  try {
    const existing = await findExistingUser(email, mobile);
    if (existing) {
      return res.status(409).json({ error: "An account already exists for this email/mobile. Please log in instead." });
    }

    const { emailOtp, mobileOtp, expiresInMinutes } = await requestSignupOtp({ name, role, email, mobile });
    const response = { message: "OTP sent to email and mobile", email, mobile, expiresInMinutes };

    if (process.env.NODE_ENV !== "production") {
      response.devEmailOtp = emailOtp;
      response.devMobileOtp = mobileOtp;
    }

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof OtpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Signup OTP request failed", error);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

// Step 2: both OTPs must be correct, for the same email+mobile pair, in one call.
// Only now is the user written to the `users` collection and tokens issued.
signupRouter.post("/signup/verify", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const emailOtp = String(req.body?.email_otp ?? "").trim();
  const mobile = normalizeMobile(req.body?.mobile);
  const mobileOtp = String(req.body?.mobile_otp ?? "").trim();

  if (!email || !emailOtp || !mobile || !mobileOtp) {
    return res.status(400).json({ error: "email, email_otp, mobile and mobile_otp are all required" });
  }

  try {
    const record = await verifySignupOtp({ email, emailOtp, mobile, mobileOtp });

    let user;
    try {
      user = await createUser({ name: record.name, role: record.role, email, mobile });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ error: "An account already exists for this email/mobile. Please log in instead." });
      }
      throw error;
    }

    const tokens = await issueTokenPair(user);
    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email,
        mobile: user.mobile,
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof OtpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Signup OTP verify failed", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});
