import { Router } from "express";
import { buildAuthRouter } from "./routes.js";
import { rotateRefreshToken, revokeRefreshToken, AuthError } from "./tokens.js";
import { requireAuth } from "../../middleware/auth.js";
import { setupSwagger } from "../../../swagger-docs/auth/auth-swagger.js";

export const authRouter = Router();
setupSwagger(authRouter);

authRouter.get("/health", (_req, res) => {
  res.json({ service: "auth-service", status: "ok" });
});

// Base URL -> customer login, /vendor -> vendor login, /master -> admin login
authRouter.use("/", buildAuthRouter("customer"));
authRouter.use("/vendor", buildAuthRouter("vendor"));
authRouter.use("/master", buildAuthRouter("admin"));

authRouter.post("/token/refresh", async (req, res) => {
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

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  await revokeRefreshToken(refreshToken);
  res.status(200).json({ message: "Logged out successfully" });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ account: req.user });
});
