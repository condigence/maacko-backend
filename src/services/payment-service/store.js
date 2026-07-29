import PaymentItem from "../../models/PaymentItem.js";
import PaymentOrder from "../../models/PaymentOrder.js";

export async function loadItemCatalog() {
  const items = await PaymentItem.find({});
  return items.map((item) => ({ id: item.item_id, name: item.name, price: item.price }));
}

function toApiOrder(doc) {
  return {
    orderId: doc.order_id,
    items: doc.items,
    amount: doc.amount,
    currency: doc.currency,
    receipt: doc.receipt,
    status: doc.status,
    paymentId: doc.payment_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export async function saveOrder(order) {
  const doc = await PaymentOrder.create({
    order_id: order.orderId,
    items: order.items,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
  });
  return toApiOrder(doc);
}

export async function findOrder(orderId) {
  const doc = await PaymentOrder.findOne({ order_id: orderId });
  return doc ? toApiOrder(doc) : null;
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const update = { status };
  if (extra.paymentId) update.payment_id = extra.paymentId;

  const doc = await PaymentOrder.findOneAndUpdate({ order_id: orderId }, update, { returnDocument: "after" });
  return doc ? toApiOrder(doc) : null;
}

export async function listOrders() {
  const docs = await PaymentOrder.find({}).sort({ created_at: -1 });
  return docs.map(toApiOrder);
}
