# MAAKO Microservices Project

This project contains a small microservice architecture with:
- an API gateway
- a user service connected to MySQL
- a product service connected to MongoDB
- Swagger documentation for each service

## Project Structure

- `src/gateway/index.js` - API gateway
- `src/services/user-service/index.js` - User service entrypoint
- `src/services/product-service/index.js` - Product service entrypoint
- `src/db/mysql.js` - MySQL connection helper
- `src/db/mongo.js` - MongoDB/Mongoose connection helper
- `swagger-docs/user/user-swagger.js` - Swagger setup for the user service
- `swagger-docs/product/product-swagger.js` - Swagger setup for the product service

## Run the Services

Install dependencies:

```bash
npm install
```

Start the services:

```bash
npm run user-service
npm run product-service
npm run gateway
```

## Ports

- Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Product Service: http://localhost:3002

## API Endpoints

### Gateway

- Health check: `GET /health`
- Get users: `GET /api/users`
- Get user by id: `GET /api/users/:id`
- Create user: `POST /api/users`
- Update user: `PUT /api/users/:id`
- Delete user: `DELETE /api/users/:id`
- Get products: `GET /api/products`
- Get product by id: `GET /api/products/:id`
- Create product: `POST /api/products`
- Update product: `PUT /api/products/:id`
- Delete product: `DELETE /api/products/:id`

### User Service

- Health check: `GET /health`
- Get users: `GET /users`
- Get user by id: `GET /users/:id`
- Create user: `POST /users`
- Update user: `PUT /users/:id`
- Delete user: `DELETE /users/:id`

### Product Service

- Health check: `GET /health`
- Get products: `GET /products`
- Get product by id: `GET /products/:id`
- Create product: `POST /products`
- Update product: `PUT /products/:id`
- Delete product: `DELETE /products/:id`

## Swagger Documentation

Swagger UI is served directly from each service:

- User Service Swagger: http://localhost:3001/api-docs
- User Service Swagger (alternate route): http://localhost:3001/users/api-docs
- Product Service Swagger: http://localhost:3002/api-docs
- Product Service Swagger (alternate route): http://localhost:3002/products/api-docs

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

### MongoDB (Product Service)

Set these environment variables if needed:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/maako_products
```

## Example Requests

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

## Notes

- The gateway forwards requests to the user/product services.
- Swagger is available directly from the service ports for easy testing.
- The Swagger documentation files now live in the `swagger-docs/user` and `swagger-docs/product` folders.
