import { Router } from "express";
import { findUserByIdentifierAndRole, getUserById } from "./db.js";
import { requestLoginOtp, verifyLoginOtp, OtpError } from "./otp.js";
import { issueTokenPair } from "./tokens.js";
import { isValidIdentifier, isValidRole, normalizeIdentifier, ROLES } from "./validators.js";

export const loginRouter = Router();

function toUserResponse(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    email: user.email,
    mobile: user.mobile,
  };
}

// Step 1: identifier (email or mobile) + role must match an existing user.
// Same error either way (no match at all, or match under a different role)
// so this can't be used to probe whether an email/mobile is registered.
loginRouter.post("/login", async (req, res) => {
  const role = String(req.body?.role || "").trim().toLowerCase();
  const identifier = normalizeIdentifier(req.body?.identifier);

  if (!isValidRole(role)) {
    return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
  }
  if (!identifier || !isValidIdentifier(identifier)) {
    return res.status(400).json({ error: "A valid email or mobile number is required" });
  }

  try {
    const user = await findUserByIdentifierAndRole(identifier, role);
    if (!user) {
      return res.status(404).json({ error: "No account found for this identifier and role" });
    }

    const { otp, expiresInMinutes } = await requestLoginOtp({ role, identifier, userId: user.id });
    const response = { message: `OTP sent to ${identifier}`, role, expiresInMinutes };

    if (process.env.NODE_ENV !== "production") {
      response.devOtp = otp;
    }

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof OtpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Login OTP request failed", error);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

// Step 2: verify the OTP against that same identifier+role, issue tokens.
loginRouter.post("/login/verify", async (req, res) => {
  const role = String(req.body?.role || "").trim().toLowerCase();
  const identifier = normalizeIdentifier(req.body?.identifier);
  const otp = String(req.body?.otp ?? "").trim();

  if (!isValidRole(role)) {
    return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
  }
  if (!identifier || !otp) {
    return res.status(400).json({ error: "identifier and otp are required" });
  }

  try {
    const record = await verifyLoginOtp({ role, identifier, otp });

    const user = await getUserById(record.user_id);
    if (!user) {
      return res.status(404).json({ error: "Account no longer exists" });
    }

    const tokens = await issueTokenPair(user);
    res.status(200).json({
      message: "Login successful",
      user: toUserResponse(user),
      ...tokens,
    });
  } catch (error) {
    if (error instanceof OtpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Login OTP verify failed", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});
