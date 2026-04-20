# Hybrid Deployment Checklist

## Overview
- **API**: Vercel (handles HTTP requests)
- **Workers**: Render (handles background jobs)
- **Database**: Neon PostgreSQL
- **Cache**: Upstash Redis

---

## ✅ Step 1: Database Setup (Neon)

### 1.1 Create Neon Account
- [ ] Go to https://neon.tech
- [ ] Sign up with GitHub
- [ ] Create project: "mahber-connect"

### 1.2 Get Connection String
- [ ] Copy connection string from dashboard
- [ ] Add pooling parameters:
```
postgresql://user:pass@host/db?sslmode=require&connection_limit=20&pool_timeout=30
```
- [ ] Save for later

---

## ✅ Step 2: Redis Setup (Upstash)

### 2.1 Create Upstash Account
- [ ] Go to https://upstash.com
- [ ] Sign up with GitHub
- [ ] Create Redis database: "mahber-connect-redis"

### 2.2 Get Redis Credentials
- [ ] Copy REDIS_HOST (e.g., `leading-tuna-81543.upstash.io`)
- [ ] Copy REDIS_PORT (usually `6379`)
- [ ] Copy REDIS_PASSWORD
- [ ] Save for later

---

## ✅ Step 3: Run Migrations on Neon

Before deploying, create tables in your Neon database:

```bash
# Set Neon DATABASE_URL temporarily
DATABASE_URL="postgresql://your-neon-connection-string" npx prisma migrate deploy
```

Or let Vercel/Render run it automatically during first deployment.

---

## ✅ Step 4: Deploy API to Vercel

### 4.1 Connect Repository
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Click "Add New Project"
- [ ] Import: `Mahber-connect-backend`

### 4.2 Configure Build Settings
Vercel should auto-detect, but verify:
- [ ] Framework Preset: Other
- [ ] Build Command: `pnpm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `pnpm install`

### 4.3 Add Environment Variables

Go to Project Settings → Environment Variables:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=30

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=7d

# Redis (Upstash)
REDIS_HOST=leading-tuna-81543.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

# Chapa
CHAPA_SECRET_KEY=CHASECK_TEST-your-key
CHAPA_BASE_URL=https://api.chapa.co/v1

# Firebase
FIREBASE_PROJECT_ID=mahber-connect
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mahber-connect.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:**
- [ ] Add variables to all environments (Production, Preview, Development)
- [ ] Wrap `FIREBASE_PRIVATE_KEY` in quotes with `\n` for newlines
- [ ] Generate strong `JWT_SECRET`

### 4.4 Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Test: `https://your-project.vercel.app/health`

---

## ✅ Step 5: Deploy Workers to Render

### 5.1 Create Render Account
- [ ] Go to https://render.com
- [ ] Sign up with GitHub

### 5.2 Create Background Worker
- [ ] Click "New +" → "Background Worker"
- [ ] Connect GitHub repository
- [ ] Configure:
  - Name: `mahber-connect-worker`
  - Region: Same as Neon database
  - Branch: `main`
  - Runtime: `Docker`
  - Dockerfile Path: `Dockerfile.worker`
  - Plan: `Free`

### 5.3 Add Environment Variables

Add the **same** environment variables as Vercel:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend.vercel.app

DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=30

JWT_SECRET=same-as-vercel
JWT_EXPIRES_IN=7d

REDIS_HOST=leading-tuna-81543.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

CHAPA_SECRET_KEY=CHASECK_TEST-your-key
CHAPA_BASE_URL=https://api.chapa.co/v1

FIREBASE_PROJECT_ID=mahber-connect
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mahber-connect.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 5.4 Deploy
- [ ] Click "Create Background Worker"
- [ ] Wait for build to complete
- [ ] Check logs for: "Background worker started successfully"

---

## ✅ Step 6: Testing

### 6.1 Test API (Vercel)
```bash
# Health check
curl https://your-project.vercel.app/health

# Register user
curl -X POST https://your-project.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+251912345678",
    "password": "Test123!@#",
    "full_name": "Test User"
  }'
```

### 6.2 Test Worker (Render)
- [ ] Go to Render dashboard
- [ ] Click worker service
- [ ] View logs
- [ ] Verify: "Listening for jobs on Redis queues..."

### 6.3 Test Background Jobs
- [ ] Create a payment or event
- [ ] Check Render logs for job processing
- [ ] Verify jobs complete successfully

---

## ✅ Step 7: Update Frontend

Update your frontend to point to Vercel API:

```javascript
const API_URL = 'https://your-project.vercel.app';
```

---

## 🔧 Troubleshooting

### Vercel: Prisma Client Error
**Fixed!** The build script now includes `prisma generate`.

If you still see the error:
1. Go to Vercel dashboard
2. Settings → General → Build & Development Settings
3. Build Command: `pnpm run build`
4. Redeploy

### Render: Worker Not Processing Jobs
1. Check Render logs for errors
2. Verify Redis credentials
3. Ensure worker is running (not sleeping)
4. Check Upstash dashboard for connection

### Database Connection Errors
1. Verify DATABASE_URL is correct
2. Check Neon dashboard - database might be paused
3. Ensure connection pooling parameters are set
4. Test connection: `psql $DATABASE_URL`

### Redis Connection Timeout
1. Verify Upstash credentials
2. Check free tier limits (10k commands/day)
3. Test connection from Render logs

---

## 📊 Monitoring

### Neon Database
- Dashboard: https://console.neon.tech
- Free tier: 0.5 GB storage, 1 compute hour/month
- Monitor storage usage

### Upstash Redis
- Dashboard: https://console.upstash.com
- Free tier: 10,000 commands/day
- Monitor command usage

### Vercel API
- Dashboard: https://vercel.com/dashboard
- Free tier: 100 GB bandwidth/month
- View function logs and analytics

### Render Worker
- Dashboard: https://dashboard.render.com
- Free tier: 750 hours/month (24/7 coverage)
- Spins down after 15 min inactivity
- View logs for job processing

---

## 🎯 Success Criteria

- [ ] Vercel API responds to `/health` endpoint
- [ ] User registration works
- [ ] Render worker logs show "Background worker started"
- [ ] Background jobs process successfully
- [ ] No errors in Vercel or Render logs
- [ ] Frontend can communicate with API

---

## 📝 Notes

- **Free tier limitations**: Worker sleeps after 15 min inactivity (30s cold start)
- **Upgrade path**: Render $7/month for always-on workers
- **Backup strategy**: Export Neon database periodically
- **Monitoring**: Set up alerts for errors in Vercel/Render dashboards

---

## 🚀 Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure Chapa webhooks to point to Vercel
3. Test all features end-to-end
4. Monitor usage and upgrade if needed
5. Set up CI/CD for automatic deployments
