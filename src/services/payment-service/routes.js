import { Router } from "express";
import { razorpay, RAZORPAY_KEY_ID, verifyPaymentSignature } from "./razorpay.js";
import { loadItemCatalog, saveOrder, findOrder, updateOrderStatus, listOrders } from "./store.js";

const MIN_AMOUNT_PAISE = 100;

export const paymentRouter = Router();

// Lets the Insomnia/demo-checkout client discover valid item ids to order.
paymentRouter.get("/items", async (_req, res) => {
  try {
    const items = await loadItemCatalog();
    res.json({ service: "payment-service", items });
  } catch (error) {
    console.error("Failed to load item catalog", error.message);
    res.status(500).json({ error: "Failed to load item catalog" });
  }
});

paymentRouter.get("/orders", async (_req, res) => {
  const orders = await listOrders();
  res.json({ service: "payment-service", orders });
});

paymentRouter.get("/orders/:orderId", async (req, res) => {
  const order = await findOrder(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json({ service: "payment-service", order });
});

paymentRouter.post("/create-order", async (req, res) => {
  const { items, receipt } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items is required and must be a non-empty array of { id, quantity }" });
  }

  let catalog;
  try {
    catalog = await loadItemCatalog();
  } catch (error) {
    console.error("Failed to load item catalog", error.message);
    return res.status(500).json({ error: "Failed to load item catalog" });
  }
  const catalogById = new Map(catalog.map((item) => [item.id, item]));

  // Price/name always come from the server-side catalog, never from the client,
  // so a tampered request body can't change what actually gets charged.
  const orderItems = [];
  let amountInRupees = 0;

  for (const requested of items) {
    const catalogItem = catalogById.get(requested?.id);
    const quantity = Number(requested?.quantity);

    if (!catalogItem) {
      return res.status(400).json({ error: `Unknown item id: ${requested?.id}` });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: `Invalid quantity for item: ${requested?.id}` });
    }

    amountInRupees += catalogItem.price * quantity;
    orderItems.push({ id: catalogItem.id, name: catalogItem.name, price: catalogItem.price, quantity });
  }

  const amount = Math.round(amountInRupees * 100); // Razorpay amounts are in paise

  if (amount < MIN_AMOUNT_PAISE) {
    return res.status(400).json({ error: `Order amount must be at least ${MIN_AMOUNT_PAISE} paise` });
  }

  const orderReceipt = receipt || `receipt_${Date.now()}`;

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: orderReceipt,
      payment_capture: 1,
    });

    await saveOrder({
      orderId: razorpayOrder.id,
      items: orderItems,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: orderReceipt,
      status: "created",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      service: "payment-service",
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: RAZORPAY_KEY_ID,
      items: orderItems,
    });
  } catch (error) {
    const statusCode = error.statusCode === 401 ? 401 : 500;
    console.error("Razorpay order creation failed", error.error || error.message);
    res.status(statusCode).json({
      error:
        statusCode === 401
          ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET."
          : "Failed to create Razorpay order",
    });
  }
});

paymentRouter.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
    });
  }

  const order = await findOrder(razorpay_order_id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const isValid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    await updateOrderStatus(razorpay_order_id, "payment_failed");
    return res.status(400).json({ success: false, error: "Payment signature verification failed" });
  }

  const updatedOrder = await updateOrderStatus(razorpay_order_id, "paid", {
    paymentId: razorpay_payment_id,
  });

  res.status(200).json({
    success: true,
    message: "Payment verified successfully. Order placed.",
    order: updatedOrder,
  });
});
