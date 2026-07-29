import { Schema, model } from "mongoose";

const accountSchema = new Schema(
  {
    role: { type: String, enum: ["customer", "vendor", "admin"], required: true },
    identifier: { type: String, required: true },
    name: { type: String, default: null },
    is_verified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

accountSchema.index({ role: 1, identifier: 1 }, { unique: true });

const Account = model("Account", accountSchema);
export default Account;
