import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://127.0.0.1:3001";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://127.0.0.1:3002";
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://127.0.0.1:3003";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://127.0.0.1:3004";
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || "http://127.0.0.1:3005";

app.get("/health", (_req, res) => {
  res.json({ service: "api-gateway", status: "ok" });
});

async function proxyRequest(req, res, targetBaseUrl, serviceName) {
  const targetPath = req.originalUrl
    .replace(/^\/api\/users/, "/users")
    .replace(/^\/api\/products/, "/products")
    .replace(/^\/api\/auth/, "/auth")
    .replace(/^\/api\/payments/, "/payments")
    .replace(/^\/api\/orders/, "/orders");
  const targetUrl = new URL(targetPath, targetBaseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }

    const body = await response.text();
    res.status(response.status).send(body);
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`${serviceName} request timed out`);
    } else {
      console.error(`Proxy request failed for ${serviceName}`, error.message);
    }

    res.status(503).json({
      error: `${serviceName} is currently unavailable`,
      message: "The requested service is down or unreachable.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

app.use("/api/users", (req, res) =>
  proxyRequest(req, res, USER_SERVICE_URL, "User service"),
);
app.use("/api/products", (req, res) =>
  proxyRequest(req, res, PRODUCT_SERVICE_URL, "Product service"),
);
app.use("/api/auth", (req, res) =>
  proxyRequest(req, res, AUTH_SERVICE_URL, "Auth service"),
);
app.use("/api/payments", (req, res) =>
  proxyRequest(req, res, PAYMENT_SERVICE_URL, "Payment service"),
);
app.use("/api/orders", (req, res) =>
  proxyRequest(req, res, ORDER_SERVICE_URL, "Order service"),
);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

export default app;
