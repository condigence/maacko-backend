# MAAKO Microservices Project

This project contains a small microservice architecture with:
- an API gateway
- an auth service (OTP + JWT login for customer/vendor/admin) backed by a local JSON mock store
- a user service connected to MySQL
- a product service connected to MongoDB
- a payment service (Razorpay Standard Checkout) with a mock JSON item catalog/order store
- Swagger documentation for each service

## Project Structure

- `src/gateway/index.js` - API gateway
- `src/services/auth-service/index.js` - Auth service entrypoint (OTP login, JWT access/refresh tokens)
- `src/services/user-service/index.js` - User service entrypoint
- `src/services/product-service/index.js` - Product service entrypoint
- `src/services/payment-service/index.js` - Payment service entrypoint (Razorpay Standard Checkout)
- `src/services/payment-service/routes.js` - `create-order` / `verify-payment` route handlers
- `src/services/payment-service/razorpay.js` - Razorpay SDK client + HMAC signature verification
- `src/services/payment-service/store.js` - Reads/writes the mock JSON item catalog and order store
- `src/services/payment-service/public/checkout.html` - Standalone Razorpay Standard Checkout demo page
- `src/middleware/auth.js` - Shared `requireAuth`/`requireRole` JWT middleware used by every service
- `src/db/mysql.js` - MySQL connection helper
- `src/db/mongo.js` - MongoDB/Mongoose connection helper
- `swagger-docs/auth/auth-swagger.js` - Swagger setup for the auth service
- `swagger-docs/user/user-swagger.js` - Swagger setup for the user service
- `swagger-docs/product/product-swagger.js` - Swagger setup for the product service
- `swagger-docs/payment/payment-swagger.js` - Swagger setup for the payment service

