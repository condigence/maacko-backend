# MAAKO Backend

This project is a modular monolith: a single Express app, running as a single process on a single port, with each business domain (auth, users, products, payments, orders) kept in its own segregated, independent set of files under `src/services/`. There is no API gateway and no inter-service networking — every domain is mounted as an Express router on the same app.

Every domain is backed by the same MongoDB cluster (via Mongoose) — there is no mock/fallback mode and no other database. If `MONGO_URI` is unreachable, DB-backed endpoints return real errors instead of silently serving fake data.

- an auth service: two-step dual OTP signup (email + mobile, both verified together) and two-step single-identifier OTP login (email or mobile, role-scoped) - both issue a JWT access/refresh token pair, with rotation and logout.
- a user service backed by MongoDB
- a product service backed by MongoDB
- a payment service (Razorpay Standard Checkout) with its item catalog and orders stored in MongoDB
- an order service backed by MongoDB
- Swagger documentation for each domain

## Project Structure

- `src/app.js` - Builds the single Express app: connects to MongoDB, JSON body parsing, root `/health`, and mounts every service router under its `/api/*` prefix
- `src/bootstrap.js` - Entrypoint; starts the app on a single `PORT`
- `src/db/mongo.js` - MongoDB/Mongoose connection helper (single shared connection for every service)
- `src/models/` - Mongoose models: `User`, `SignupOtp`, `LoginOtp`, `RefreshToken`, `Product`, `Order`, `PaymentItem`, `PaymentOrder`
- `src/scripts/seedPaymentItems.js` - One-time seed for the payment-service item catalog (`npm run seed:payment-items`)
- `src/services/auth-service/index.js` - Auth router, including `/token/refresh` and `/logout`
- `src/services/auth-service/signup.js` - `POST /signup` and `POST /signup/verify` route handlers
- `src/services/auth-service/login.js` - `POST /login` and `POST /login/verify` route handlers
- `src/services/auth-service/otp.js` - OTP generation/verification against `SignupOtp` (dual-channel) and `LoginOtp` (single-channel)
- `src/services/auth-service/db.js` - `User` lookups/creation for signup and login
- `src/services/auth-service/tokens.js` - JWT access/refresh token issuance, rotation, and revocation against `RefreshToken`
- `src/services/auth-service/crypto.js` - OTP/JWT-id hashing and random generation helpers
- `src/services/auth-service/validators.js` - Email/mobile/role/identifier validation and normalization
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
- Signup step 1 - request OTP (email + mobile): `POST /api/auth/signup`
- Signup step 2 - verify both OTPs, creates the user, issues tokens: `POST /api/auth/signup/verify`
- Login step 1 - request OTP (email or mobile + role): `POST /api/auth/login`
- Login step 2 - verify the OTP, issues tokens: `POST /api/auth/login/verify`
- Refresh tokens (rotates the refresh token): `POST /api/auth/token/refresh`
- Logout (revokes a refresh token): `POST /api/auth/logout`
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

- **Auth service** — `SignupOtp` and `LoginOtp` (self-expiring via MongoDB TTL indexes), `User` (created only once signup's OTPs verify), and `RefreshToken` (also self-expiring). No separate setup needed.
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

## Signup Flow (dual OTP + JWT)

1. `POST /api/auth/signup` with `{ "name", "role", "email", "mobile" }`. The server validates the payload, checks no `User` already exists for that email/mobile, then generates and sends **two separate OTPs** - one to the email, one to the mobile number. No DB row is created at this point; the pending signup (name/role/email/mobile + both hashed OTPs) is held in the `SignupOtp` collection with a 5-minute TTL.
2. In development (`NODE_ENV` not `production`), the response includes `devEmailOtp`/`devMobileOtp` fields so you can test without a real SMS/email provider wired up. Both are also printed to the server console.
3. `POST /api/auth/signup/verify` with `{ "email", "email_otp", "mobile", "mobile_otp" }`. **Both** OTPs must be correct, and must belong to the same signup attempt (the exact email+mobile pair they were issued together for) - an OTP from one signup attempt can't be mixed with another. Only on full success is the `User` document created and an `accessToken` + `refreshToken` pair issued.
4. Call protected routes with `Authorization: Bearer <accessToken>`.
5. When the access token expires, call `POST /api/auth/token/refresh` with the `refreshToken` to get a new pair. The old refresh token is rotated - it's revoked the moment it's used, so it can't be replayed. Reusing an already-rotated or revoked refresh token fails with `401`.
6. Call `POST /api/auth/logout` with the `refreshToken` to revoke it early (e.g. on sign-out).

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","role":"customer","email":"jane@example.com","mobile":"9876543210"}'

curl -X POST http://localhost:3000/api/auth/signup/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","email_otp":"<devEmailOtp>","mobile":"9876543210","mobile_otp":"<devMobileOtp>"}'

curl -X POST http://localhost:3000/api/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken from previous step>"}'

curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

## Login Flow (single-identifier OTP + JWT)

For an *existing* user (created via signup) to sign back in.

1. `POST /api/auth/login` with `{ "role", "identifier" }`, where `identifier` is either the email or the mobile number. The server looks up a `User` matching both `identifier` (email or mobile) **and** `role` - if none matches, it returns a generic `404` regardless of whether the identifier doesn't exist at all or exists under a different role, so the endpoint can't be used to enumerate registered accounts. On a match, it sends a single OTP to that identifier.
2. In development, the response includes a `devOtp` field, and it's also printed to the server console.
3. `POST /api/auth/login/verify` with `{ "role", "identifier", "otp" }`. On success, issues a fresh `accessToken` + `refreshToken` pair for that user - same rotation/logout mechanics as signup's tokens.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","identifier":"jane@example.com"}'

curl -X POST http://localhost:3000/api/auth/login/verify \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","identifier":"jane@example.com","otp":"<devOtp>"}'
```

## Example Requests

### Create a product as a vendor (requires an accessToken from signup)

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
  -d '{"first_name":"Alice","email":"alice@example.com","mobile":"9876500001","role":"customer"}'
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
- OTP delivery is a dev-mode stub (console log + `devEmailOtp`/`devMobileOtp` in the response). Swap the `console.log` calls in `src/services/auth-service/otp.js` for real email/SMS providers before going to production, and make sure `NODE_ENV=production` so the dev OTPs stop being echoed back.
- JWT secrets fall back to hardcoded dev defaults if not set — always set `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` via `.env` for anything beyond local testing.
