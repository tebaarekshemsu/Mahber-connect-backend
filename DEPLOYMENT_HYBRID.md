# Hybrid Deployment Guide
## Free Production Setup: Neon + Vercel + Upstash + Render

This guide walks you through deploying MahberConnect Backend using a completely free stack:
- **Neon** (PostgreSQL) - Free tier, no expiration
- **Vercel** (API endpoints) - Free tier, unlimited
- **Upstash** (Redis) - Free tier, 10k commands/day
- **Render** (Background workers) - Free tier, 750 hours/month

---

## Architecture Overview

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Vercel (API)   │─────▶│ Neon (DB)    │
└─────────┬───────┘      └──────────────┘
          │
          │              ┌──────────────┐
          └─────────────▶│ Upstash      │
                         │ (Redis)      │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │ Render       │
                         │ (Workers)    │
                         └──────────────┘
```

**Why this split?**
- Vercel handles HTTP requests (stateless, fast)
- Render runs background jobs (BullMQ processors, cron tasks)
- Both share the same database and Redis

---

## Part 1: Database Setup (Neon)

### 1.1 Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub (free, no credit card)
3. Create a new project: "mahber-connect"

### 1.2 Get Connection String
1. In your Neon dashboard, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **Important**: Add connection pooling parameters:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=30
   ```

### 1.3 Save for Later
Keep this connection string - you'll need it for Vercel and Render.

---

## Part 2: Redis Setup (Upstash)

### 2.1 Create Upstash Account
1. Go to https://upstash.com
2. Sign up with GitHub (free, no credit card)
3. Create a new Redis database:
   - Name: "mahber-connect-redis"
   - Region: Choose closest to your users
   - Type: Regional (free tier)

### 2.2 Get Redis Credentials
1. In your database dashboard, find:
   - **UPSTASH_REDIS_REST_URL**: `https://xxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AXXXxxx...`
   
2. Also get the standard connection details:
   - **Host**: `xxx.upstash.io`
   - **Port**: `6379`
   - **Password**: `AXXXxxx...`

### 2.3 Save for Later
Keep these credentials for both Vercel and Render.

---

## Part 3: API Deployment (Vercel)

### 3.1 Prepare Vercel Configuration

Your project already has `vercel.json`. We need to create a serverless entry point.

### 3.2 Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 3.3 Deploy to Vercel

**Option A: Via GitHub (Recommended)**
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository: `Mahber-connect-backend`
5. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `pnpm install && pnpm prisma generate && pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

**Option B: Via CLI**
```bash
vercel
# Follow prompts
```

### 3.4 Set Environment Variables in Vercel

Go to Project Settings → Environment Variables and add:

```env
# Application
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Database (from Neon)
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=30

# JWT
JWT_SECRET=<generate-with: openssl rand -base64 64>
JWT_EXPIRES_IN=7d

# Redis (from Upstash)
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXXXxxx...

# Chapa Payment
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_BASE_URL=https://api.chapa.co/v1

# Firebase
FIREBASE_PROJECT_ID=mahber-connect
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mahber-connect.iam.gserviceaccount.com
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`, wrap the entire key in quotes and keep `\n` for newlines
- Generate a strong `JWT_SECRET` using: `openssl rand -base64 64`
- Set all variables for "Production", "Preview", and "Development" environments

### 3.5 Deploy
Click "Deploy" or run `vercel --prod`

Your API will be live at: `https://your-project.vercel.app`

---

## Part 4: Background Workers (Render)

### 4.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (free, no credit card)

### 4.2 Create Background Worker Service

1. Click "New +" → "Background Worker"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mahber-connect-worker`
   - **Region**: Choose closest to your database
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Docker Command**: Leave empty (uses Dockerfile)
   - **Plan**: Free

### 4.3 Set Environment Variables in Render

Add the same environment variables as Vercel:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=30

JWT_SECRET=<same-as-vercel>
JWT_EXPIRES_IN=7d

REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXXXxxx...

CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_BASE_URL=https://api.chapa.co/v1

FIREBASE_PROJECT_ID=mahber-connect
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mahber-connect.iam.gserviceaccount.com
```

### 4.4 Deploy
Click "Create Background Worker"

Render will:
1. Build your Docker image
2. Run database migrations
3. Start the worker process

---

## Part 5: Create Worker-Only Entry Point

We need to create a separate entry point that only runs background jobs (no HTTP server).

### 5.1 Create Worker Entry File

Create `src/worker.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');
  
  logger.log('Starting background worker...');
  
  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);
  
  logger.log('Background worker started successfully');
  logger.log('Listening for jobs on Redis queues...');
  
  // Keep the process alive
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
```

### 5.2 Update package.json

Add a worker script:

```json
"scripts": {
  "start:worker": "node dist/worker"
}
```

