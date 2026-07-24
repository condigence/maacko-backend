import "dotenv/config";
import express from "express";
import { createRequire } from "node:module";
import { connectMySQL } from "../../db/mysql.js";
import { setupSwagger } from "../../../swagger-docs/order/order-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const require = createRequire(import.meta.url);
const mockOrders = require("../../db/data/mockOrder.json");

const app = express();
app.use(express.json());
setupSwagger(app);

const PORT = process.env.ORDER_SERVICE_PORT || process.env.PORT || 3005;
const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";

async function ensureGateway() {
  try {
    const response = await fetch(`${gatewayUrl}/health`);
    if (!response.ok) throw new Error("gateway unhealthy");
  } catch (error) {
    console.error("Gateway is not available. Order service will exit.");
    process.exit(1);
  }
}

// Returns a connected MySQL connection or null (mock mode / connection failure)
async function tryMySQL() {
  try {
    const conn = await connectMySQL();
    return conn;
  } catch {
    return null;
  }
}

app.get("/health", (_req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

// GET /orders — list all orders (admin only)
app.get("/orders", requireAuth, requireRole("admin"), async (_req, res) => {
  const conn = await tryMySQL();
  if (!conn) {
    return res.json({
      service: "order-service",
      source: "mock",
      orders: mockOrders,
    });
  }
  try {
    const [rows] = await conn.query("SELECT * FROM orders");
    const orders = rows.map((r) => ({
      ...r,
      items: JSON.parse(r.items),
      shipping_address: JSON.parse(r.shipping_address),
    }));
    res.json({ service: "order-service", orders });
  } catch (error) {
    console.error("MySQL query failed", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /orders/:id — get single order
app.get("/orders/:id", requireAuth, async (req, res) => {
  const conn = await tryMySQL();
  if (!conn) {
    const order = mockOrders.find((o) => o._id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.json({ service: "order-service", source: "mock", order });
  }
  try {
    const [rows] = await conn.query("SELECT * FROM orders WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Order not found" });
    const order = {
      ...rows[0],
      items: JSON.parse(rows[0].items),
      shipping_address: JSON.parse(rows[0].shipping_address),
    };
    res.json({ service: "order-service", order });
  } catch (error) {
    console.error("MySQL query failed", error.message);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /orders — place a new order
app.post("/orders", requireAuth, async (req, res) => {
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

  const conn = await tryMySQL();
  if (!conn) {
    const stubOrder = {
      id: `mock_order_${Date.now()}`,
      user_id,
      items,
      shipping_address,
      status: "pending",
      payment_status: "pending",
      total_amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return res
      .status(201)
      .json({ service: "order-service", source: "mock", order: stubOrder });
  }

  try {
    const [result] = await conn.query(
      "INSERT INTO orders (user_id, items, shipping_address, status, payment_status, total_amount) VALUES (?, ?, ?, 'pending', 'pending', ?)",
      [
        user_id,
        JSON.stringify(items),
        JSON.stringify(shipping_address),
        total_amount,
      ],
    );
    res.status(201).json({
      service: "order-service",
      order: {
        id: result.insertId,
        user_id,
        items,
        shipping_address,
        status: "pending",
        payment_status: "pending",
        total_amount,
      },
    });
  } catch (error) {
    console.error("MySQL insert failed", error.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// PUT /orders/:id/status — update order status (admin/vendor)
app.put(
  "/orders/:id/status",
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

    const conn = await tryMySQL();
    if (!conn) {
      return res
        .status(503)
        .json({
          error:
            "Database unavailable — status updates not supported in mock mode",
        });
    }

    try {
      const fields = [];
      const values = [];
      if (status) {
        fields.push("status = ?");
        values.push(status);
      }
      if (payment_status) {
        fields.push("payment_status = ?");
        values.push(payment_status);
      }
      values.push(req.params.id);

      const [result] = await conn.query(
        `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Order not found" });

      const [rows] = await conn.query("SELECT * FROM orders WHERE id = ?", [
        req.params.id,
      ]);
      const order = {
        ...rows[0],
        items: JSON.parse(rows[0].items),
        shipping_address: JSON.parse(rows[0].shipping_address),
      };
      res.json({
        service: "order-service",
        message: "Order updated successfully",
        order,
      });
    } catch (error) {
      console.error("MySQL update failed", error.message);
      res.status(500).json({ error: "Failed to update order" });
    }
  },
);

ensureGateway().then(() => {
  app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
  });
});

export default app;
