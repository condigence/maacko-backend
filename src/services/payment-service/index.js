import { Router } from "express";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setupSwagger } from "../../../swagger-docs/payment/payment-swagger.js";
import { paymentRouter as paymentRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const paymentRouter = Router();
setupSwagger(paymentRouter);
// Serves the standalone Razorpay Standard Checkout demo page at /checkout.html
paymentRouter.use(express.static(path.join(__dirname, "public")));

paymentRouter.get("/health", (_req, res) => {
  res.json({ service: "payment-service", status: "ok" });
});

paymentRouter.use("/", paymentRoutes);
