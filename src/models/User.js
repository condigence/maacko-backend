import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ["customer", "vendor", "admin"], default: "customer" },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = model("User", userSchema);
export default User;
