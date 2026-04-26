# MahberConnect Backend - Complete Analysis for Next.js Frontend Development

## 🏗️ Backend Architecture Overview

**Technology Stack:**

- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with Passport
- **Real-time:** Redis for caching & job queues
- **Payments:** Chapa (Ethiopian payment gateway)
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Background Jobs:** Bull (Redis-based queues)

**API Base URL:** `http://localhost:3000` (development)
**Swagger Docs:** `http://localhost:3000/api/docs`

---

## 🔐 Authentication & Authorization

### Auth Flow:

1. **Register:** `POST /auth/register` → Creates user with phone, password, name, email
   - Phone format: `+251XXXXXXXXX` (Ethiopian format)
   - Password: Min 8 chars, uppercase, lowercase, digit required
2. **Login:** `POST /auth/login` → Returns JWT token + user data
   - Rate limited: 5 attempts per minute
3. **Protected Routes:** Include `Authorization: Bearer <token>` header
   - JWT stored in `jwt.secret`, expires in 7 days

4. **RBAC System:** Role-based access control with permissions
   - Permissions: `manage_members`, `manage_finances`, `create_events`, `send_announcements`, `view_reports`, `manage_roles`
   - Guards: `JwtAuthGuard`, `RoleGuard`, `TenantGuard`

---

## 📊 Database Schema - Key Entities

### Core Models:

**1. User** - System users

- `phone` (unique, Ethiopian format), `password`, `name`, `email`, `bio`

**2. Mahber** - Organizations/groups (EQUB, IDDIR, MAHBER types)

- `name`, `type`, `configuration` (JSON), `is_public`, `invitation_code`

**3. Membership** - User's relationship to Mahbers

- `status`: Pending, Approved, Payment_Required, Active, Suspended, Rejected, Invalidated
- `balance` (decimal), `role` (JSON flexible structure)

**4. Payment** - Financial transactions via Chapa

- `type`: Contribution, JoinFee, Fine
- `status`: Pending, Completed, Failed
- Integrates with Chapa payment gateway

**5. LedgerEntry** - Financial ledger for each Mahber

- `transaction_type`: Contribution, Fine, Equb_Payout, Iddir_Payout, Refund
- Tracks running balance

**6. Event** - Scheduled events

- `type`: Meeting, Ceremony, Fundraiser, Social_Gathering
- `is_mandatory` boolean

**7. Attendance** - Event check-ins

- Linked to Events

**8. Fine** - Penalty system

- `violation_type`: MISSED_PAYMENT, MISSED_ATTENDANCE

**9. Lottery** - Random selection system

- `eligible_members` (JSON), `random_seed`, `payout_amount`

**10. Announcement** - Group announcements

- `priority`: Normal, Important, Urgent
- `target_audience` (optional role filter)

**11. ChatMessage** - Real-time messaging

- `content`, `edited_at`, `is_deleted`

**12. Poll** - Voting system

- `type`: SINGLE_CHOICE, MULTIPLE_CHOICE
- `voting_deadline`

**13. Vote** - Poll responses

- `choices` (JSON array of option IDs)

**14. AuditTrail** - Activity logging

- Tracks all entity changes

**15. DeviceToken** - FCM push notifications

- `platform`: ios, android, web

---

## 🌐 API Endpoints Summary

### Authentication (Public)

- `POST /auth/register` - User registration
- `POST /auth/login` - Login with phone/password
- `GET /auth/profile` - Get current user profile (protected)

### Membership (Protected)

- `GET /mahbers` - Get user's Mahbers
- `POST /mahbers` - Create new Mahber
- `GET /mahbers/:id` - Get Mahber details
- `PUT /mahbers/:id` - Update Mahber
- `DELETE /mahbers/:id` - Delete Mahber

- `GET /mahbers/:id/members` - List members (paginated)
- `GET /mahbers/:id/members/:memberId` - Get member details
- `POST /mahbers/:id/members/:memberId/suspend` - Suspend member
- `POST /mahbers/:id/members/:memberId/reinstate` - Reinstate member

- `POST /mahbers/:id/join-requests` - Request to join
- `POST /mahbers/:id/join-requests/:requestId/process` - Approve/reject join request

- `POST /mahbers/:id/roles` - Create custom role
- `GET /mahbers/:id/roles` - List roles
- `PUT /mahbers/:id/roles/:roleId` - Update role
- `POST /mahbers/:id/roles/:roleId/assign` - Assign role to member

### Events (Protected)

- `POST /mahbers/:id/events` - Create event (requires `create_events` permission)
- `GET /mahbers/:id/events` - List events (paginated)
- `GET /mahbers/:id/events/:eventId` - Get event details
- `PUT /mahbers/:id/events/:eventId` - Update event
- `DELETE /mahbers/:id/events/:eventId` - Delete event
- `POST /mahbers/:id/events/:eventId/cancel` - Cancel event

- `GET /mahbers/:id/events/:eventId/attendance` - Get attendance
- `POST /mahbers/:id/events/:eventId/attendance` - Check in

