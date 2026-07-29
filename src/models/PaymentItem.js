import { Schema, model } from "mongoose";

// item_id is the stable public identifier used in API responses/requests
// (e.g. "item_bgauss_c12i") - kept distinct from Mongo's own _id.
const paymentItemSchema = new Schema({
  item_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const PaymentItem = model("PaymentItem", paymentItemSchema);
export default PaymentItem;
