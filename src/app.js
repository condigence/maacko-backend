import "dotenv/config";
import express from "express";
import { userRouter } from "./services/user-service/index.js";
import { productRouter } from "./services/product-service/index.js";
import { authRouter } from "./services/auth-service/index.js";
import { paymentRouter } from "./services/payment-service/index.js";
import { orderRouter } from "./services/order-service/index.js";

const app = express();
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
