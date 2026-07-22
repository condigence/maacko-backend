import "dotenv/config";
import express from "express";
import { buildAuthRouter } from "./routes.js";
import { rotateRefreshToken, revokeRefreshToken, AuthError } from "./tokens.js";
import { requireAuth } from "../../middleware/auth.js";
import { setupSwagger } from "../../../swagger-docs/auth/auth-swagger.js";

const app = express();
app.use(express.json());
setupSwagger(app);
const PORT = process.env.AUTH_SERVICE_PORT || process.env.PORT || 3003;
const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";

async function ensureGateway() {
  try {
    const response = await fetch(`${gatewayUrl}/health`);
    if (!response.ok) throw new Error("gateway unhealthy");
  } catch (error) {
    console.error("Gateway is not available. Auth service will exit.");
    process.exit(1);
  }
}

app.get("/health", (_req, res) => {
  res.json({ service: "auth-service", status: "ok" });
});

// Base URL -> customer login, /vendor -> vendor login, /master -> admin login
app.use("/auth", buildAuthRouter("customer"));
app.use("/auth/vendor", buildAuthRouter("vendor"));
app.use("/auth/master", buildAuthRouter("admin"));

app.post("/auth/token/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const tokens = await rotateRefreshToken(refreshToken);
    res.status(200).json(tokens);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Token refresh failed", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

app.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  await revokeRefreshToken(refreshToken);
  res.status(200).json({ message: "Logged out successfully" });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.status(200).json({ account: req.user });
});

await ensureGateway();

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
