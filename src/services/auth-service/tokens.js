import jwt from "jsonwebtoken";
import RefreshToken from "../../models/RefreshToken.js";
import { getUserById } from "./db.js";
import { hashValue, randomId } from "./crypto.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, mobile: user.mobile },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

async function issueRefreshToken(user) {
  const jti = randomId();
  const token = jwt.sign({ sub: user.id, role: user.role, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  const { exp } = jwt.decode(token);
  await RefreshToken.create({
    user_id: user.id,
    jti,
    token_hash: hashValue(token),
    expires_at: new Date(exp * 1000),
  });

  return token;
}

export async function issueTokenPair(user) {
  const [accessToken, refreshToken] = [signAccessToken(user), await issueRefreshToken(user)];
  return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: ACCESS_EXPIRES_IN };
}

// Rotation: the old refresh token is revoked and a brand new access+refresh
// pair is issued. A refresh token can only ever be redeemed once.
export async function rotateRefreshToken(oldToken) {
  let payload;
  try {
    payload = jwt.verify(oldToken, REFRESH_SECRET);
  } catch {
    throw new AuthError(401, "Invalid or expired refresh token");
  }

  const record = await RefreshToken.findOne({ jti: payload.jti, user_id: payload.sub });

  if (!record || record.revoked || hashValue(oldToken) !== record.token_hash || record.expires_at < new Date()) {
    throw new AuthError(401, "Refresh token is no longer valid. Please sign in again.");
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    throw new AuthError(401, "Account no longer exists");
  }

  record.revoked = true;
  await record.save();

  return issueTokenPair(user);
}

export async function revokeRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET);
  } catch {
    return;
  }

  await RefreshToken.updateOne({ jti: payload.jti, user_id: payload.sub }, { revoked: true });
}
