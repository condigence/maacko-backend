import { Router } from "express";

import { User, Customer, Vendor, Admin } from "../../models/User.js";

import { setupSwagger } from "../../../swagger-docs/user/user-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

import jwt from 'jsonwebtoken'; 

import  validateRegister  from "../../middleware/validateRegister.js";
import { validatePatchBody, validatePutBody } from "../../middleware/validateUpdate.js";



const modelMap = { customer: Customer, vendor: Vendor, admin: Admin };

export const userRouter = Router();
setupSwagger(userRouter);

userRouter.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});


const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/users/register
userRouter.post("/register", validateRegister, async (req, res) => {
  try {
    const { role, email, phone } = req.body;

    const Model = modelMap[role];

    // only check fields that were actually provided —
    // an undefined value in the query object would otherwise
    // match ALL documents and cause false "already exists" errors
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    const existing = orConditions.length
      ? await User.findOne({ $or: orConditions })
      : null;

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email or phone already exists'
      });
    }

    const newUser = await Model.create(req.body);
    const token = generateToken(newUser._id, newUser.role);

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      token,
      user: userObj
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate field value',
        field: Object.keys(err.keyPattern)[0]
      });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/:id
userRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/users/:id  — partial update, only send the fields you want to change
userRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { email: bodyEmail, phone: bodyPhone } = req.body;
    if ((bodyEmail !== undefined && bodyEmail !== user.email) || (bodyPhone !== undefined && bodyPhone !== user.phone)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change phone or email. Contact admin.'
      });
    }

    const validation = validatePatchBody(user.role, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        missingOrInvalidFields: validation.missingOrInvalidFields,
        errors: validation.errors
      });
    }

    const { email, phone } = validation.data;
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length) {
      const existing = await User.findOne({ _id: { $ne: id }, $or: orConditions });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email or phone already exists'
        });
      }
    }

    user.set(validation.data);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: user.toObject()
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate field value',
        field: Object.keys(err.keyPattern)[0]
      });
    }
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        missingOrInvalidFields: errors.map((e) => e.field),
        errors
      });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/:id — full replace, send every field required for that role
userRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { email: bodyEmail, phone: bodyPhone } = req.body;
    if ((bodyEmail !== undefined && bodyEmail !== user.email) || (bodyPhone !== undefined && bodyPhone !== user.phone)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change phone or email. Contact admin.'
      });
    }

    const validation = validatePutBody(user.role, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        missingOrInvalidFields: validation.missingOrInvalidFields,
        errors: validation.errors
      });
    }

    const { email, phone } = validation.data;
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length) {
      const existing = await User.findOne({ _id: { $ne: id }, $or: orConditions });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email or phone already exists'
        });
      }
    }

    user.set(validation.data);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User replaced successfully',
      user: user.toObject()
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate field value',
        field: Object.keys(err.keyPattern)[0]
      });
    }
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        missingOrInvalidFields: errors.map((e) => e.field),
        errors
      });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