- `POST /mahbers/:id/events/:eventId/photos` - Upload event photos
- `GET /mahbers/:id/events/:eventId/photos` - List photos

### Financial (Protected)

- `POST /mahbers/:id/payments/initiate` - Initiate payment (Chapa)
  - Requires: `payment_type`, `amount`, `email`, `first_name`, `last_name`
  - Returns: `checkout_url` for redirect
- `GET /mahbers/:id/payments` - List payments (filter by status, date range)
- `GET /mahbers/:id/payments/:paymentId` - Get payment details

- `GET /mahbers/:id/ledger` - Get ledger entries
- `GET /mahbers/:id/members/:memberId/balance` - Get member balance

- `POST /mahbers/:id/fines` - Create fine
- `GET /mahbers/:id/fines` - List fines
- `PUT /mahbers/:id/fines/:fineId/waive` - Waive fine

- `POST /mahbers/:id/lottery/draw` - Execute lottery draw
- `GET /mahbers/:id/lottery/history` - Lottery history

### Communication (Protected)

- `POST /mahbers/:id/announcements` - Create announcement
- `GET /mahbers/:id/announcements` - List announcements
- `PUT /mahbers/:id/announcements/:announcementId` - Update
- `POST /mahbers/:id/announcements/:announcementId/publish` - Publish

- `POST /mahbers/:id/chat/messages` - Send message
- `GET /mahbers/:id/chat/messages` - List messages (paginated)
- `PUT /mahbers/:id/chat/messages/:messageId` - Edit message
- `DELETE /mahbers/:id/chat/messages/:messageId` - Delete message

- `POST /mahbers/:id/polls` - Create poll
- `GET /mahbers/:id/polls` - List polls
- `POST /mahbers/:id/polls/:pollId/vote` - Cast vote
- `GET /mahbers/:id/polls/:pollId/results` - Get results

- `POST /mahbers/:id/notifications/register-device` - Register FCM token
- `POST /mahbers/:id/notifications/unregister-device` - Unregister token

### Audit (Protected - Admin Only)

- `GET /mahbers/:id/audit-trail` - Get audit log (requires `manage_members` permission)

### Health (Public)

- `GET /health` - Health check (DB + Redis)

---

## 🔧 Environment Configuration

### Required Environment Variables (.env):

```bash
# Application
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/mahber_connect?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production (min 16 chars)
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Chapa Payment Gateway
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_BASE_URL=https://api.chapa.co/v1

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

---

## 💻 Local Development Setup Options

### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# API runs on http://localhost:3000
# PostgreSQL on port 5432
# Redis on port 6379
```

### Option 2: Manual Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Start dev server
pnpm start:dev
```

### Option 3: Without Database (Mock Mode)

You can build the frontend without running the backend by:

- Using the Postman collection for API reference
- Creating TypeScript interfaces from the Prisma schema
- Mocking API responses during development
- Using MSW (Mock Service Worker) for API mocking

---

## ⚛️ Next.js Frontend Integration Plan

### 1. Project Setup

```bash
npx create-next-app@latest mahber-connect-frontend
cd mahber-connect-frontend
npm install axios zustand react-hook-form zod @hookform/resolvers
```

### 2. Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── mahbers/
│   │   ├── events/
│   │   ├── payments/
│   │   └── chat/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   ├── mahbers/
│   ├── events/
│   ├── payments/
│   ├── chat/
│   └── ui/
├── lib/
│   ├── api.ts          # Axios instance
│   ├── auth.ts         # Auth context/hooks
│   └── types.ts        # TypeScript types
└── middleware.ts       # Auth protection
```

### 3. Key TypeScript Types

```typescript
// lib/types.ts
export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  bio?: string;
}

export interface Mahber {
  id: string;
  name: string;
  type: 'MAHBER' | 'EQUB' | 'IDDIR';
  configuration: any;
  is_public: boolean;
  invitation_code?: string;
}

export interface Membership {
  id: string;
  mahber_id: string;
  member_id: string;
  status:
    | 'Pending'
    | 'Approved'
    | 'Payment_Required'
    | 'Active'
    | 'Suspended'
    | 'Rejected'
    | 'Invalidated';
  role: any;
  balance: number;
}

export interface Payment {
  id: string;
  mahber_id: string;
  member_id: string;
  amount: number;
  payment_type: 'Contribution' | 'JoinFee' | 'Fine';
  status: 'Pending' | 'Completed' | 'Failed';
  tx_ref: string;
  chapa_reference?: string;
}

export interface Event {
  id: string;
  mahber_id: string;
  title: string;
  description: string;
  event_type: 'Meeting' | 'Ceremony' | 'Fundraiser' | 'Social_Gathering';
  start_time: string;
  end_time: string;
  location: string;
  is_mandatory: boolean;
}
```

### 4. API Client Setup

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 5. Authentication Flow

