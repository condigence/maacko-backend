import { Schema, model } from "mongoose";

const paymentOrderItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const paymentOrderSchema = new Schema(
  {
    order_id: { type: String, required: true, unique: true },
    items: { type: [paymentOrderItemSchema], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    receipt: { type: String },
    status: { type: String, enum: ["created", "paid", "payment_failed"], default: "created" },
    payment_id: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const PaymentOrder = model("PaymentOrder", paymentOrderSchema);
export default PaymentOrder;
