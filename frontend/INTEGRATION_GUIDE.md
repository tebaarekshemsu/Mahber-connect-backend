# MahberConnect — Integration Testing & Deployment Guide

> **Audience**: Integration tester (human + coding agent) responsible for deploying the backend, connecting the frontend, and running end-to-end verification.

---

## 1. Project Overview

MahberConnect is a community financial management platform (Equb/Iddir) built with:
- **Backend**: NestJS + Prisma + PostgreSQL + Redis + Chapa (payments) + Firebase (push notifications)
- **Frontend**: Next.js 14 (App Router) + React Query + Zustand + Zod

The frontend is located at `frontend/` inside the main backend repository.

---

## 2. Architecture: Dual-Layer Service Factory

The frontend uses a **service factory pattern** that toggles between mock data and real API calls via a single environment variable:

```
NEXT_PUBLIC_USE_MOCK=true   →  Uses in-memory mock services (no backend needed)
NEXT_PUBLIC_USE_MOCK=false  →  Uses real Axios calls to the NestJS backend
```

The factory is at: `frontend/src/lib/api/service-factory.ts`

All 7 service domains are wired:
| Service | Mock File | Real API File |
|---------|-----------|---------------|
| `authService` | `auth.mock.ts` | `auth.api.ts` |
| `mahberService` | `mahber.mock.ts` | `mahber.api.ts` |
| `financialService` | `financial.mock.ts` | `financial.api.ts` |
| `memberService` | `member.mock.ts` | `member.api.ts` |
| `eventService` | `event.mock.ts` | `event.api.ts` |
| `communicationService` | `communication.mock.ts` | `communication.api.ts` |
| `auditService` | `audit.mock.ts` | `audit.api.ts` |

---

## 3. Backend Setup

### 3.1 Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Neon for cloud)
- Redis (or Upstash for cloud)
- pnpm (package manager)

### 3.2 Environment Variables
Copy `.env.example` to `.env` in the backend root and fill in:

```env
# Application
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/mahber_connect?schema=public&connection_limit=20&pool_timeout=30

# JWT
JWT_SECRET=<generate with: openssl rand -base64 64>
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Chapa Payment Gateway
CHAPA_SECRET_KEY=<get from https://dashboard.chapa.co>
CHAPA_BASE_URL=https://api.chapa.co/v1

# Firebase Cloud Messaging (optional for local testing)
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>
```

### 3.3 Install & Run Backend
```bash
cd Mahber-connect-backend
pnpm install
npx prisma generate
npx prisma db push        # Creates all tables from schema.prisma
pnpm run start:dev         # Starts NestJS on port 3000
```

### 3.4 Seed Data (Optional)
If there's no seed file, you'll need to create test users manually via the API:
```bash
# Register a test user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "0911223344", "password": "password123", "name": "Test Admin"}'

# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "0911223344", "password": "password123"}'
# → Save the access_token from the response
```

---

## 4. Frontend Setup

### 4.1 Environment Variables
Create `frontend/.env.local`:

```env
# Point to backend (change port if backend runs elsewhere)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=true
```

### 4.2 Install & Run Frontend
```bash
cd frontend
npm install
npm run dev    # Starts Next.js on port 3001 (or 3000 if backend is on different port)
```

> **IMPORTANT**: If both backend and frontend default to port 3000, change the frontend port:
> ```bash
> npx next dev -p 3001
> ```

---

## 5. API Endpoint Map (Frontend ↔ Backend)

Below is the **complete** mapping of every frontend API call to its backend controller route. Use this to verify each integration point.

### 5.1 Auth (`auth.api.ts` → `auth.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `login(phone, password)` | POST | `/auth/login` | ✅ Matched |
| `register(phone, password, name)` | POST | `/auth/register` | ✅ Matched |
| `getProfile()` | GET | `/auth/profile` | ✅ Matched |

### 5.2 Mahber (`mahber.api.ts` → `mahber.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `getMyMahbers()` | GET | `/mahbers/my-mahbers` | ✅ Matched |
| `getPublicMahbers()` | GET | `/mahbers/public` | ✅ Matched |
| `createMahber(data)` | POST | `/mahbers` | ✅ Matched |
| `getMahberById(id)` | GET | `/mahbers/:id` | ✅ Matched |
| `joinMahber(id)` | POST | `/mahbers/:id/join` | ✅ Matched |

