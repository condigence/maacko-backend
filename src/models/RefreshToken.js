import { Schema, model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jti: { type: String, required: true, unique: true },
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// Auto-purge once expired so this collection doesn't grow unbounded.
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
