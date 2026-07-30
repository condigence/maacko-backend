import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./db/mongo.js";
import { userRouter } from "./services/user-service/index.js";
import { productRouter } from "./services/product-service/index.js";
import { authRouter } from "./services/auth-service/index.js";
import { paymentRouter } from "./services/payment-service/index.js";
import { orderRouter } from "./services/order-service/index.js";

// Fire-and-forget: Mongoose buffers queries issued before this resolves, so
// route handlers don't need to wait on it. Works for both the long-running
// server (bootstrap.js) and the Vercel serverless entrypoint (this file).
connectMongo().catch((error) => {
  console.error("MongoDB connection failed:", error.message);
});

const app = express();

// CORS_ORIGIN accepts a comma-separated list; falls back to the deployed frontend.
const allowedOrigins = (process.env.CORS_ORIGIN || "https://maacko-frontend.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // no Origin header (curl, server-to-server, same-origin) -> allow
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/orders", orderRouter);

export default app;
