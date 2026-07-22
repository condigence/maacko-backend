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
      title: "Auth Service API",
      version: "1.0.0",
      description: "OTP based login issuing JWT access/refresh tokens, scoped by role via the URL (customer/vendor/master)",
    },
    servers: [{ url: "http://localhost:3003" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: [path.join(__dirname, "auth-swagger.js")],
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/auth/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 * /auth/otp/request:
 *   post:
 *     summary: Request an OTP for customer login (base URL flow)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: OTP generated
 * /auth/otp/verify:
 *   post:
 *     summary: Verify OTP and receive access/refresh tokens for a customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 * /auth/vendor/otp/request:
 *   post:
 *     summary: Request an OTP for vendor login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: 9876543210
 *     responses:
 *       200:
 *         description: OTP generated
 * /auth/vendor/otp/verify:
 *   post:
 *     summary: Verify OTP and receive access/refresh tokens for a vendor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 * /auth/master/otp/request:
 *   post:
 *     summary: Request an OTP for master/admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: admin@maacko.com
 *     responses:
 *       200:
 *         description: OTP generated
 * /auth/master/otp/verify:
 *   post:
 *     summary: Verify OTP and receive access/refresh tokens for an admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 * /auth/token/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access/refresh token pair (rotates the refresh token)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair issued
 * /auth/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 * /auth/me:
 *   get:
 *     summary: Get the authenticated account from the access token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current account
 *       401:
 *         description: Missing or invalid access token
 */
