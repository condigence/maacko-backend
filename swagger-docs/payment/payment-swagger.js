import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description: "Swagger documentation for the payment service (Razorpay Standard Checkout)",
    },
    servers: [{ url: "http://localhost:3004" }],
  },
  apis: [path.join(__dirname, "payment-swagger.js")],
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/payments/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 * /payments/items:
 *   get:
 *     summary: List the mock item catalog (id, name, price in INR)
 *     responses:
 *       200:
 *         description: Item catalog
 * /payments/create-order:
 *   post:
 *     summary: Create a Razorpay order for the given items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               receipt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Razorpay order created
 *       400:
 *         description: Invalid items or amount below minimum
 *       401:
 *         description: Razorpay authentication failed
 *       500:
 *         description: Razorpay API error
 * /payments/verify-payment:
 *   post:
 *     summary: Verify a Razorpay Standard Checkout payment signature and mark the order paid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified, order placed
 *       400:
 *         description: Missing fields or signature mismatch
 *       404:
 *         description: Order not found
 * /payments/orders:
 *   get:
 *     summary: List all orders recorded by the payment service
 *     responses:
 *       200:
 *         description: List of orders
 * /payments/orders/{orderId}:
 *   get:
 *     summary: Get an order by Razorpay order id
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