### 5.3 Members (`member.api.ts` → `member.controller.ts` + `join-request.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `getMembers(mahberId)` | GET | `/mahbers/:id/members` | ✅ Matched |
| `getMemberById(mahberId, memberId)` | GET | `/mahbers/:id/members/:memberId` | ✅ Matched |
| `suspendMember(mahberId, memberId)` | POST | `/mahbers/:id/members/:memberId/suspend` | ✅ Matched |
| `reinstateMember(mahberId, memberId)` | POST | `/mahbers/:id/members/:memberId/reinstate` | ✅ Matched |
| `updateMemberRole(mahberId, memberId, data)` | PUT | `/mahbers/:id/members/:memberId/role` | ⚠️ Verify — backend uses `role.controller.ts` at `/mahbers/:id` |
| `removeMember(mahberId, memberId)` | DELETE | `/mahbers/:id/members/:memberId` | ✅ Matched |
| `getJoinRequests(mahberId)` | GET | `/mahbers/:id/join-requests` | ✅ Matched |
| `handleJoinRequest(mahberId, reqId, data)` | PUT | `/mahbers/:id/join-requests/:reqId` | ✅ Matched |

### 5.4 Financial (`financial.api.ts` → `payment.controller.ts` + `ledger.controller.ts` + `fine.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `initiatePayment(data)` | POST | `/mahbers/:id/payments/initiate` | ✅ Fixed & Matched |
| `verifyPayment(tx_ref)` | — | No dedicated endpoint | ⚠️ See note below |
| `getMahberPayments(mahberId)` | GET | `/mahbers/:id/payments` | ✅ Fixed & Matched |
| `getMahberLedger(mahberId)` | GET | `/mahbers/:id/ledger` | ✅ Fixed & Matched |
| `getFines(mahberId)` | GET | `/mahbers/:id/fines` | ✅ Matched |
| `waiveFine(mahberId, fineId, reason)` | POST | `/mahbers/:id/fines/:fineId/waive` | ✅ Fixed (now sends `{reason}` body) |
| `getLotteryHistory(mahberId)` | GET | `/mahbers/:id/lottery/history` | ❌ **No controller exists** |
| `drawLottery(mahberId)` | POST | `/mahbers/:id/lottery/draw` | ❌ **No controller exists** |

> **Payment Verification Note**: The backend handles payment verification via the **Chapa webhook** at `POST /webhooks/chapa`. The frontend's `verifyPayment` function is a mock convenience. During real integration, poll the payment status via `GET /mahbers/:id/payments/:paymentId` instead.

> **Lottery Controller Note**: The backend has `lottery.service.ts` with full business logic but **no `lottery.controller.ts`**. The integration tester must create a `LotteryController` that exposes `GET /mahbers/:id/lottery/history` and `POST /mahbers/:id/lottery/draw`. The service methods `getDrawHistory()` and `executeDraw()` already exist.

### 5.5 Events (`event.api.ts` → `event.controller.ts` + `attendance.controller.ts` + `photo.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `getEvents(mahberId)` | GET | `/mahbers/:id/events` | ✅ Matched |
| `getEventById(mahberId, eventId)` | GET | `/mahbers/:id/events/:eventId` | ✅ Matched |
| `createEvent(mahberId, data)` | POST | `/mahbers/:id/events` | ✅ Matched |
| `updateEvent(mahberId, eventId, data)` | PUT | `/mahbers/:id/events/:eventId` | ✅ Matched |
| `cancelEvent(mahberId, eventId)` | DELETE | `/mahbers/:id/events/:eventId` | ✅ Matched |
| `getQRCode(mahberId, eventId)` | GET | `/mahbers/:id/events/:eventId/qr` | ✅ Matched (via `attendance.controller.ts`) |
| `checkIn(mahberId, eventId, qrToken)` | POST | `/mahbers/:id/events/:eventId/attendance` | ✅ Matched |
| `getPhotos(mahberId, eventId)` | GET | `/mahbers/:id/events/:eventId/photos` | ✅ Matched |
| `uploadPhoto(mahberId, eventId, formData)` | POST | `/mahbers/:id/events/:eventId/photos` | ✅ Matched (multipart) |

### 5.6 Communication (`communication.api.ts` → `chat.controller.ts` + `announcement.controller.ts` + `poll.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `getChatMessages(mahberId)` | GET | `/mahbers/:id/chat/messages` | ✅ Matched |
| `sendChatMessage(mahberId, content)` | POST | `/mahbers/:id/chat/messages` | ✅ Matched |
| `getAnnouncements(mahberId)` | GET | `/mahbers/:id/announcements` | ✅ Matched |
| `createAnnouncement(mahberId, data)` | POST | `/mahbers/:id/announcements` | ✅ Matched |
| `markAnnouncementAsRead(mahberId, annId)` | POST | `/mahbers/:id/announcements/:annId/read` | ✅ Matched |
| `getPolls(mahberId)` | GET | `/mahbers/:id/polls` | ✅ Matched |
| `createPoll(mahberId, data)` | POST | `/mahbers/:id/polls` | ✅ Matched |
| `vote(mahberId, pollId, choices)` | POST | `/mahbers/:id/polls/:pollId/vote` | ✅ Matched |

