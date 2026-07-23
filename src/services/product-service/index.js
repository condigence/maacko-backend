import "dotenv/config";
import express from "express";
import { connectMongo, disconnectMongo } from "../../db/mongo.js";
import Product from "../../models/Product.js";
import { setupSwagger } from "../../../swagger-docs/product/product-swagger.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const app = express();
app.use(express.json());
setupSwagger(app);
const PORT = process.env.PRODUCT_SERVICE_PORT || process.env.PORT || 3002;
const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:3000";

async function ensureGateway() {
  try {
    const response = await fetch(`${gatewayUrl}/health`);
    if (!response.ok) throw new Error("gateway unhealthy");
  } catch (error) {
    console.error("Gateway is not available. Product service will exit.");
    process.exit(1);
  }
}

app.get("/health", (_req, res) => {
  res.json({ service: "product-service", status: "ok" });
});

app.get("/products", async (_req, res) => {
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

app.get("/products/:id", async (req, res) => {
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

app.post("/products", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const product = await Product.create({ name, price: price || 0 });
    res.status(201).json({ service: "product-service", product });
  } catch (error) {
    console.error("MongoDB insert failed", error.message);
    res.status(500).json({ error: "Failed to create product in MongoDB" });
  }
});

app.put("/products/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.price !== undefined) update.price = req.body.price;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "At least one field is required for update" });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }


    // Return the updated product in the response exclude _id and __v fields
    const { _id, __v, ...productData } = product.toObject();
    res.json({ service: "product-service", message: "Product updated successfully", product: productData });
    // res.json({ service: "product-service", message: "Product updated successfully", product });
  
    res.json({ service: "product-service", message: "Product updated successfully", product });
  } catch (error) {
    console.error("MongoDB update failed", error.message);
    res.status(500).json({ error: "Failed to update product in MongoDB" });
  }
});

app.delete("/products/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
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

await ensureGateway();
await connectMongo();



app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  await disconnectMongo();
  process.exit(0);
});