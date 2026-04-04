# Deployment Guide

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm` or via `corepack enable`)
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL 15+ (for local non-Docker setup)
- Redis 7+ (for local non-Docker setup)

---

## Local Development Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Start in development mode (with hot reload)
pnpm start:dev
```

The API will be available at `http://localhost:3000`.  
Swagger docs: `http://localhost:3000/api`.

---

## Docker Deployment

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your production values
```

### 2. Start all services

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and the API container. The entrypoint automatically runs `prisma migrate deploy` before starting the app.

### 3. View logs

```bash
docker-compose logs -f api
```

### 4. Stop services

```bash
docker-compose down
```

To also remove volumes (destroys data):

```bash
docker-compose down -v
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | Yes | `development` or `production` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs — use a long random string in production |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `REDIS_HOST` | Yes | Redis hostname |
| `REDIS_PORT` | Yes | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | No | Redis password if auth is enabled |
| `CHAPA_SECRET_KEY` | Yes | Chapa payment gateway secret key |
| `CHAPA_BASE_URL` | No | Chapa API base URL (default: `https://api.chapa.co/v1`) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID for push notifications |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account client email |

> In production, set `JWT_SECRET` to a cryptographically random value (e.g., `openssl rand -base64 64`).

---

## Database Migrations

### Development

```bash
# Create and apply a new migration
pnpm prisma migrate dev --name <migration-name>

# Reset database (drops all data)
pnpm prisma migrate reset
```

### Production

```bash
# Apply pending migrations (safe, no data loss)
npx prisma migrate deploy
```

This is run automatically by `docker-entrypoint.sh` on container startup. For manual runs outside Docker:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

To inspect migration status:

```bash
npx prisma migrate status
```

---

## Health Check

```
GET /health
```

Returns:

```json
{ "status": "ok", "timestamp": "2024-01-17T12:00:00.000Z" }
```

The Docker container also has a built-in health check that polls this endpoint every 30 seconds. Use it to verify the container is ready:

```bash
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

---

## Monitoring

### Application logs

```bash
# Docker
docker-compose logs -f api

# Local
pnpm start:dev   # logs to stdout
```

Log entries include request method, path, status code, and duration via the logging interceptor.

### Slow query detection

The Prisma service logs queries exceeding 2000ms as warnings. Watch for lines like:

```
[Prisma] Slow query detected (2345ms): SELECT ...
```

Tune the threshold in `src/prisma/prisma.service.ts` if needed.

### Redis / BullMQ queues

Background job queues (payment reminders, fine calculation, lottery, join-request expiry) run via BullMQ. Monitor queue health by checking Redis connectivity:

```bash
redis-cli -h <host> ping
```

---

## Troubleshooting

**Container fails to start — migration error**

Check that `DATABASE_URL` is reachable from inside the container. In Docker Compose the host should be `postgres`, not `localhost`.

**`JWT_SECRET` not set**

The app will throw a validation error on startup. Ensure all required env vars are present (see table above).

**Push notifications not delivered**

Verify `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` are correct. The private key must preserve newlines — wrap it in double quotes in `.env`:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Chapa payment callbacks failing**

Ensure `CHAPA_SECRET_KEY` matches the key in your Chapa dashboard and that the callback URL is publicly reachable.

**Database connection pool exhausted**

Increase `connection_limit` in `DATABASE_URL`:

```
DATABASE_URL=postgresql://...?schema=public&connection_limit=30&pool_timeout=30
```

**Redis connection refused**

Confirm `REDIS_HOST` and `REDIS_PORT` are correct and that Redis is running. If Redis requires a password, set `REDIS_PASSWORD`.
