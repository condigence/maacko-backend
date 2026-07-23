import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// No real DB for this service yet — orders are persisted to a flat JSON file
// so an order placed in one request is still there (and marked paid) on the next.
export async function loadItemCatalog() {
  const raw = await readFile(ITEMS_FILE, "utf8");
  return JSON.parse(raw);
}

async function readOrders() {
  try {
    const raw = await readFile(ORDERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOrders(orders) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function saveOrder(order) {
  const orders = await readOrders();
  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function findOrder(orderId) {
  const orders = await readOrders();
  return orders.find((order) => order.orderId === orderId) || null;
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.orderId === orderId);
  if (index === -1) return null;

  orders[index] = { ...orders[index], ...extra, status, updatedAt: new Date().toISOString() };
  await writeOrders(orders);
  return orders[index];
}

export async function listOrders() {
  return readOrders();
}
