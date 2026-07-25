import "dotenv/config";
import express from "express";
import { createRequire } from "node:module";
import { connectMySQL, disconnectMySQL } from "../../db/mysql.js";
import { setupSwagger } from "../../../swagger-docs/user/user-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const require = createRequire(import.meta.url);
let mockUsers = require("./data/mockUser.json");

const app = express();
app.use(express.json());
setupSwagger(app);
const PORT = process.env.USER_SERVICE_PORT || process.env.PORT || 3001;
const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";

async function ensureGateway() {
  try {
    const response = await fetch(`${gatewayUrl}/health`);
    if (!response.ok) throw new Error("gateway unhealthy");
  } catch (error) {
    console.error("Gateway is not available. User service will exit.");
    process.exit(1);
  }
}

// Returns a connected MySQL connection or null (mock mode / connection failure)
async function tryMySQL() {
  try {
    const conn = await connectMySQL();
    return conn;
  } catch {
    return null;
  }
}

app.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

app.get("/users", async (_req, res) => {
  const connection = await tryMySQL();
  if (!connection) {
    return res.json({ service: "user-service", source: "mock", users: mockUsers });
  }
  try {
    const [rows] = await connection.query("SELECT id, name, email FROM users");
    res.json({ service: "user-service", users: rows });
  } catch (error) {
    console.error("MySQL query failed", error.message);
    res.status(500).json({ error: "Failed to fetch users from MySQL" });
  }
});

app.get("/users/:id", async (req, res) => {
  const connection = await tryMySQL();
  if (!connection) {
    const user = mockUsers.find((u) => String(u.id) === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ service: "user-service", source: "mock", user });
  }
  try {
    const [rows] = await connection.query("SELECT id, name, email FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ service: "user-service", user: rows[0] });
  } catch (error) {
    console.error("MySQL query failed", error.message);
    res.status(500).json({ error: "Failed to fetch user from MySQL" });
  }
});

app.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const connection = await tryMySQL();
  if (!connection) {
    const stubUser = {
      id: mockUsers.length ? Math.max(...mockUsers.map((u) => u.id)) + 1 : 1,
      name,
      email,
    };
    mockUsers.push(stubUser);
    return res.status(201).json({ service: "user-service", source: "mock", user: stubUser });
  }

  try {
    const [result] = await connection.query(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    res.status(201).json({
      service: "user-service",
      user: { id: result.insertId, name, email },
    });
  } catch (error) {
    console.error("MySQL insert failed", error.message);
    res.status(500).json({ error: "Failed to create user in MySQL" });
  }
});

app.put("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email } = req.body;

  if (name === undefined && email === undefined) {
    return res.status(400).json({ error: "At least one field is required for update" });
  }

  const connection = await tryMySQL();
  if (!connection) {
    const user = mockUsers.find((u) => String(u.id) === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    return res.json({
      service: "user-service",
      source: "mock",
      message: "User updated successfully",
      user,
    });
  }

  try {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (email !== undefined) {
      fields.push("email = ?");
      values.push(email);
    }

    values.push(req.params.id);
    const [result] = await connection.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // if u want to return user id in the response
   // const updatedUser = { id: Number(req.params.id), ...req.body };


   // but i dont want to send id in the response as we have alreday in param
    const updatedUser = { ...req.body };

    res.json({
      service: "user-service",
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("MySQL update failed", error.message);
    res.status(500).json({ error: "Failed to update user in MySQL" });
  }
});

app.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const connection = await tryMySQL();
  if (!connection) {
    const initialLength = mockUsers.length;
    mockUsers = mockUsers.filter((u) => String(u.id) !== req.params.id);
    if (mockUsers.length === initialLength) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ service: "user-service", source: "mock", message: "User deleted successfully" });
  }

  try {
    const [result] = await connection.query("DELETE FROM users WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("MySQL delete failed", error.message);
    res.status(500).json({ error: "Failed to delete user from MySQL" });
  }
});

await ensureGateway();

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  await disconnectMySQL();
  process.exit(0);
});