## Run the Services

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and adjust if needed (sane localhost defaults are already baked in, so this is optional for local dev). **The payment service is the exception** — it requires real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` values in `.env`, there is no working fallback:

```bash
cp .env.example .env
```

Start the services (each in its own terminal), or use `node src/bootstrap.js` to launch all of them together:

```bash
npm run gateway
npm run auth-service
npm run user-service
npm run product-service
npm run payment-service
```

The payment service only needs the gateway running (it has no database) — for a quick payment-only test you don't need the auth/user/product services at all.

## Ports

- Gateway: http://localhost:3000
- Auth Service: http://localhost:3003
- User Service: http://localhost:3001
- Product Service: http://localhost:3002
- Payment Service: http://localhost:3004

## API Endpoints

### Gateway

- Health check: `GET /health`
- Customer OTP request: `POST /api/auth/otp/request`
- Customer OTP verify (login): `POST /api/auth/otp/verify`
- Vendor OTP request: `POST /api/auth/vendor/otp/request`
- Vendor OTP verify (login): `POST /api/auth/vendor/otp/verify`
- Master/admin OTP request: `POST /api/auth/master/otp/request`
- Master/admin OTP verify (login): `POST /api/auth/master/otp/verify`
- Refresh tokens (any role): `POST /api/auth/token/refresh`
- Logout (any role): `POST /api/auth/logout`
- Current account (any role, requires access token): `GET /api/auth/me`
- Get users: `GET /api/users`
- Get user by id: `GET /api/users/:id`
- Create user (admin only): `POST /api/users`
- Update user (admin only): `PUT /api/users/:id`
- Delete user (admin only): `DELETE /api/users/:id`
- Get products: `GET /api/products`
- Get product by id: `GET /api/products/:id`
- Create product (vendor/admin only): `POST /api/products`
- Update product (vendor/admin only): `PUT /api/products/:id`
- Delete product (vendor/admin only): `DELETE /api/products/:id`
- List mock item catalog: `GET /api/payments/items`
- Create a Razorpay order: `POST /api/payments/create-order`
- Verify a Razorpay payment signature: `POST /api/payments/verify-payment`
- List orders: `GET /api/payments/orders`
- Get order by id: `GET /api/payments/orders/:orderId`

### Auth Service

Role is determined entirely by which URL you call — the same OTP flow runs underneath for all three:

- Health check: `GET /health`
- Customer OTP request: `POST /auth/otp/request`
- Customer OTP verify: `POST /auth/otp/verify`
- Vendor OTP request: `POST /auth/vendor/otp/request`
- Vendor OTP verify: `POST /auth/vendor/otp/verify`
- Master/admin OTP request: `POST /auth/master/otp/request`
- Master/admin OTP verify: `POST /auth/master/otp/verify`
- Refresh token pair: `POST /auth/token/refresh`
- Logout / revoke refresh token: `POST /auth/logout`
- Get current account: `GET /auth/me` (requires `Authorization: Bearer <accessToken>`)

### User Service

- Health check: `GET /health`
- Get users: `GET /users`
- Get user by id: `GET /users/:id`
- Create user (admin only): `POST /users`
- Update user (admin only): `PUT /users/:id`
- Delete user (admin only): `DELETE /users/:id`

### Product Service

- Health check: `GET /health`
- Get products: `GET /products`
- Get product by id: `GET /products/:id`
- Create product (vendor/admin only): `POST /products`
- Update product (vendor/admin only): `PUT /products/:id`
- Delete product (vendor/admin only): `DELETE /products/:id`

### Payment Service

- Health check: `GET /health`
- List mock item catalog: `GET /payments/items`
- Create a Razorpay order: `POST /payments/create-order`
- Verify a Razorpay payment signature: `POST /payments/verify-payment`
- List orders: `GET /payments/orders`
- Get order by id: `GET /payments/orders/:orderId`
- Standalone checkout demo page: `GET /checkout.html`

## Swagger Documentation

Swagger UI is served directly from each service:

- Auth Service Swagger: http://localhost:3003/api-docs
- Auth Service Swagger (alternate route): http://localhost:3003/auth/api-docs
- User Service Swagger: http://localhost:3001/api-docs
- User Service Swagger (alternate route): http://localhost:3001/users/api-docs
- Product Service Swagger: http://localhost:3002/api-docs
- Product Service Swagger (alternate route): http://localhost:3002/products/api-docs
- Payment Service Swagger: http://localhost:3004/api-docs
- Payment Service Swagger (alternate route): http://localhost:3004/payments/api-docs

## Database Configuration

### MySQL (User Service)

Set these environment variables if needed:

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=maako
```

Make sure your MySQL server has a `users` table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL
);
```

### Mock JSON store (Auth Service)

The auth service does **not** need MySQL, Mongo, or any credentials. It persists accounts, OTP codes, and refresh tokens to a local file at `src/services/auth-service/data/store.json`, created automatically on first run and git-ignored. Delete that file any time to reset all auth state.

### MongoDB (Product Service)

Set these environment variables if needed:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/maako_products
```

### Mock JSON store (Payment Service)

Like the auth service, the payment service needs no MySQL/Mongo. It reads a seeded item catalog from `src/services/payment-service/data/items.json` and persists orders (created → paid/payment_failed) to `src/services/payment-service/data/orders.json`, which is git-ignored since it's rewritten on every test payment. It **does** require real Razorpay credentials:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

Get test-mode keys from the Razorpay Dashboard → Settings → API Keys. `RAZORPAY_KEY_SECRET` is only ever read server-side (`razorpay.js`); it is never sent in any API response.

## Payment Flow (Razorpay Standard Checkout)

