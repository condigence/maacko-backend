import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";

// Stateless: verifies the JWT signature/expiry only, no DB lookup.
// Any service in the monorepo can import this to gate routes by role.
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header. Expected 'Bearer <accessToken>'." });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of roles: ${roles.join(", ")}` });
    }

    next();
  };
}
