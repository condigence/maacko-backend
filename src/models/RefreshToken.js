import { Schema, model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    account_id: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    jti: { type: String, required: true, unique: true },
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const RefreshToken = model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
