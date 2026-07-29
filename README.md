# MAAKO Backend

This project is a modular monolith: a single Express app, running as a single process on a single port, with each business domain (auth, users, products, payments, orders) kept in its own segregated, independent set of files under `src/services/`. There is no API gateway and no inter-service networking — every domain is mounted as an Express router on the same app.

Every domain is backed by the same MongoDB cluster (via Mongoose) — there is no mock/fallback mode and no other database. If `MONGO_URI` is unreachable, DB-backed endpoints return real errors instead of silently serving fake data.

- an auth service (OTP + JWT login for customer/vendor/admin), accounts/OTP codes/refresh tokens stored in MongoDB
- a user service backed by MongoDB
- a product service backed by MongoDB
- a payment service (Razorpay Standard Checkout) with its item catalog and orders stored in MongoDB
- an order service backed by MongoDB
- Swagger documentation for each domain

## Project Structure

- `src/app.js` - Builds the single Express app: connects to MongoDB, JSON body parsing, root `/health`, and mounts every service router under its `/api/*` prefix
- `src/bootstrap.js` - Entrypoint; starts the app on a single `PORT`
- `src/db/mongo.js` - MongoDB/Mongoose connection helper (single shared connection for every service)
- `src/models/` - Mongoose models: `User`, `Product`, `Order`, `Account`, `OtpCode`, `RefreshToken`, `PaymentItem`, `PaymentOrder`
- `src/scripts/seedPaymentItems.js` - One-time seed for the payment-service item catalog (`npm run seed:payment-items`)
- `src/services/auth-service/index.js` - Auth router (OTP login, JWT access/refresh tokens)
- `src/services/user-service/index.js` - User router
- `src/services/product-service/index.js` - Product router
- `src/services/order-service/index.js` - Order router
- `src/services/payment-service/index.js` - Payment router (Razorpay Standard Checkout)
- `src/services/payment-service/routes.js` - `create-order` / `verify-payment` route handlers
- `src/services/payment-service/razorpay.js` - Razorpay SDK client + HMAC signature verification
- `src/services/payment-service/store.js` - Reads/writes the item catalog and order collections in MongoDB
- `src/services/payment-service/public/checkout.html` - Standalone Razorpay Standard Checkout demo page
- `src/middleware/auth.js` - Shared `requireAuth`/`requireRole` JWT middleware used by every service
- `swagger-docs/auth/auth-swagger.js` - Swagger setup for the auth router
- `swagger-docs/user/user-swagger.js` - Swagger setup for the user router
- `swagger-docs/product/product-swagger.js` - Swagger setup for the product router
- `swagger-docs/payment/payment-swagger.js` - Swagger setup for the payment router
- `swagger-docs/order/order-swagger.js` - Swagger setup for the order router

Each service directory only imports shared infrastructure (`src/db`, `src/models`, `src/middleware`) — services never import from one another.

## Run the App

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in real values — `.env.example` intentionally ships with variable names only, no values, so it's safe to commit. `.env` itself is git-ignored and is the only file the app actually reads:

```bash
cp .env.example .env
```

At minimum you need a working `MONGO_URI` (every service depends on it) and real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (payment-service has no fallback). Then seed the payment item catalog once against your cluster:

```bash
npm run seed:payment-items
```

Start the app:

```bash
npm start        # node src/bootstrap.js
npm run dev       # nodemon src/bootstrap.js
```

Everything — auth, users, products, payments, orders — runs in this one process on one port.

## Port

- App: http://localhost:3000 (set via `PORT`, defaults to `3000`)

## API Endpoints

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
- List item catalog: `GET /api/payments/items`
- Create a Razorpay order: `POST /api/payments/create-order`
- Verify a Razorpay payment signature: `POST /api/payments/verify-payment`
- List Razorpay orders: `GET /api/payments/orders`
- Get Razorpay order by id: `GET /api/payments/orders/:orderId`
- Standalone checkout demo page: `GET /api/payments/checkout.html`
- Get orders (admin only): `GET /api/orders`
- Get order by id: `GET /api/orders/:id`
- Place a new order: `POST /api/orders`
- Update order status (admin/vendor): `PUT /api/orders/:id/status`

Every router also exposes its own `GET /api/<domain>/health` (e.g. `/api/users/health`) in addition to the app-wide `/health`.

## Swagger Documentation

Swagger UI is served per domain, under that domain's own path prefix, from the single app:

- Auth Swagger: http://localhost:3000/api/auth/api-docs
- User Swagger: http://localhost:3000/api/users/api-docs
- Product Swagger: http://localhost:3000/api/products/api-docs
- Payment Swagger: http://localhost:3000/api/payments/api-docs
- Order Swagger: http://localhost:3000/api/orders/api-docs

## Database Configuration

### MongoDB (every service)

One connection string backs all five domains — there's a single Mongoose default connection, established once in `src/app.js`:

```bash
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/<db-name>
```

