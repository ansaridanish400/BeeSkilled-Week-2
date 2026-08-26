# User Authentication API

Express + MongoDB (Mongoose) REST API for **user registration & login** with **bcrypt password encryption** and **JWT-based authentication**.

## Tech
- Node.js 22, Express 4, Mongoose 8
- `bcryptjs` for password hashing (salt 10)
- `jsonwebtoken` for JWT (Bearer token)
- MongoDB 8

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# edit .env -> MONGODB_URI, JWT_SECRET, JWT_EXPIRE

# 3. Ensure MongoDB is running
mongod --dbpath /tmp/mongodb_data --logpath /tmp/mongod.log --fork --bind_ip 127.0.0.1
# or: docker run -d -p 27017:27017 mongo:7

# 4. Run
npm start          # production  -> http://localhost:3001
npm run dev        # nodemon
```

## Env Variables

```
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/auth-api
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
```

## Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Public | API info |
| GET | `/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register `{ name*, email*, password* }` |
| POST | `/api/auth/login` | Public | Login `{ email*, password* }` → `{ token, user }` |
| GET | `/api/auth/me` | Private | Get current user (requires `Authorization: Bearer <token>`) |

### User Schema

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed (never returned)",
  "createdAt": "...",
  "updatedAt": "..."
}
```

- `email` is unique, lowercased, validated via regex.
- `password` is `select: false`, hashed via `bcryptjs` pre-save hook, min 6 chars.
- JWT payload: `{ id: userId }`, verified in `middleware/auth.js`.

## Examples (cURL)

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# -> { "success": true, "token": "eyJ...", "user": { "id": "...", "name": "John Doe", "email": "john@example.com" } }

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get current user (protected)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# Duplicate email -> 400
# Wrong password -> 401 Invalid credentials
# Missing/invalid token -> 401 Not authorized
```

## Postman

1. Import `postman_collection.json` in Postman (File → Import).
2. Set variable `baseUrl` to `http://localhost:3001`.
3. Run in order: **Register → Login → Get Me (with token)**.  
   Login request auto-saves `authToken` variable for `Get Me`.

## Project Structure

```
assignment-2/
  config/db.js
  controllers/authController.js
  middleware/auth.js
  middleware/errorHandler.js
  models/User.js
  routes/authRoutes.js
  server.js
  postman_collection.json
  .env.example
```

## Security Notes

- Passwords are never returned in responses (`select: false` + explicit exclusion).
- `bcryptjs` with salt rounds 10; comparison via `bcrypt.compare`.
- JWT secret must be strong and kept in `.env` (not committed).
- Token expiry defaults to `7d` (configurable via `JWT_EXPIRE`).

## Errors

- `400` validation (missing fields, short password, duplicate email)
- `401` invalid credentials / invalid or missing token
- `404` route not found
- `500` internal (stack in non-production)
