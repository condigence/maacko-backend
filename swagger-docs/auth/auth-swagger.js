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
      description: "Two-step signup (dual email+mobile OTP) and two-step login (single identifier OTP), both issuing an access/refresh token pair.",
    },
    servers: [{ url: "/api/auth" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: [path.join(__dirname, "auth-swagger.js")],
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(router) {
  router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 * /signup:
 *   post:
 *     summary: Step 1 - collect profile info, send an OTP to email and mobile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               role:
 *                 type: string
 *                 enum: [customer, vendor, admin]
 *               email:
 *                 type: string
 *                 example: jane@example.com
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP generated and sent to both channels
 *       409:
 *         description: An account already exists for this email/mobile
 * /signup/verify:
 *   post:
 *     summary: Step 2 - verify both OTPs together, creates the user and issues a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               email_otp:
 *                 type: string
 *               mobile:
 *                 type: string
 *               mobile_otp:
 *                 type: string
 *     responses:
 *       201:
 *         description: Signup successful, user created, accessToken + refreshToken issued
 *       401:
 *         description: Incorrect email and/or mobile OTP
 *       409:
 *         description: An account already exists for this email/mobile
 * /login:
 *   post:
 *     summary: Step 1 - identifier (email or mobile) + role must match an existing user, sends an OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, vendor, admin]
 *               identifier:
 *                 type: string
 *                 example: jane@example.com
 *     responses:
 *       200:
 *         description: OTP generated and sent to the identifier
 *       404:
 *         description: No account found for this identifier and role
 * /login/verify:
 *   post:
 *     summary: Step 2 - verify the OTP, issues an access/refresh token pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, vendor, admin]
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, accessToken + refreshToken issued
 *       401:
 *         description: Incorrect OTP
 * /token/refresh:
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
 *       401:
 *         description: Invalid, expired, or already-used refresh token
 * /logout:
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
 */