```typescript
// lib/auth.ts
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (phone: string, password: string) => {
    const response = await api.post('/auth/login', { phone, password });
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    setUser(user);
    router.push('/dashboard');
  };

  const register = async (data: RegisterData) => {
    await api.post('/auth/register', data);
    await login(data.phone, data.password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    }
    setLoading(false);
  }, []);

  return { user, loading, login, register, logout };
};
```

### 6. Key Features to Implement

#### Authentication Pages:

- Login form with phone validation (`+251XXXXXXXXX`)
- Registration form with password requirements
- Profile page

#### Mahber Dashboard:

- List/create/join Mahbers
- Member management (suspend/reinstate)
- Role assignment
- Join request approvals

#### Event Management:

- Create events (Meeting, Ceremony, Fundraiser, Social Gathering)
- Event calendar
- Attendance tracking
- Event photos upload

#### Financial Module:

- Payment initiation (redirect to Chapa)
- Payment history
- Ledger view
- Fine management
- Lottery system
- Balance tracking

#### Communication:

- Real-time chat (WebSocket or polling)
- Announcements (priority levels)
- Poll creation and voting
- Push notifications (FCM)

#### Audit Trail:

- Activity log (admin only)

---

## 🧪 Testing Without Running Backend

### 1. Use Mock Service Worker (MSW)

```bash
npm install msw --save-dev
```

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('http://localhost:3000/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock-token',
        user: { id: '1', phone: '+251912345678', name: 'Test User' },
      }),
    );
  }),

  rest.get('http://localhost:3000/mahbers', (req, res, ctx) => {
    return res(ctx.json([{ id: '1', name: 'Test Mahber', type: 'MAHBER' }]));
  }),
];
```

### 2. Use Postman Collection

- Import `postman_collection.json` into Postman
- Test all endpoints without coding
- Export examples as mock server

### 3. Swagger Documentation

- Visit `http://localhost:3000/api/docs` when backend is running
- Interactive testing of all endpoints
- Export OpenAPI spec for codegen

### 4. TypeScript Type Generation

```bash
# Generate types from Prisma schema
npx prisma generate

# Or use openapi-typescript for API types
npx openapi-typescript http://localhost:3000/api/docs -o types.ts
```

---

## 🔑 Key Business Logic & Workflows

### 1. Membership Lifecycle:

```
Join Request → Pending → (Approved/Rejected) → Payment_Required → Active
                                      ↓
                                 Rejected
```

### 2. Equb/EIDIR Cycle:

```
Members contribute → Funds accumulate → Lottery draw → Winner receives payout → Cycle repeats
```

### 3. Fine System:

```
Missed payment/attendance → Fine applied → Ledger updated → Member balance decreases
                              ↓
                         Can be waived by admin
```

### 4. Attendance Tracking:

```
Event created → Members check in (QR code?) → Attendance recorded → Latecomers tracked
```

### 5. Payment Flow:

```
Initiate payment → Redirect to Chapa → Payment processing → Webhook → Status updated → Ledger entry created
```

### 6. Announcement Publishing:

```
Create announcement → Schedule (optional) → Publish → Push notifications sent → Members read → Read receipts tracked
```

---

## 🚀 Recommended Next Steps

1. **Set up Next.js project** with TypeScript
2. **Create type definitions** from Prisma schema
3. **Implement authentication** (login/register)
4. **Build Mahber dashboard** (list/create)
5. **Add routing & middleware** for protected routes
6. **Implement role-based UI** (show/hide features based on permissions)
7. **Add payment integration** (Chapa redirect flow)
8. **Build real-time features** (chat, notifications)
9. **Add tests** (Jest/React Testing Library)
10. **Deploy** (Vercel recommended for Next.js)

---

## ⚠️ Important Notes

1. **CORS:** Backend allows origins from `ALLOWED_ORIGINS` env var. Add your Next.js URL in production.

2. **Authentication:** JWT stored in localStorage (consider httpOnly cookies for production).

3. **Real-time Updates:** Backend doesn't have WebSocket support. Consider:
   - Polling for chat/notifications
   - Implement WebSocket/Socket.io
   - Use Supabase Realtime

4. **File Uploads:** Event photos use local file storage. Consider cloud storage (S3, Cloudinary) for production.

5. **Webhooks:** Chapa payment webhooks need secure endpoint (`/financial/webhook`).

6. **Push Notifications:** Firebase setup required for mobile/web push.

7. **Rate Limiting:** Login endpoint has rate limiting (5/min). Handle 429 errors gracefully.

8. **Pagination:** Most list endpoints support `page` and `limit` query parameters.

9. **Permissions:** Check user permissions before showing UI elements (use `require-permission` decorator pattern).

10. **Multilingual Support:** Backend supports Amharic text (UTF-8). Ensure your frontend handles Unicode properly.

---

## 📚 Additional Resources

- **Postman Collection:** `postman_collection.json` - Ready-to-use API collection
- **Deployment Guide:** `DEPLOYMENT.md` - Detailed deployment instructions
- **Swagger API Docs:** Available at `/api/docs` when backend is running
- **Database Schema:** `prisma/schema.prisma` - Complete database structure

---
