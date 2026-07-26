import { Router } from "express";
import { connectMySQL, disconnectMySQL } from "../../db/mysql.js";
import { setupSwagger } from "../../../swagger-docs/user/user-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

import mockUsersFile from "./data/mockUser.json" with { type: "json" };

let mockUsers = [...mockUsersFile.users];

export const userRouter = Router();
setupSwagger(userRouter);

// Delegates mock/live status directly to connectMySql()
async function tryMysql() {
  try {
    const conn = await connectMySQL();
    return Boolean(conn);
  } catch {
    return false;
  }
}

const isMySqlConnected = await tryMysql(); // checking for connection with MySql

userRouter.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

userRouter.get("/", async (_req, res) => {
  //talking to mock user json
   if (!isMySqlConnected) {
    return res.json({
      service: "user-service",
      source: "mock",
      users: mockUsers,
    });
  }
  let connection = await connectMySQL();

  try {
    const [rows] = await connection.query("SELECT id, name, email FROM users");
    res.json({ service: "user-service", users: rows });
  } catch (error) {
    console.error("MySQL query failed", error.message);
    res.status(500).json({ error: "Failed to fetch users from MySQL" });
  }
});

userRouter.get("/:id", async (req, res) => {
  //talking to mockUser
   if (!isMySqlConnected) {
    const user = mockUsers.find(
      (u) => String(u._id || u.id) === String(req.params.id)
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ service: "user-service", source: "mock", user });
  }

  try {
    const connection = await connectMySQL();
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

userRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { first_name, last_name, email, mobile, role_id } = req.body;

  if (!first_name || !email) {
    return res.status(400).json({ error: "First name and email are required" });
  }

  if (!isMySqlConnected) {
    const stubUser = {
      id: mockUsers.length + 1,
      uuid: `mock-uuid-${Date.now()}`,
      first_name,
      last_name: last_name || "",
      email,
      mobile: mobile || null,
      role_id: role_id || 1,
      status: "active",
      created_at: new Date().toISOString(),
    };
    mockUsers.push(stubUser);

    return res.status(201).json({
      service: "user-service",
      source: "mock",
      user: stubUser,
    });
  }

  try {
    const connection = await connectMySQL();
    const [result] = await connection.query(
      "INSERT INTO users (first_name, last_name, email, mobile, role_id) VALUES (?, ?, ?, ?, ?)",
      [first_name, last_name || "", email, mobile || null, role_id || 1]
    );

    res.status(201).json({
      service: "user-service",
      user: {
        id: result.insertId,
        first_name,
        last_name: last_name || "",
        email,
        mobile: mobile || null,
        role_id: role_id || 1,
      },
    });
  } catch (error) {
    console.error("MySQL insert failed", error.message);
    res.status(500).json({ error: "Failed to create user in MySQL" });
  } finally {
    console.log("User creation attempt completed");
  }
});

userRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {

 const { first_name, last_name, email, mobile } = req.body;

  if (!isMySqlConnected) {
    const userIndex = mockUsers.findIndex(
      (u) => String(u._id || u.id) === String(req.params.id)
    );

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (first_name !== undefined) mockUsers[userIndex].first_name = first_name;
    if (last_name !== undefined) mockUsers[userIndex].last_name = last_name;
    if (email !== undefined) mockUsers[userIndex].email = email;
    if (mobile !== undefined) mockUsers[userIndex].mobile = mobile;
    mockUsers[userIndex].updated_at = new Date().toISOString();

    return res.json({
      service: "user-service",
      source: "mock",
      message: "User updated successfully",
      user: mockUsers[userIndex],
    });
  }

  try {
    const connection = await connectMySQL();
    const { name, email } = req.body;
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

userRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {

 if (!isMySqlConnected) {
    const initialLength = mockUsers.length;
    mockUsers = mockUsers.filter(
      (u) => String(u._id || u.id) !== String(req.params.id)
    );

    if (mockUsers.length === initialLength) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      service: "user-service",
      source: "mock",
      message: "User deleted successfully",
    });
  }

  try {
    const connection = await connectMySQL();
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

export async function shutdownUserService() {
  await disconnectMySQL();
}