1. Client calls `POST /api/payments/create-order` with `{ "items": [{ "id": "item_bgauss_c12i", "quantity": 1 }] }`. The server looks up each item's price from the mock catalog (client-supplied prices are never trusted), computes the total in paise, and creates a Razorpay order via the Orders API. Response: `{ order_id, amount, currency, key_id, items }`.
2. Client opens Razorpay's Standard Checkout modal (`checkout.js`) using `order_id`, `amount`, `currency` and `key_id` from step 1. `src/services/payment-service/public/checkout.html` is a working reference implementation of this step.
3. On success, Razorpay's `handler` callback returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. The client sends all three to `POST /api/payments/verify-payment`.
4. The server recomputes `HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` and compares it to `razorpay_signature` using a constant-time comparison. Only on a match is the stored order flipped to `status: "paid"` — this is the "order placed" confirmation. A mismatch returns `400` and leaves the order unpaid.
5. If the user dismisses the modal or the payment fails, `checkout.html` shows that state and no order is ever marked paid.

## Auth Flow (OTP + JWT)

1. Request an OTP on the role-specific endpoint (`/auth/otp/request` for customer, `/auth/vendor/otp/request` for vendor, `/auth/master/otp/request` for admin/master).
2. In development (`NODE_ENV` not `production`), the response includes a `devOtp` field so you can test without a real SMS/email provider wired up. The OTP is also printed to the auth-service console.
3. Verify the OTP on the matching `.../otp/verify` endpoint. On success you get back `accessToken` (15m default) and `refreshToken` (7d default), scoped to that role.
4. Call protected routes with `Authorization: Bearer <accessToken>`.
5. When the access token expires, call `POST /auth/token/refresh` with the `refreshToken` to get a new pair (old refresh token is rotated/invalidated).
6. Call `POST /auth/logout` with the `refreshToken` to revoke it early.

## Example Requests

### Vendor login via gateway (OTP request + verify)

```bash
curl -X POST http://localhost:3000/api/auth/vendor/otp/request \
  -H "Content-Type: application/json" \
  -d '{"identifier":"9876543210"}'

curl -X POST http://localhost:3000/api/auth/vendor/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"identifier":"9876543210","otp":"<devOtp from previous response>"}'
```

### Create a product as a vendor (requires the accessToken from login)

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"name":"Laptop","price":999}'
```

### Create a user via gateway

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

### Get a user by id

```bash
curl http://localhost:3000/api/users/1
```

### Update a user

```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"email":"alice.new@example.com"}'
```

### Delete a user

```bash
curl -X DELETE http://localhost:3000/api/users/1
```

### Create a product via gateway

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999}'
```

### Get a product by id

```bash
curl http://localhost:3000/api/products/1
```

### Update a product

```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price":1299}'
```

### Delete a product

```bash
curl -X DELETE http://localhost:3000/api/products/1
```

### List the mock item catalog

```bash
curl http://localhost:3000/api/payments/items
```

### Create a Razorpay order via gateway

```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"item_bgauss_c12i","quantity":1}]}'
```

### Verify a Razorpay payment (use the values returned by the checkout modal / `checkout.html`)

```bash
curl -X POST http://localhost:3000/api/payments/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"razorpay_order_id":"order_xxx","razorpay_payment_id":"pay_xxx","razorpay_signature":"<signature>"}'
```

## Notes

- The gateway forwards requests to the auth/user/product/payment services.
- Swagger is available directly from the service ports for easy testing.
- The Swagger documentation files live in the `swagger-docs/auth`, `swagger-docs/user`, `swagger-docs/product` and `swagger-docs/payment` folders.
- `create-order` resolves item prices server-side from `data/items.json` — the client only sends `{ id, quantity }` pairs, never a price, so a request can't be tampered with to pay less.
- Open `http://localhost:3004/checkout.html` directly in a browser (with gateway + payment-service running) to run a real end-to-end Razorpay test-mode payment and get a real `razorpay_payment_id`/`razorpay_signature` pair to feed into `verify-payment` from Insomnia.
- OTP delivery is a dev-mode stub (console log + `devOtp` in the response). Swap the `console.log` in `src/services/auth-service/otp.js` for a real SMS/email provider before going to production, and make sure `NODE_ENV=production` so `devOtp` stops being echoed back.
- JWT secrets fall back to hardcoded dev defaults if not set — always set `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` via `.env` for anything beyond local testing.
