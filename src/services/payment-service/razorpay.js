import crypto from "node:crypto";
import Razorpay from "razorpay";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. Payment service cannot start.");
  process.exit(1);
}

export const RAZORPAY_KEY_ID = KEY_ID;

export const razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

// Standard Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
// Compared with crypto.timingSafeEqual so response time can't leak how much of the signature matched.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(String(signature || ""), "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