### 5.7 Audit (`audit.api.ts` → `audit.controller.ts`)
| Frontend Call | Method | Backend Route | Status |
|---|---|---|---|
| `getAuditTrail(mahberId)` | GET | `/mahbers/:id/audit-trail` | ✅ Fixed & Matched |

---

## 6. Known Gaps Requiring Backend Work

| # | Issue | Required Action |
|---|-------|-----------------|
| 1 | **No `LotteryController`** | Create `lottery.controller.ts` in `src/financial/` exposing `GET /mahbers/:id/lottery/history` and `POST /mahbers/:id/lottery/draw`. Wire it to the existing `LotteryService`. |
| 2 | **No dedicated payment verify endpoint** | Either add `GET /mahbers/:id/payments/verify/:tx_ref` or modify the frontend to poll payment status via `GET /mahbers/:id/payments/:paymentId`. |
| 3 | **Role update endpoint** | Verify that `PUT /mahbers/:id/members/:memberId/role` exists or is handled by `role.controller.ts`. The frontend calls `memberApi.updateMemberRole()`. |

---

## 7. Testing Checklist

Once both servers are running with `NEXT_PUBLIC_USE_MOCK=true`:

### Phase 1: Authentication
- [ ] Register a new user → Verify JWT is returned and stored
- [ ] Login with registered credentials → Verify redirect to dashboard
- [ ] Access `/mahbers` while logged in → Verify auth header is sent

### Phase 2: Mahber CRUD
- [ ] View "My Mahbers" list → Verify empty state or populated list
- [ ] Create a new Mahber → Verify it appears in the list
- [ ] View Mahber detail page → Verify name, type, member count
- [ ] Discover public Mahbers → Verify discovery feed
- [ ] Send a join request → Verify success toast

### Phase 3: Members & Roles
- [ ] View member list for a Mahber → Verify paginated response
- [ ] Approve/reject a join request → Verify status change
- [ ] Suspend a member → Verify status badge updates
- [ ] Update a member's role → Verify role change persists

### Phase 4: Financial
- [ ] Initiate a payment → Verify Chapa checkout URL is returned
- [ ] View payment history → Verify list renders
- [ ] View ledger → Verify transaction entries
- [ ] View fines list → Verify fine cards with statuses
- [ ] Waive a fine (admin) → Verify status changes to "waived"
- [ ] View lottery history → Verify past draws render
- [ ] Execute a lottery draw → Verify new winner appears

### Phase 5: Events
- [ ] View events list → Verify upcoming/past split
- [ ] Create an event → Verify it appears in the list
- [ ] View event detail → Verify all fields render
- [ ] Generate QR code (admin) → Verify QR image displays
- [ ] Check in to an event → Verify attendance recorded
- [ ] View/upload event photos → Verify photo gallery

### Phase 6: Communication
- [ ] View group chat → Verify message history loads
- [ ] Send a chat message → Verify it appears immediately
- [ ] View announcements → Verify priority styling (Urgent = red border)
- [ ] Create an announcement (admin) → Verify it appears at top
- [ ] View polls → Verify active/closed separation
- [ ] Vote on a poll → Verify results bars appear
- [ ] Create a poll → Verify it appears in poll list

### Phase 7: Audit Trail
- [ ] View audit trail → Verify timeline renders with icons
- [ ] Perform admin actions → Verify they appear in the audit log

---

## 8. Prompt for Integration Tester's Coding Agent

Copy and paste the following prompt to give to the coding agent that will handle backend deployment and integration testing:

---

### AGENT PROMPT

