import { Router } from "express";
import { findOrCreateAccount, markAccountVerified } from "./db.js";
import { requestOtp, verifyOtp, OtpError } from "./otp.js";
import { issueTokenPair } from "./tokens.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^(?:\+?91)?[6-9]\d{9}$/;

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function isValidIdentifier(identifier) {
  return EMAIL_REGEX.test(identifier) || MOBILE_REGEX.test(identifier);
}

// Builds the OTP request/verify pair for a given role (customer/vendor/admin).
// Which URL the frontend hits decides which role gets minted into the tokens.
export function buildAuthRouter(role) {
  const router = Router();

  router.post("/otp/request", async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);

    if (!identifier || !isValidIdentifier(identifier)) {
      return res.status(400).json({ error: "A valid email or mobile number is required" });
    }

    try {
      const { otp, expiresInMinutes } = await requestOtp(role, identifier);
      const response = { message: `OTP sent to ${identifier}`, role, expiresInMinutes };

      if (process.env.NODE_ENV !== "production") {
        response.devOtp = otp;
      }

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof OtpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("OTP request failed", error);
      res.status(500).json({ error: "Failed to generate OTP" });
    }
  });

  router.post("/otp/verify", async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const otp = String(req.body?.otp || "").trim();

    if (!identifier || !otp) {
      return res.status(400).json({ error: "identifier and otp are required" });
    }

    try {
      await verifyOtp(role, identifier, otp);
      const account = await findOrCreateAccount(role, identifier);
      await markAccountVerified(account.id);

      const tokens = await issueTokenPair({ id: account.id, role, identifier });
      res.status(200).json({
        message: "Login successful",
        account: { id: account.id, role, identifier },
        ...tokens,
      });
    } catch (error) {
      if (error instanceof OtpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("OTP verify failed", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  return router;
}
