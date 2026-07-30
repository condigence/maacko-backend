import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: null },
    role_id: { type: Number, default: 1 },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = model("User", userSchema);
export default User;