Any MongoDB works (a local `mongod`, Docker, or a hosted Atlas cluster) — just point `MONGO_URI` at it. If the connection fails or `MONGO_URI` is unset, the server still starts (so a bad DB doesn't take down the whole app in serverless), but every DB-backed route returns a `500` until it's fixed — check the server logs for the connection error.

- **Auth service** — `Account`, `OtpCode`, `RefreshToken` collections. No separate setup needed; documents are created as accounts log in.
- **User, Product, Order services** — `User`, `Product`, `Order` collections, created on first write. No manual schema/table setup required (Mongoose enforces the schema at the application layer).
- **Payment service** — `PaymentItem` (item catalog) and `PaymentOrder` (Razorpay orders) collections. The item catalog has no create endpoint (`checkout.html` and the demo cart reference fixed item ids directly), so seed it once per cluster:

  ```bash
  npm run seed:payment-items
  ```

  It also requires real Razorpay credentials — there is no fallback:

  ```bash
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
  ```

  Get test-mode keys from the Razorpay Dashboard → Settings → API Keys. `RAZORPAY_KEY_SECRET` is only ever read server-side (`razorpay.js`); it is never sent in any API response.

## Payment Flow (Razorpay Standard Checkout)

1. Client calls `POST /api/payments/create-order` with `{ "items": [{ "id": "item_bgauss_c12i", "quantity": 1 }] }`. The server looks up each item's price from the MongoDB-backed catalog (client-supplied prices are never trusted), computes the total in paise, and creates a Razorpay order via the Orders API. Response: `{ order_id, amount, currency, key_id, items }`.
2. Client opens Razorpay's Standard Checkout modal (`checkout.js`) using `order_id`, `amount`, `currency` and `key_id` from step 1. `src/services/payment-service/public/checkout.html` (served at `/api/payments/checkout.html`) is a working reference implementation of this step.
3. On success, Razorpay's `handler` callback returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. The client sends all three to `POST /api/payments/verify-payment`.
4. The server recomputes `HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` and compares it to `razorpay_signature` using a constant-time comparison. Only on a match is the stored order flipped to `status: "paid"` — this is the "order placed" confirmation. A mismatch returns `400` and leaves the order unpaid.
5. If the user dismisses the modal or the payment fails, `checkout.html` shows that state and no order is ever marked paid.

## Auth Flow (OTP + JWT)

1. Request an OTP on the role-specific endpoint (`/api/auth/otp/request` for customer, `/api/auth/vendor/otp/request` for vendor, `/api/auth/master/otp/request` for admin/master).
2. In development (`NODE_ENV` not `production`), the response includes a `devOtp` field so you can test without a real SMS/email provider wired up. The OTP is also printed to the server console.
3. Verify the OTP on the matching `.../otp/verify` endpoint. On success you get back `accessToken` (15m default) and `refreshToken` (7d default), scoped to that role.
4. Call protected routes with `Authorization: Bearer <accessToken>`.
5. When the access token expires, call `POST /api/auth/token/refresh` with the `refreshToken` to get a new pair (old refresh token is rotated/invalidated).
6. Call `POST /api/auth/logout` with the `refreshToken` to revoke it early.

## Example Requests

### Vendor login (OTP request + verify)

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

### Create a user (requires an admin accessToken)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"first_name":"Alice","email":"alice@example.com"}'
```

### Get a user by id

IDs are MongoDB ObjectIds — use the `_id` returned by `POST /api/users` or `GET /api/users`.

```bash
curl http://localhost:3000/api/users/<user_id>
```

### Update a user

```bash
curl -X PUT http://localhost:3000/api/users/<user_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"email":"alice.new@example.com"}'
```

### Delete a user

```bash
curl -X DELETE http://localhost:3000/api/users/<user_id> \
  -H "Authorization: Bearer <accessToken>"
```

### Get a product by id

```bash
curl http://localhost:3000/api/products/<product_id>
```

### Update a product

```bash
curl -X PUT http://localhost:3000/api/products/<product_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"price":1299}'
```

### Delete a product

```bash
curl -X DELETE http://localhost:3000/api/products/<product_id> \
  -H "Authorization: Bearer <accessToken>"
```

### List the item catalog

```bash
curl http://localhost:3000/api/payments/items
```

### Create a Razorpay order

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

### Place an order (requires an accessToken)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"user_id":"1","items":[{"product_id":"p1","product_name":"Laptop","quantity":1,"unit_price":999}],"shipping_address":{"city":"Bengaluru","state":"KA","pincode":"560001"}}'
```

## Notes

- There is no gateway and no inter-process networking — `src/app.js` mounts every domain router directly onto one Express app, which `src/bootstrap.js` starts on a single port.
- Swagger is available per domain under `/api/<domain>/api-docs` on that same port.
- The Swagger documentation files live in the `swagger-docs/auth`, `swagger-docs/user`, `swagger-docs/product`, `swagger-docs/payment` and `swagger-docs/order` folders.
- `create-order` resolves item prices server-side from the `PaymentItem` collection — the client only sends `{ id, quantity }` pairs, never a price, so a request can't be tampered with to pay less.
- Open `http://localhost:3000/api/payments/checkout.html` directly in a browser to run a real end-to-end Razorpay test-mode payment and get a real `razorpay_payment_id`/`razorpay_signature` pair to feed into `verify-payment` from Insomnia.
- OTP delivery is a dev-mode stub (console log + `devOtp` in the response). Swap the `console.log` in `src/services/auth-service/otp.js` for a real SMS/email provider before going to production, and make sure `NODE_ENV=production` so `devOtp` stops being echoed back.
- JWT secrets fall back to hardcoded dev defaults if not set — always set `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` via `.env` for anything beyond local testing.
