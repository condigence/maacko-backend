export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
export const ROLES = ["customer", "vendor", "admin"];

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Strips a +91/91 country-code prefix (only when the length shows one is
// actually present) so "+919876543210" and "9876543210" resolve to the same
// canonical 10-digit number. A bare 10-digit number that happens to start
// with "91" (e.g. 9123456780) must NOT be mistaken for a prefixed one.
export function normalizeMobile(mobile) {
  const trimmed = String(mobile ?? "").trim().replace(/[\s-]/g, "");

  if (trimmed.startsWith("+91") && trimmed.length === 13) {
    return trimmed.slice(3);
  }
  if (trimmed.startsWith("91") && trimmed.length === 12) {
    return trimmed.slice(2);
  }
  return trimmed;
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

export function isValidMobile(mobile) {
  return MOBILE_REGEX.test(mobile);
}

export function isValidRole(role) {
  return ROLES.includes(role);
}

// Login accepts either an email or a mobile number as a single "identifier" -
// normalize/validate it as whichever shape it looks like.
export function normalizeIdentifier(identifier) {
  const raw = String(identifier ?? "").trim();
  return raw.includes("@") ? normalizeEmail(raw) : normalizeMobile(raw);
}

export function isValidIdentifier(identifier) {
  return isValidEmail(identifier) || isValidMobile(identifier);
}
