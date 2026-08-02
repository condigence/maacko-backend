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
      title: "User Service API",
      version: "1.0.0",
      description: "Swagger documentation for the user service",
    },
    servers: [{ url: "/api/users" }],
  },
  apis: [path.join(__dirname, "user-swagger.js")],
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(router) {
  router.use("/api-docs/users", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 * /register:
 *   post:
 *     summary: Register a new user
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               photo:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               storeAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               pan:
 *                 type: string
 *               gst:
 *                 type: string
 *               bankDetails:
 *                 type: object
 *                 properties:
 *                   accountHolderName:
 *                     type: string
 *                   accountNumber:
 *                     type: string
 *                   ifscCode:
 *                     type: string
 *                   bankName:
 *                     type: string
 *               permanentAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               temporaryAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Duplicate email or phone
 * /:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 * /{id}:
 *   get:
 *     summary: Get user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User fetched successfully
 *   put:
 *     summary: Replace a user
 *     description: Full replace. Email and phone cannot be changed; contact admin if update is required.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               photo:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               storeAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               pan:
 *                 type: string
 *               gst:
 *                 type: string
 *               bankDetails:
 *                 type: object
 *                 properties:
 *                   accountHolderName:
 *                     type: string
 *                   accountNumber:
 *                     type: string
 *                   ifscCode:
 *                     type: string
 *                   bankName:
 *                     type: string
 *               permanentAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *               temporaryAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       200:
 *         description: User replaced successfully
 *       400:
 *         description: Validation failed or email/phone cannot be changed
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate email or phone
 *   delete:
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
