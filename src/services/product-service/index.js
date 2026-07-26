import { Router } from "express";
import { connectMongo, disconnectMongo } from "../../db/mongo.js";
import Product from "../../models/Product.js";
import { setupSwagger } from "../../../swagger-docs/product/product-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

import mockProductsData from "./data/mockProduct.json" with { type: "json" };

let mockProducts = [...mockProductsData];

export const productRouter = Router();
setupSwagger(productRouter);

// Delegates mock/live status directly to connectMongo()
async function tryMongo() {
  try {
    const conn = await connectMongo();
    return Boolean(conn);
  } catch {
    return false;
  }
}

const isMongoConnected = await tryMongo(); // checking for connection with MongoDB

productRouter.get("/health", (_req, res) => {
  res.json({ service: "product-service", status: "ok" });
});

productRouter.get("/", async (_req, res) => {
//talking to mock product json
  if (!isMongoConnected) {
    return res.json({
      service: "product-service",
      source: "mock",
      products: mockProducts,
    });
  }
  try {
    const products = await Product.find({});
    // const productData = products.map((product) => {
    //   const { __v, ...data } = product.toObject();
    //   return data;
    // });
    res.json({ service: "product-service", products });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch products from MongoDB" });
  }
});

productRouter.get("/:id", async (req, res) => {

//talking to mockProduct
  if (!isMongoConnected) {
    const product = mockProducts.find(
      (p) => (p._id || p.id) === req.params.id
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json({ service: "product-service", source: "mock", product });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { __v, ...productData } = product.toObject();
    res.json({ service: "product-service", product: productData });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch product from MongoDB" });
  }
});

productRouter.post("/", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
    const { name, price } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (!isMongoConnected) {
      const stubProduct = {
        _id: `mock_prod_${Date.now()}`,
        name,
        price: price || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProducts.push(stubProduct);

      return res.status(201).json({
        service: "product-service",
        source: "mock",
        product: stubProduct,
      });
    }

  try {
    const product = await Product.create({ name, price: price || 0 });
    res.status(201).json({ service: "product-service", product });
  } catch (error) {
    console.error("MongoDB insert failed", error.message);
    res.status(500).json({ error: "Failed to create product in MongoDB" });
  }
});

productRouter.put("/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const { name, price } = req.body;

  if (name === undefined && price === undefined) {
    return res.status(400).json({ error: "At least one field is required for update" });
  }

  if (!isMongoConnected) {
      const productIndex = mockProducts.findIndex(
        (p) => (p._id || p.id) === req.params.id
      );

      if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (name !== undefined) mockProducts[productIndex].name = name;
      if (price !== undefined) mockProducts[productIndex].price = price;
      mockProducts[productIndex].updatedAt = new Date().toISOString();

      return res.json({
        service: "product-service",
        source: "mock",
        message: "Product updated successfully",
        product: mockProducts[productIndex],
      });
    }

  try {
    const update = {};
    if (name !== undefined) update.name = name;
    if (price !== undefined) update.price = price;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return the updated product in the response exclude _id and __v fields
    const { _id, __v, ...productData } = product.toObject();
    res.json({ service: "product-service", message: "Product updated successfully", product: productData });
  } catch (error) {
    console.error("MongoDB update failed", error.message);
    res.status(500).json({ error: "Failed to update product in MongoDB" });
  }
});

productRouter.delete("/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {

  if (!isMongoConnected) {
      const initialLength = mockProducts.length;
      mockProducts = mockProducts.filter(
        (p) => (p._id || p.id) !== req.params.id
      );

      if (mockProducts.length === initialLength) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json({
        service: "product-service",
        source: "mock",
        message: "Product deleted successfully",
      });
    }

  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ service: "product-service", message: "Product deleted successfully" });
  } catch (error) {
    console.error("MongoDB delete failed", error.message);
    res.status(500).json({ error: "Failed to delete product from MongoDB" });
  }
});

export async function shutdownProductService() {
  await disconnectMongo();
}
