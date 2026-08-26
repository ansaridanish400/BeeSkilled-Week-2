# To-Do List REST API

Express + MongoDB (Mongoose) REST API for managing tasks. Supports **add**, **update**, and **delete** plus full CRUD with filtering, pagination, and extras.

## Tech
- Node.js 22, Express 4, Mongoose 8
- MongoDB 8 (local `mongod` or Atlas)

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Configure
cp .env.example .env
# edit .env -> MONGODB_URI=mongodb://127.0.0.1:27017/todo-api

# 3. Ensure MongoDB is running
mongod --dbpath /tmp/mongodb_data --logpath /tmp/mongod.log --fork
# or: docker run -d -p 27017:27017 mongo:7

# 4. Run
npm start          # production
npm run dev        # nodemon

# Server: http://localhost:3000
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | API info |
| GET | `/health` | Health check |
| POST | `/api/tasks` | **Add task** |
| GET | `/api/tasks` | List tasks (query: `completed`, `priority`, `search`, `sort`, `page`, `limit`) |
| GET | `/api/tasks/:id` | Get one task |
| PUT | `/api/tasks/:id` | **Update task** (full) |
| PATCH | `/api/tasks/:id` | Partial update |
| PATCH | `/api/tasks/:id/toggle` | Toggle `completed` |
| DELETE | `/api/tasks/:id` | **Delete task** |
| DELETE | `/api/tasks/completed/clear` | Bulk delete completed |

### Task Schema
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs",
  "completed": false,
  "priority": "low|medium|high",
  "dueDate": "2026-08-30T00:00:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Examples (cURL)

```bash
# Create
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","description":"Milk, eggs","priority":"high"}'

# List
curl http://localhost:3000/api/tasks

# Filter incomplete + search
curl "http://localhost:3000/api/tasks?completed=false&search=groceries"

# Update (PUT)
curl -X PUT http://localhost:3000/api/tasks/<ID> \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries - done","completed":true}'

# Partial (PATCH)
curl -X PATCH http://localhost:3000/api/tasks/<ID> \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Toggle
curl -X PATCH http://localhost:3000/api/tasks/<ID>/toggle

# Delete
curl -X DELETE http://localhost:3000/api/tasks/<ID>
```

## Postman

1. Import `postman_collection.json` in Postman (File → Import).
2. Set variable `baseUrl` to `http://localhost:3000` (or use env).
3. Run folder **Tasks CRUD** in order: Create → List → Get One (replace `:id`) → Update → Toggle → Delete.
4. Error cases included for validation checks.

## Project Structure

```
assignment-1/
  config/db.js
  controllers/taskController.js
  middleware/errorHandler.js
  models/Task.js
  routes/taskRoutes.js
  server.js
  postman_collection.json
  .env.example
```

## Errors
- `400` invalid ID / validation
- `404` not found (task or route)
- `500` internal with stack in non-production
