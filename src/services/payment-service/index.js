import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setupSwagger } from "../../../swagger-docs/payment/payment-swagger.js";
import { paymentRouter } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
setupSwagger(app);
// Serves the standalone Razorpay Standard Checkout demo page at /checkout.html
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PAYMENT_SERVICE_PORT || process.env.PORT || 3004;
const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";

async function ensureGateway() {
  try {
    const response = await fetch(`${gatewayUrl}/health`);
    if (!response.ok) throw new Error("gateway unhealthy");
  } catch (error) {
    console.error("Gateway is not available. Payment service will exit.");
    process.exit(1);
  }
}

app.get("/health", (_req, res) => {
  res.json({ service: "payment-service", status: "ok" });
});

app.use("/payments", paymentRouter);

await ensureGateway();

app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
