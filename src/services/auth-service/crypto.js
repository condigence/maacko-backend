import crypto from "node:crypto";

export function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return crypto.randomInt(min, max).toString();
}

export function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}
