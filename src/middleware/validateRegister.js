import { z } from 'zod';

// ---- reusable sub-schemas ----
const addressSchema = z.object({
  line1: z.string().trim().min(1, 'line1 is required'),
  city: z.string().trim().min(1, 'city is required'),
  state: z.string().trim().min(1, 'state is required'),
  pincode: z.string().trim().min(1, 'pincode is required'),
  country: z.string().trim().optional()
});

const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(1, 'accountHolderName is required'),
  accountNumber: z.string().trim().min(1, 'accountNumber is required'),
  ifscCode: z.string().trim().min(1, 'ifscCode is required'),
  bankName: z.string().trim().min(1, 'bankName is required')
});

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Enter a valid PAN number');

const gstSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z0-9]{13}$/i, 'Enter a valid GST number');

// ---- shared base fields (auth is OTP-based — no password) ----
const baseFields = {
  role: z.enum(['customer', 'vendor', 'admin'], {
    errorMap: () => ({ message: 'role must be one of: customer, vendor, admin' })
  }),
  name: z.string().trim().min(2, 'name is required'),
  email: z.string().email('Enter a valid email').optional(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone must be a valid 10-digit number')
    .optional(),
  photo: z.string().url('photo must be a valid URL').nullable().optional()
};

// require at least one of email / phone
const withEmailOrPhone = (schema) =>
  schema.superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Either email or phone is required' });
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Either email or phone is required' });
    }
  });
// CUSTOMER — address NOT required at registration
const customerSchema0 = z.object({ ...baseFields, address: addressSchema.optional() });

// VENDOR — everything required except photo
const vendorSchema0 = z.object({ ...baseFields, storeAddress: addressSchema, pan: panSchema, gst: gstSchema, bankDetails: bankDetailsSchema });

// ADMIN — everything required, both addresses
const adminSchema0 = z.object({ ...baseFields, pan: panSchema, bankDetails: bankDetailsSchema, permanentAddress: addressSchema, temporaryAddress: addressSchema });


const validateRegister = (req, res, next) => {
  const { role } = req.body || {};

  if (!role || !schemaMap[role]) {
    return res.status(400).json({ success: false, message: `role must be one of: ${Object.keys(schemaMap).join(', ')}` });
  }

  const result = schemaMap[role].safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));

    const seen = new Set();
    const uniqueErrors = errors.filter((e) => {
      const key = `${e.field}:${e.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      missingOrInvalidFields: [...new Set(uniqueErrors.map((e) => e.field))],
      errors: uniqueErrors
    });
  }

  req.body = result.data;
  next();
};

// exported so PATCH/PUT validators can reuse the same field definitions
export const rawSchemaMap = {
  customer: customerSchema0,
  vendor: vendorSchema0,
  admin: adminSchema0
};

const schemaMap = {
  customer: withEmailOrPhone(customerSchema0),
  vendor: withEmailOrPhone(vendorSchema0),
  admin: withEmailOrPhone(adminSchema0)
};

export default validateRegister;