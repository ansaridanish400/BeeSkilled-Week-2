# Notes App Backend

Express + MongoDB (Mongoose) REST API for **notes-taking** with **CRUD operations** secured by **JWT authentication**. Each user owns their notes — all note routes are private.

## Tech
- Node.js 22, Express 4, Mongoose 8
- `bcryptjs` for password hashing (salt 10)
- `jsonwebtoken` for JWT (Bearer token)
- MongoDB 8 (local `mongod` or Atlas)

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
npm start          # production  -> http://localhost:3002
npm run dev        # nodemon
```

## Env Variables

```
PORT=3002
MONGODB_URI=mongodb://127.0.0.1:27017/notes-app
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
```

## Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Public | API info |
| GET | `/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register `{ name*, email*, password* }` → `{ token, user }` |
| POST | `/api/auth/login` | Public | Login `{ email*, password* }` → `{ token, user }` |
| GET | `/api/auth/me` | Private | Get current user |
| POST | `/api/notes` | Private | Create note `{ title*, content, tags[], color, isPinned, isArchived }` |
| GET | `/api/notes` | Private | List own notes (filters below) |
| GET | `/api/notes/:id` | Private | Get one note (owner only) |
| PUT | `/api/notes/:id` | Private | Full update note |
| PATCH | `/api/notes/:id` | Private | Partial update note |
| PATCH | `/api/notes/:id/pin` | Private | Toggle pin |
| PATCH | `/api/notes/:id/archive` | Private | Toggle archive |
| DELETE | `/api/notes/:id` | Private | Delete note |

### Query Params for `GET /api/notes`
`search` (title/content substring, case-insensitive), `tags` (comma-separated), `isPinned` (true/false), `isArchived` (true/false), `color` (default/yellow/green/blue/pink/purple), `sort` (e.g. `sort=-updatedAt,title`), `page`, `limit`.

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

### Note Schema
```json
{
  "user": "ObjectId (owner)",
  "title": "Meeting notes",
  "content": "Discuss project timeline...",
  "tags": ["work", "meeting"],
  "isPinned": false,
  "isArchived": false,
  "color": "default|yellow|green|blue|pink|purple",
  "createdAt": "...",
  "updatedAt": "..."
}
```
- `user` refs `User`, indexed for ownership isolation.
- `tags` max 10, normalized to lowercase trimmed unique strings.
- `title` required, max 200; `content` max 5000.
- Ownership enforced: users can only read/update/delete their own notes.

## Examples (cURL)

```bash
# Register
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
# -> { "success": true, "token": "eyJ...", "user": { "id": "...", "name": "John Doe", "email": "john@example.com" } }

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

TOKEN=<token_from_above>

# Create note (private)
curl -X POST http://localhost:3002/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meeting notes","content":"Discuss timeline","tags":["work"],"color":"yellow"}'

# List notes
curl http://localhost:3002/api/notes -H "Authorization: Bearer $TOKEN"

# Search + filter
curl "http://localhost:3002/api/notes?search=meeting&isPinned=false&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Get one
curl http://localhost:3002/api/notes/<ID> -H "Authorization: Bearer $TOKEN"

# Update (PUT or PATCH)
curl -X PUT http://localhost:3002/api/notes/<ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meeting notes - updated","content":"New content"}'

# Toggle pin
curl -X PATCH http://localhost:3002/api/notes/<ID>/pin -H "Authorization: Bearer $TOKEN"

# Toggle archive
curl -X PATCH http://localhost:3002/api/notes/<ID>/archive -H "Authorization: Bearer $TOKEN"

# Delete
curl -X DELETE http://localhost:3002/api/notes/<ID> -H "Authorization: Bearer $TOKEN"

# No token -> 401
curl http://localhost:3002/api/notes
# -> { "success": false, "message": "Not authorized, no token provided" }
```

## Auth Flow

1. `POST /api/auth/register` or `/api/auth/login` returns `token` (JWT `{ id }`).
2. Client sends `Authorization: Bearer <token>` on all `/api/notes` and `/api/auth/me` requests.
3. `middleware/auth.js` verifies JWT, loads user, sets `req.user`. Invalid/expired token -> `401`.

## Postman

1. Import `postman_collection.json` (File → Import).
2. Set `baseUrl` to `http://localhost:3002`.
3. Run in order: **Register → Login** (auto-saves `authToken`) → **Notes CRUD** → **Auth protection checks**.
4. Collection includes error cases (duplicate email, invalid token, no token, cross-user isolation not shown but enforced).

## Project Structure

```
mini-project/
  config/db.js
  controllers/authController.js
  controllers/noteController.js
  middleware/auth.js
  middleware/errorHandler.js
  models/User.js
  models/Note.js
  routes/authRoutes.js
  routes/noteRoutes.js
  server.js
  postman_collection.json
  .env.example
```

## Security Notes

- Passwords `select: false`, hashed via `bcryptjs` pre-save, never returned.
- JWT secret must be strong, stored in `.env` (not committed).
- Token expiry configurable via `JWT_EXPIRE` (default `7d`).
- Notes ownership enforced at query level (`{ _id, user: req.user.id }`), preventing IDOR.

## Errors

- `400` validation (missing title, bad ID format, too many tags, invalid color)
- `401` invalid credentials / missing or invalid JWT
- `404` note or route not found (note not found also covers not-owned)
- `500` internal (stack in non-production)
