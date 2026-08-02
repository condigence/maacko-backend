import { rawSchemaMap } from './validateRegister.js';

const formatZodError = (error) => {
  const errors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
  const seen = new Set();
  const unique = errors.filter((e) => {
    const key = `${e.field}:${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    missingOrInvalidFields: [...new Set(unique.map((e) => e.field))],
    errors: unique
  };
};

// role can't be changed via update — always strip it from the schema
const withoutRole = (schema) => schema.omit({ role: true });

/**
 * PATCH — every field optional. Only fields present in the body get validated.
 * `role` comes from the EXISTING user record (found by :id), not the request body.
 */
export const validatePatchBody = (role, body) => {
  const base = rawSchemaMap[role];
  if (!base) {
    return { success: false, missingOrInvalidFields: [], errors: [{ field: 'role', message: `Unknown role: ${role}` }] };
  }

  const result = withoutRole(base).partial().safeParse(body || {});
  if (!result.success) {
    return { success: false, ...formatZodError(result.error) };
  }
  return { success: true, data: result.data };
};

/**
 * PUT — full replace. Same required fields as registration for that role, minus `role`.
 * Still enforces "at least one of email/phone" since that's a standing business rule,
 * not just a registration-time check.
 */
export const validatePutBody = (role, body) => {
  const base = rawSchemaMap[role];
  if (!base) {
    return { success: false, missingOrInvalidFields: [], errors: [{ field: 'role', message: `Unknown role: ${role}` }] };
  }

  const result = withoutRole(base).safeParse(body || {});
  if (!result.success) {
    return { success: false, ...formatZodError(result.error) };
  }

  if (!result.data.email && !result.data.phone) {
    return {
      success: false,
      missingOrInvalidFields: ['email', 'phone'],
      errors: [
        { field: 'email', message: 'Either email or phone is required' },
        { field: 'phone', message: 'Either email or phone is required' }
      ]
    };
  }

  return { success: true, data: result.data };
};