```
You are tasked with deploying and integration-testing the MahberConnect application.

## Project Structure
- Backend: NestJS app at the repository root (Mahber-connect-backend/)
- Frontend: Next.js app at Mahber-connect-backend/frontend/
- Database: PostgreSQL via Prisma ORM (schema at prisma/schema.prisma)
- The Postman collection is at postman_collection.json for API reference.

## Step 1: Backend Deployment
1. Copy .env.example to .env and fill in all values:
   - DATABASE_URL: Your PostgreSQL connection string
   - JWT_SECRET: Generate with `openssl rand -base64 64`
   - REDIS_HOST/PORT/PASSWORD: Your Redis instance
   - CHAPA_SECRET_KEY: Get from https://dashboard.chapa.co (use test key CHASECK_TEST-...)
   - FIREBASE_*: Get from Firebase Console (optional for local testing)
2. Run: pnpm install
3. Run: npx prisma generate
4. Run: npx prisma db push
5. Run: pnpm run start:dev
6. Verify: GET http://localhost:3000/health should return OK

## Step 2: Backend Gap — Create LotteryController
The backend has lottery.service.ts but NO lottery.controller.ts.
Create src/financial/lottery.controller.ts that:
- Is decorated with @Controller('mahbers/:id/lottery')
- Has GET /history → calls LotteryService.getDrawHistory(mahberId)
- Has POST /draw → calls LotteryService.executeDraw(mahberId, userId)
- Uses JwtAuthGuard, TenantGuard, RoleGuard
- Register it in financial.module.ts

## Step 3: Frontend Configuration
1. Create frontend/.env.local with:
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_USE_MOCK=false
2. Run: cd frontend && npm install && npm run dev -- -p 3001

## Step 4: Seed Test Data
Register test users via POST /auth/register, create a Mahber, add members.
Or check if prisma/seed.ts exists and run: npx prisma db seed

## Step 5: End-to-End Testing
Test every frontend page against the live backend:
- /login → Register + Login flow
- /mahbers → List, Create, Join
- /mahbers/:id/members → Member list, suspend, role update
- /mahbers/:id/join-requests → Approve/reject
- /mahbers/:id/payments/initiate → Chapa payment flow
- /mahbers/:id/ledger → Transaction history
- /mahbers/:id/fines → Fine list, waive fine
- /mahbers/:id/lottery → Draw history, execute draw
- /mahbers/:id/events → List, create, detail, QR, check-in, photos
- /mahbers/:id/chat → Send/receive messages
- /mahbers/:id/announcements → Create, read, mark-as-read
- /mahbers/:id/polls → Create poll, vote, view results
- /mahbers/:id/audit → View audit trail after performing admin actions

## Step 6: Verify CORS
If frontend and backend are on different origins, ensure ALLOWED_ORIGINS in .env includes the frontend URL.

## Step 7: Known Issues to Fix
1. No LotteryController (see Step 2)
2. Payment verify: Frontend calls verifyPayment() but backend uses webhook. Either:
   a. Add GET /mahbers/:id/payments/verify/:tx_ref, or
   b. Modify frontend to poll GET /mahbers/:id/payments/:paymentId
3. Role update: Verify PUT /mahbers/:id/members/:memberId/role matches role.controller.ts routes
4. The frontend's API base URL is read from NEXT_PUBLIC_API_URL. If the backend has an /api prefix, update client.ts accordingly.

## File Reference
- Frontend API services: frontend/src/lib/api/services/*.api.ts
- Frontend types: frontend/src/lib/types.ts
- Backend controllers: src/auth/, src/membership/, src/financial/, src/events/, src/communication/, src/audit/
- Prisma schema: prisma/schema.prisma
- Backend env template: .env.example
```

---

## 9. File Inventory

### Frontend Pages (14 routes)
| Route | File |
|-------|------|
| `/login` | `(auth)/login/page.tsx` |
| `/register` | `(auth)/register/page.tsx` |
| `/mahbers` | `(dashboard)/mahbers/page.tsx` |
| `/mahbers/create` | `(dashboard)/mahbers/create/page.tsx` |
| `/mahbers/discover` | `(dashboard)/mahbers/discover/page.tsx` |
| `/mahbers/[id]/members` | `(dashboard)/mahbers/[id]/members/page.tsx` |
| `/mahbers/[id]/join-requests` | `(dashboard)/mahbers/[id]/join-requests/page.tsx` |
| `/mahbers/[id]/payments/initiate` | `(dashboard)/mahbers/[id]/payments/initiate/page.tsx` |
| `/mahbers/[id]/ledger` | `(dashboard)/mahbers/[id]/ledger/page.tsx` |
| `/mahbers/[id]/events` | `(dashboard)/mahbers/[id]/events/page.tsx` |
| `/mahbers/[id]/events/create` | `(dashboard)/mahbers/[id]/events/create/page.tsx` |
| `/mahbers/[id]/events/[eventId]` | `(dashboard)/mahbers/[id]/events/[eventId]/page.tsx` |
| `/mahbers/[id]/events/[eventId]/photos` | `(dashboard)/mahbers/[id]/events/[eventId]/photos/page.tsx` |
| `/mahbers/[id]/chat` | `(dashboard)/mahbers/[id]/chat/page.tsx` |
| `/mahbers/[id]/announcements` | `(dashboard)/mahbers/[id]/announcements/page.tsx` |
| `/mahbers/[id]/polls` | `(dashboard)/mahbers/[id]/polls/page.tsx` |
| `/mahbers/[id]/polls/create` | `(dashboard)/mahbers/[id]/polls/create/page.tsx` |
| `/mahbers/[id]/fines` | `(dashboard)/mahbers/[id]/fines/page.tsx` |
| `/mahbers/[id]/lottery` | `(dashboard)/mahbers/[id]/lottery/page.tsx` |
| `/mahbers/[id]/audit` | `(dashboard)/mahbers/[id]/audit/page.tsx` |

### Service Layer (7 domains × 2 layers = 14 files)
All located in `frontend/src/lib/api/services/` and `frontend/src/lib/mock/services/`

### Mock Data (15 files)
All located in `frontend/src/lib/mock/data/`
