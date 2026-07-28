import { Schema, model } from "mongoose";

const orderItemSchema = new Schema(
  {
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    user_id: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    shipping_address: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    total_amount: { type: Number, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Order = model("Order", orderSchema);
export default Order;
