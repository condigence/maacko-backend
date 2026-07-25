import "dotenv/config";
import { spawn } from "node:child_process";
import process from "node:process";

const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";
const services = [
  {
    name: "api-gateway",
    script: "src/api-gateway/index.js",
    port: process.env.PORT || "3000",
  },
  {
    name: "user",
    script: "src/services/user-service/index.js",
    port: process.env.USER_SERVICE_PORT || "3001",
  },
  {
    name: "product",
    script: "src/services/product-service/index.js",
    port: process.env.PRODUCT_SERVICE_PORT || "3002",
  },
  {
    name: "auth",
    script: "src/services/auth-service/index.js",
    port: process.env.AUTH_SERVICE_PORT || "3003",
  },
  {
    name: "payment",
    script: "src/services/payment-service/index.js",
    port: process.env.PAYMENT_SERVICE_PORT || "3004",
  },
  {
    name: "order",
    script: "src/services/order-service/index.js",
    port: process.env.ORDER_SERVICE_PORT || "3005",
  },
];

const children = [];

function shutdownDependents() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

function launch(service) {
  const child = spawn(process.execPath, [service.script], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: service.port, GATEWAY_URL: gatewayUrl },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (service.name === "api-gateway") {
      console.log(
        `API Gateway stopped (${signal || code}). Stopping dependent services...`,
      );
      shutdownDependents();
      process.exit(code || 0);
    }
  });

  children.push(child);
}

for (const service of services) {
  launch(service);
}

process.on("SIGINT", () => {
  shutdownDependents();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdownDependents();
  process.exit(0);
});
