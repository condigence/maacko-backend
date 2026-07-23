import jwt from "jsonwebtoken";
import { getState, save } from "./store.js";
import { getAccountById } from "./db.js";
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

function signAccessToken(account) {
  return jwt.sign({ sub: account.id, role: account.role, identifier: account.identifier }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

async function issueRefreshToken(account) {
  const jti = randomId();
  const token = jwt.sign({ sub: account.id, role: account.role, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  const { exp } = jwt.decode(token);
  const state = getState();
  state.refreshTokens.push({
    id: state.nextRefreshId++,
    account_id: account.id,
    jti,
    token_hash: hashValue(token),
    expires_at: new Date(exp * 1000).toISOString(),
    revoked: 0,
    created_at: new Date().toISOString(),
  });
  await save();

  return token;
}

export async function issueTokenPair(account) {
  const [accessToken, refreshToken] = [signAccessToken(account), await issueRefreshToken(account)];
  return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: ACCESS_EXPIRES_IN };
}

export async function rotateRefreshToken(oldToken) {
  let payload;
  try {
    payload = jwt.verify(oldToken, REFRESH_SECRET);
  } catch {
    throw new AuthError(401, "Invalid or expired refresh token");
  }

  const state = getState();
  const record = state.refreshTokens.find((r) => r.jti === payload.jti && r.account_id === payload.sub);

  if (!record || record.revoked || hashValue(oldToken) !== record.token_hash || new Date(record.expires_at) < new Date()) {
    throw new AuthError(401, "Refresh token is no longer valid. Please log in again.");
  }

  const account = await getAccountById(payload.sub);
  if (!account) {
    throw new AuthError(401, "Account no longer exists");
  }

  record.revoked = 1;
  await save();

  return issueTokenPair(account);
}

export async function revokeRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET);
  } catch {
    return;
  }

  const record = getState().refreshTokens.find((r) => r.jti === payload.jti && r.account_id === payload.sub);
  if (record) {
    record.revoked = 1;
    await save();
  }
}
