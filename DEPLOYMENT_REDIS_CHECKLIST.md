# Redis Deployment Checklist

## ✅ For Production Deployment (Vercel, Render, Railway, etc.)

### 1. Environment Variables to Set

Make sure these environment variables are set in your deployment platform:

```bash
# Redis Configuration (Upstash)
REDIS_HOST=intent-lark-83301.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA
REDIS_TLS=true  # ⚠️ CRITICAL: Must be set to "true" for Upstash
```

### 2. Platform-Specific Instructions

#### **Vercel**
1. Go to your project → Settings → Environment Variables
2. Add each variable:
   - `REDIS_HOST` = `intent-lark-83301.upstash.io`
   - `REDIS_PORT` = `6379`
   - `REDIS_PASSWORD` = `gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA`
   - `REDIS_TLS` = `true`
3. Redeploy your application

#### **Render**
1. Go to your service → Environment
2. Add each variable (same as above)
3. Click "Save Changes" (auto-redeploys)

#### **Railway**
1. Go to your project → Variables
2. Add each variable (same as above)
3. Railway will auto-redeploy

#### **Heroku**
```bash
heroku config:set REDIS_HOST=intent-lark-83301.upstash.io
heroku config:set REDIS_PORT=6379
heroku config:set REDIS_PASSWORD=gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA
heroku config:set REDIS_TLS=true
```

#### **Docker / Docker Compose**
Update your `docker-compose.yml` or pass env vars:

```yaml
services:
  api:
    environment:
      - REDIS_HOST=intent-lark-83301.upstash.io
      - REDIS_PORT=6379
      - REDIS_PASSWORD=gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA
      - REDIS_TLS=true
```

Or use `.env.prod` file:
```bash
docker run --env-file .env.prod your-image
```

---

## 🧪 Testing Production Redis

### 1. Check Health Endpoint

After deployment, test the health check:

```bash
curl https://your-api.com/health/detailed
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 2. Check Application Logs

Look for these log messages:

✅ **Success:**
```
[HealthController] Redis config - REDIS_TLS env var: true
[HealthController] Redis config - tlsEnabled: true
[HealthController] Attempting Redis connection to intent-lark-83301.upstash.io:6379 with TLS: true
[HealthController] Redis connection successful, PING response: PONG
```

❌ **Failure (missing REDIS_TLS):**
```
[HealthController] Redis config - REDIS_TLS env var: undefined
[HealthController] Redis config - tlsEnabled: false
[HealthController] Attempting Redis connection to intent-lark-83301.upstash.io:6379 with TLS: false
[HealthController] Redis connection failed: Connection is closed
```

### 3. Test Background Jobs

Background jobs (fines, reminders, lottery) use Redis queues. Test by:

1. Creating a test payment
2. Checking if payment reminders are sent
3. Verifying fine calculations run daily

---

## 🔧 Troubleshooting

### Issue: Redis shows "down" in health check

**Solution:**
1. Verify `REDIS_TLS=true` is set in environment variables
2. Check logs for actual error message
3. Verify Upstash Redis is active (not paused)
4. Test connection with the test script:

```bash
node test-redis.js
```

### Issue: Background jobs not running

**Symptoms:**
- Payment reminders not sent
- Fines not calculated
- Lottery not executing

**Solution:**
1. Check Redis connection: `GET /health/detailed`
2. Verify BullMQ queues are connected
3. Check application logs for queue errors

### Issue: "Connection is closed" error

**Cause:** `REDIS_TLS` is not set or is `false`

**Solution:** Set `REDIS_TLS=true` in environment variables and redeploy

---

## 📝 Local vs Production Configuration

### Local Development (Docker Redis)
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

### Production (Upstash Redis)
```bash
REDIS_HOST=intent-lark-83301.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA
REDIS_TLS=true  # ⚠️ MUST BE TRUE
```

---

## ✅ Deployment Verification Checklist

- [ ] `REDIS_TLS=true` is set in production environment variables
- [ ] Health check returns `redis: { status: 'up' }`
- [ ] Application logs show "Redis connection successful"
- [ ] Background jobs are running (check payment reminders)
- [ ] No "Connection is closed" errors in logs
- [ ] BullMQ queues are processing jobs

---

## 🚀 Quick Deploy Commands

### Vercel
```bash
vercel --prod
```

### Render
```bash
git push origin main  # Auto-deploys
```

### Railway
```bash
railway up
```

### Docker
```bash
docker build -t mahberconnect-api .
docker run --env-file .env.prod -p 3000:3000 mahberconnect-api
```

---

## 📞 Support

If Redis connection still fails after following this checklist:

1. Check Upstash dashboard: https://console.upstash.com
2. Verify Redis instance is active
3. Test connection with `test-redis.js` script
4. Check application logs for detailed error messages
5. Verify all environment variables are set correctly

---

**Last Updated:** April 28, 2026
**Redis Provider:** Upstash
**TLS Required:** Yes
