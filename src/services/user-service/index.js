import { Router } from "express";
import User from "../../models/User.js";
import { setupSwagger } from "../../../swagger-docs/user/user-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const userRouter = Router();
setupSwagger(userRouter);

userRouter.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

userRouter.get("/", async (_req, res) => {
  try {
    const users = await User.find({});
    res.json({ service: "user-service", users });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

userRouter.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ service: "user-service", user });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

userRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { first_name, last_name, email, mobile, role_id } = req.body;

  if (!first_name || !email) {
    return res.status(400).json({ error: "First name and email are required" });
  }

  try {
    const user = await User.create({
      first_name,
      last_name: last_name || "",
      email,
      mobile: mobile || null,
      role_id: role_id || 1,
    });
    res.status(201).json({ service: "user-service", user });
  } catch (error) {
    console.error("MongoDB insert failed", error.message);
    res.status(500).json({ error: "Failed to create user" });
  }
});

userRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { first_name, last_name, email, mobile } = req.body;

  try {
    const update = {};
    if (first_name !== undefined) update.first_name = first_name;
    if (last_name !== undefined) update.last_name = last_name;
    if (email !== undefined) update.email = email;
    if (mobile !== undefined) update.mobile = mobile;

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ service: "user-service", message: "User updated successfully", user });
  } catch (error) {
    console.error("MongoDB update failed", error.message);
    res.status(500).json({ error: "Failed to update user" });
  }
});

userRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ service: "user-service", message: "User deleted successfully" });
  } catch (error) {
    console.error("MongoDB delete failed", error.message);
    res.status(500).json({ error: "Failed to delete user" });
  }
});