### 5.3 Create Render-Specific Dockerfile

Create `Dockerfile.worker`:

```dockerfile
# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json .npmrc ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

# ---- Production Stage ----
FROM node:18-alpine
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs prisma ./prisma

USER nestjs

# Run migrations and start worker
CMD npx prisma migrate deploy && node dist/worker.js
```

### 5.4 Update Render Configuration

In Render dashboard:
1. Go to your worker service settings
2. Change **Dockerfile Path** to: `Dockerfile.worker`
3. Save changes and redeploy

---

## Part 6: Testing the Deployment

### 6.1 Test API (Vercel)

```bash
# Health check
curl https://your-project.vercel.app/health

# Should return:
# {"status":"ok","timestamp":"2024-..."}
```

### 6.2 Test Database Connection

```bash
# Register a user
curl -X POST https://your-project.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+251912345678",
    "password": "Test123!@#",
    "full_name": "Test User"
  }'
```

### 6.3 Monitor Worker (Render)

1. Go to Render dashboard
2. Click on your worker service
3. View logs to see:
   - "Background worker started successfully"
   - "Listening for jobs on Redis queues..."

### 6.4 Test Background Jobs

Create a payment or event that triggers a background job and check Render logs.

---

## Part 7: Monitoring & Maintenance

### 7.1 Neon Database
- **Free tier limits**: 0.5 GB storage, 1 compute hour/month active time
- **Monitor**: Check dashboard for storage usage
- **Backup**: Neon auto-backs up, but export periodically:
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

### 7.2 Upstash Redis
- **Free tier limits**: 10,000 commands/day
- **Monitor**: Check dashboard for command usage
- **Optimize**: Use longer TTLs for cache to reduce commands

### 7.3 Vercel
- **Free tier limits**: 100 GB bandwidth/month, unlimited requests
- **Monitor**: Check analytics in dashboard
- **Logs**: View function logs for errors

### 7.4 Render Worker
- **Free tier limits**: 750 hours/month (enough for 24/7)
- **Sleep behavior**: Spins down after 15 min inactivity
- **Wake up**: First job after sleep takes ~30s to process
- **Monitor**: Check logs for job processing

---

## Part 8: Troubleshooting

### Issue: Vercel deployment fails

**Solution**: Check build logs. Common issues:
- Missing environment variables
- Prisma generation failed
- TypeScript errors

### Issue: Worker not processing jobs

**Solution**:
1. Check Render logs for errors
2. Verify Redis connection (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
3. Ensure worker is running (not sleeping)

### Issue: Database connection errors

**Solution**:
1. Verify DATABASE_URL is correct
2. Check Neon dashboard - database might be paused
3. Ensure connection pooling parameters are set

### Issue: Redis connection timeout

**Solution**:
1. Verify Upstash credentials
2. Check if you exceeded free tier limits (10k commands/day)
3. Use Upstash REST API as fallback

### Issue: Cold starts on Render

**Solution**:
- Free tier sleeps after 15 min inactivity
- First job after sleep takes ~30s
- Upgrade to paid tier ($7/month) for always-on

---

## Part 9: Cost Breakdown

| Service | Free Tier | Paid Upgrade |
|---------|-----------|--------------|
| **Neon** | 0.5 GB storage, 1 compute hour/month | $19/month for 10 GB |
| **Vercel** | 100 GB bandwidth, unlimited requests | $20/month for team features |
| **Upstash** | 10k commands/day | $0.2 per 100k commands |
| **Render** | 750 hours/month (sleeps after 15 min) | $7/month for always-on |

**Total free**: $0/month
**Total if you upgrade all**: ~$46/month

---

## Part 10: Scaling Considerations

### When to upgrade:

**Neon**: When you exceed 0.5 GB storage or need more compute time

**Upstash**: When you exceed 10k Redis commands/day (cache-heavy apps)

**Vercel**: When you exceed 100 GB bandwidth (unlikely for API)

**Render**: When you need always-on workers (no cold starts)

### Alternative free options:

- **Railway**: $5 free credit/month (runs ~1 week)
- **Fly.io**: 3 free VMs (always-on, but limited resources)
- **Supabase**: Alternative to Neon (500 MB free)

---

## Summary

You now have a fully functional, production-ready deployment:

✅ **API**: Vercel (fast, global CDN)
✅ **Database**: Neon (PostgreSQL, no expiration)
✅ **Cache**: Upstash (Redis, 10k commands/day)
✅ **Workers**: Render (background jobs, cron tasks)

All services are on free tiers with no credit card required (except Render for verification, but won't charge).

**Next steps**:
1. Set up your frontend to point to Vercel API
2. Configure Chapa webhooks to point to Vercel
3. Monitor usage and upgrade as needed
