import { Router } from "express";
import Order from "../../models/Order.js";
import { setupSwagger } from "../../../swagger-docs/order/order-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const orderRouter = Router();
setupSwagger(orderRouter);

orderRouter.get("/health", (_req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

// GET /orders — list all orders (admin only)
orderRouter.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const orders = await Order.find({});
    res.json({ service: "order-service", orders });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /orders/:id — get single order
orderRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ service: "order-service", order });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /orders — place a new order
orderRouter.post("/", requireAuth, async (req, res) => {
  const { user_id, items, shipping_address } = req.body;

  if (
    !user_id ||
    !Array.isArray(items) ||
    items.length === 0 ||
    !shipping_address
  ) {
    return res.status(400).json({
      error:
        "user_id, items (non-empty array), and shipping_address are required",
    });
  }

  const total_amount = items.reduce((sum, item) => {
    if (
      !item.product_id ||
      !item.product_name ||
      !item.quantity ||
      item.unit_price == null
    ) {
      return sum;
    }
    return sum + item.quantity * item.unit_price;
  }, 0);

  if (total_amount === 0) {
    return res.status(400).json({
      error:
        "Each item must have product_id, product_name, quantity, and unit_price",
    });
  }

  try {
    const order = await Order.create({
      user_id,
      items,
      shipping_address,
      status: "pending",
      payment_status: "pending",
      total_amount,
    });
    res.status(201).json({ service: "order-service", order });
  } catch (error) {
    console.error("MongoDB insert failed", error.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// PUT /orders/:id/status — update order status (admin/vendor)
orderRouter.put(
  "/:id/status",
  requireAuth,
  requireRole("admin", "vendor"),
  async (req, res) => {
    const { status, payment_status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

    if (status && !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    }
    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return res
        .status(400)
        .json({
          error: `payment_status must be one of: ${validPaymentStatuses.join(", ")}`,
        });
    }
    if (!status && !payment_status) {
      return res
        .status(400)
        .json({
          error: "At least one of status or payment_status is required",
        });
    }

    try {
      const update = {};
      if (status) update.status = status;
      if (payment_status) update.payment_status = payment_status;

      const order = await Order.findByIdAndUpdate(req.params.id, update, {
        returnDocument: "after",
        runValidators: true,
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      res.json({
        service: "order-service",
        message: "Order updated successfully",
        order,
      });
    } catch (error) {
      console.error("MongoDB update failed", error.message);
      res.status(500).json({ error: "Failed to update order" });
    }
  },
);
