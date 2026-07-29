import { Router } from "express";
import Product from "../../models/Product.js";
import { setupSwagger } from "../../../swagger-docs/product/product-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const productRouter = Router();
setupSwagger(productRouter);

productRouter.get("/health", (_req, res) => {
  res.json({ service: "product-service", status: "ok" });
});

productRouter.get("/", async (_req, res) => {
  try {
    const products = await Product.find({});
    res.json({ service: "product-service", products });
  } catch (error) {
    console.error("MongoDB query failed", error.message);
    res.status(500).json({ error: "Failed to fetch products from MongoDB" });
  }
});

productRouter.get("/:id", async (req, res) => {
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

  try {
    const product = await Product.create({ product_name: name, variants: price != null ? [{ variant_name: name, sku: `SKU-${Date.now()}`, price, selling_price: price }] : [] });
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

  try {
    const update = {};
    if (name !== undefined) update.product_name = name;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (price !== undefined) {
      if (product.variants.length === 0) {
        product.variants.push({ variant_name: product.product_name, sku: `SKU-${Date.now()}`, price, selling_price: price });
      } else {
        product.variants[0].price = price;
        product.variants[0].selling_price = price;
      }
      await product.save();
    }

    // Return the updated product excluding _id and __v fields
    const { _id, __v, ...productData } = product.toObject();
    res.json({ service: "product-service", message: "Product updated successfully", product: productData });
  } catch (error) {
    console.error("MongoDB update failed", error.message);
    res.status(500).json({ error: "Failed to update product in MongoDB" });
  }
});

productRouter.delete("/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
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
