# MahberConnect Web Application - Complete Frontend Plan

> **Target Platform**: Web Application Only (Desktop, Tablet, Mobile-responsive)
> **Framework**: Next.js 14 with App Router
> **Backend API**: NestJS REST API (already built)

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Complete Page Map](#3-complete-page-map)
4. [API Integration Reference](#4-api-integration-reference)
5. [Component Library](#5-component-library)
6. [State Management](#6-state-management)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Real-time Features](#8-real-time-features)
9. [Internationalization (i18n)](#9-internationalization-i18n)
10. [Development Roadmap](#10-development-roadmap)
11. [Key Implementation Details](#11-key-implementation-details)
12. [Environment Variables](#12-environment-variables)
13. [Deployment](#13-deployment)
14. [PWA & Mobile Support](#14-pwa--mobile-support)
15. [Summary](#15-summary)

---

## 1. Technology Stack

### Core Framework
```json
{
  "framework": "Next.js 14.2+",
  "runtime": "Node.js 18+",
  "language": "TypeScript 5+",
  "package-manager": "pnpm"
}
```

### UI & Styling
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Lucide React
- **Charts**: Recharts
- **Tables**: TanStack Table v8
- **Forms**: React Hook Form + Zod
- **Date Picker**: react-day-picker
- **Rich Text**: Tiptap or Lexical
- **Drag & Drop**: react-dropzone

### State & Data Management
- **Global State**: Zustand
- **Server State**: TanStack Query v5 (React Query)
- **API Client**: Axios
- **WebSocket**: Socket.io-client
- **Form State**: React Hook Form

### Utilities
- **Date**: date-fns
- **i18n**: next-intl
- **QR Code**: html5-qrcode (scanning only — QR image is server-rendered)
- **PDF**: jsPDF or @react-pdf/renderer
- **Notifications**: sonner
- **Currency**: dinero.js
- **Validation**: Zod

### Development Tools
- **Linting**: ESLint + Prettier
- **Testing**: Jest + React Testing Library
- **E2E**: Playwright
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged

---

## 2. Project Structure

```
mahberconnect-web/
├── app/                              # Next.js 14 App Router
│   ├── (public)/                    # Public layout group (no auth, no sidebar)
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Public layout (navbar + footer)
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── (auth)/                      # Auth layout group (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                 # Main app layout (with sidebar)
│   │   ├── layout.tsx               # Dashboard layout
│   │   ├── onboarding/
│   │   │   └── page.tsx             # First-time user onboarding
│   │   │
│   │   ├── mahbers/
│   │   │   ├── page.tsx             # List all mahbers (empty state for new users)
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   ├── join/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Mahber overview
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       ├── members/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── loading.tsx
│   │   │       │   └── [memberId]/
│   │   │       │       └── page.tsx
│   │   │       ├── join-requests/
│   │   │       │   └── page.tsx
│   │   │       ├── payments/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── initiate/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── [paymentId]/
│   │   │       │       └── page.tsx
│   │   │       ├── ledger/
│   │   │       │   └── page.tsx
│   │   │       ├── fines/
│   │   │       │   └── page.tsx
│   │   │       ├── lottery/
│   │   │       │   └── page.tsx
│   │   │       ├── events/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── create/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── [eventId]/
│   │   │       │       ├── page.tsx
│   │   │       │       ├── qr/
│   │   │       │       │   └── page.tsx
│   │   │       │       ├── scan/
│   │   │       │       │   └── page.tsx
│   │   │       │       └── photos/
│   │   │       │           └── page.tsx
│   │   │       ├── chat/
│   │   │       │   └── page.tsx
│   │   │       ├── announcements/
│   │   │       │   └── page.tsx
│   │   │       ├── polls/
│   │   │       │   └── page.tsx
│   │   │       ├── audit/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── payments/
│   │   │   └── callback/
│   │   │       └── page.tsx         # Chapa redirect return page
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── layout.tsx                   # Root layout
│   ├── globals.css
│   ├── providers.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
```

```
├── components/
│   ├── ui/                          # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── public-navbar.tsx        # Landing page navbar
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   ├── features-section.tsx
│   │   ├── mahber-types-section.tsx
│   │   ├── how-it-works-section.tsx
│   │   └── cta-section.tsx
│   │
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── profile-form.tsx
│   │
│   ├── mahber/
│   │   ├── mahber-card.tsx
│   │   ├── mahber-list.tsx
│   │   ├── mahber-stats.tsx
│   │   ├── mahber-empty-state.tsx
│   │   ├── create-mahber-form.tsx
│   │   └── mahber-config-form.tsx
│   │
│   ├── membership/
│   │   ├── join-request-card.tsx
│   │   ├── member-table.tsx
│   │   ├── member-card.tsx
│   │   ├── role-badge.tsx
│   │   ├── status-badge.tsx
│   │   └── assign-role-dialog.tsx
│   │
│   ├── financial/
│   │   ├── payment-form.tsx
│   │   ├── payment-table.tsx
│   │   ├── payment-status-badge.tsx
│   │   ├── payment-callback-handler.tsx
│   │   ├── ledger-table.tsx
│   │   ├── balance-card.tsx
│   │   ├── financial-chart.tsx
│   │   ├── fine-table.tsx
│   │   ├── lottery-results.tsx
│   │   └── waive-fine-dialog.tsx
│   │
│   ├── events/
│   │   ├── event-card.tsx
│   │   ├── event-list.tsx
│   │   ├── event-form.tsx
│   │   ├── qr-display.tsx           # Renders the data URL image from backend
│   │   ├── qr-scanner.tsx
│   │   ├── photo-gallery.tsx
│   │   ├── photo-upload.tsx
│   │   └── attendance-list.tsx
│   │
│   ├── communication/
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-container.tsx
│   │   ├── announcement-card.tsx
│   │   ├── announcement-form.tsx
│   │   ├── poll-card.tsx
│   │   ├── poll-form.tsx
│   │   └── poll-results.tsx
│   │
│   └── common/
│       ├── phone-input.tsx
│       ├── currency-input.tsx
│       ├── date-picker.tsx
│       ├── date-range-picker.tsx
│       ├── language-switcher.tsx
│       ├── loading-spinner.tsx
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       ├── empty-state.tsx
│       ├── confirmation-dialog.tsx
│       └── data-table.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts                # Axios instance
│   │   ├── auth.ts
│   │   ├── mahbers.ts
│   │   ├── members.ts
│   │   ├── payments.ts
│   │   ├── ledger.ts
│   │   ├── fines.ts
│   │   ├── events.ts
│   │   ├── attendance.ts
│   │   ├── photos.ts
│   │   ├── chat.ts
│   │   ├── announcements.ts
│   │   ├── polls.ts
│   │   ├── notifications.ts
│   │   ├── audit.ts
│   │   └── types.ts
│   │
│   ├── store/
│   │   ├── auth-store.ts
│   │   ├── mahber-store.ts
│   │   ├── notification-store.ts
│   │   └── ui-store.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-mahber.ts
│   │   ├── use-payments.ts
│   │   ├── use-events.ts
│   │   ├── use-chat.ts
│   │   ├── use-websocket.ts
│   │   ├── use-media-query.ts
│   │   └── use-debounce.ts
│   │
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   ├── phone.ts
│   │   ├── permissions.ts
│   │   └── cn.ts
│   │
│   └── constants.ts
│
├── types/
│   ├── api.ts
│   ├── models.ts
│   ├── enums.ts
│   └── index.ts
│
├── public/
│   ├── images/
│   ├── icons/
│   └── locales/
│       ├── en/
│       │   └── common.json
│       └── am/
│           └── common.json
│
├── middleware.ts                    # Auth middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
└── package.json
```

---

## 3. Complete Page Map

### 3.1 Public Pages (No Auth Required)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero, features, mahber types, how-it-works, CTA |
| `/about` | About Page | Project info, team, contact |

### 3.2 Authentication Pages

| Route | Page | API Calls | Auth Required |
|-------|------|-----------|---------------|
| `/login` | Login | `POST /auth/login` | No |
| `/register` | Register | `POST /auth/register` | No |

### 3.3 Dashboard Pages

| Route | Page | API Calls | Auth Required |
|-------|------|-----------|---------------|
| `/mahbers` | Mahber List (Home) | `GET /mahbers` | Yes |
| `/onboarding` | First-time Onboarding | — | Yes |
| `/profile` | User Profile | `GET /auth/profile`, `PUT /auth/profile` | Yes |
| `/settings` | App Settings | — | Yes |
| `/payments/callback` | Chapa Return Page | `GET /mahbers/:id/payments/:paymentId` | Yes |

### 3.4 Mahber Management

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/create` | Create Mahber | `POST /mahbers` | Yes | — |
| `/mahbers/join` | Join Mahber | `POST /mahbers/:id/join-requests` | Yes | — |
| `/mahbers/[id]` | Mahber Overview | `GET /mahbers/:id` | Yes | Member |
| `/mahbers/[id]/settings` | Mahber Settings | `GET /mahbers/:id`, `PUT /mahbers/:id` | Yes | Admin |

### 3.5 Membership Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/members` | Members List | `GET /mahbers/:id/members` | Yes | Member |
| `/mahbers/[id]/members/[memberId]` | Member Details | `GET /mahbers/:id/members/:memberId` | Yes | Member |
| `/mahbers/[id]/join-requests` | Join Requests | `GET /mahbers/:id/join-requests`, `PUT /mahbers/:id/join-requests/:requestId` | Yes | Admin |

### 3.6 Financial Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/payments` | Payments List | `GET /mahbers/:id/payments` | Yes | Member |
| `/mahbers/[id]/payments/initiate` | Initiate Payment | `POST /mahbers/:id/payments/initiate` | Yes | Member |
| `/mahbers/[id]/payments/[paymentId]` | Payment Details | `GET /mahbers/:id/payments/:paymentId` | Yes | Member |
| `/mahbers/[id]/ledger` | Ledger | `GET /mahbers/:id/ledger`, `GET /mahbers/:id/balance` | Yes | Member |
| `/mahbers/[id]/fines` | Fines | `GET /mahbers/:id/fines`, `POST /mahbers/:id/fines/:fineId/waive` | Yes | Member |
| `/mahbers/[id]/lottery` | Lottery History | `GET /mahbers/:id/lottery/history` | Yes | Member |
| `/mahbers/[id]/lottery` | Execute Lottery (Equb) | `POST /mahbers/:id/lottery/execute` | Yes | Treasurer (`MANAGE_FINANCES`) |
| `/mahbers/[id]/reports/financial` | Financial Report | `GET /mahbers/:id/reports/financial` | Yes | Treasurer (`MANAGE_FINANCES`) |

### 3.7 Events Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/events` | Events List | `GET /mahbers/:id/events` | Yes | Member |
| `/mahbers/[id]/events/create` | Create Event | `POST /mahbers/:id/events` | Yes | Secretary or Admin (`CREATE_EVENTS`) |
| `/mahbers/[id]/events/[eventId]` | Event Details | `GET /mahbers/:id/events/:eventId` | Yes | Member |
| `/mahbers/[id]/events/[eventId]/qr` | QR Code Display | `GET /mahbers/:id/events/:eventId/qr` | Yes | Secretary or Admin (`CREATE_EVENTS`) |
| `/mahbers/[id]/events/[eventId]/scan` | QR Scanner | `POST /mahbers/:id/events/:eventId/attendance` | Yes | Member |
| `/mahbers/[id]/events/[eventId]/photos` | Photo Gallery | `GET /mahbers/:id/events/:eventId/photos`, `POST /mahbers/:id/events/:eventId/photos` | Yes | Member |

### 3.8 Communication Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/chat` | Chat | `GET /mahbers/:id/chat/messages`, `POST /mahbers/:id/chat/messages` | Yes | Member |
| `/mahbers/[id]/announcements` | Announcements | `GET /mahbers/:id/announcements`, `POST /mahbers/:id/announcements` | Yes | Member (create requires `SEND_ANNOUNCEMENTS`) |
| `/mahbers/[id]/polls` | Polls | `GET /mahbers/:id/polls`, `POST /mahbers/:id/polls`, `POST /mahbers/:id/polls/:pollId/vote` | Yes | Member (create requires `SEND_ANNOUNCEMENTS`) |

### 3.9 Admin Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/audit` | Audit Trail | `GET /mahbers/:id/audit-trail` | Yes | Admin (`MANAGE_MEMBERS`) |

---

## 4. API Integration Reference

### 4.1 API Client Setup

Token storage uses `localStorage` exclusively. The Next.js middleware uses a separate `auth_token` cookie that is set client-side after login, so both the middleware (server-side) and the API client (client-side) stay in sync.

```typescript
// lib/api/client.ts
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      // Also clear the auth cookie used by middleware
      document.cookie = 'auth_token=; Max-Age=0; path=/';
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);
```

After a successful login, set both localStorage and the cookie:

```typescript
// lib/store/auth-store.ts (login action)
login: async (phone, password) => {
  const response = await authApi.login({ phone, password });
  const { access_token, user } = response.data;

  // For API client
  localStorage.setItem('access_token', access_token);

  // For Next.js middleware (httpOnly not possible client-side, but sufficient for route guarding)
  document.cookie = `auth_token=${access_token}; path=/; SameSite=Lax`;

  set({ user, token: access_token, isAuthenticated: true });
},

logout: () => {
  localStorage.removeItem('access_token');
  document.cookie = 'auth_token=; Max-Age=0; path=/';
  set({ user: null, token: null, isAuthenticated: false });
},
```

### 4.2 Complete API Endpoint Map

#### Authentication
```typescript
POST   /auth/register          // Register new user
POST   /auth/login             // Login → returns { access_token, user }
GET    /auth/profile           // Get current user
PUT    /auth/profile           // Update profile
```

#### Mahbers
```typescript
POST   /mahbers                // Create mahber
GET    /mahbers                // List user's mahbers (only mahbers the user belongs to)
GET    /mahbers/public         // Search public mahbers by name (?q=query) — for join page discovery
GET    /mahbers/:id            // Get mahber details
GET    /mahbers/:id/statistics // Summary stats: member count, active members, upcoming events, payments
PUT    /mahbers/:id            // Update mahber (Admin only)
DELETE /mahbers/:id            // Delete mahber (Admin only, only if no other active members)
```

#### Join Requests
```typescript
POST   /mahbers/:id/join-requests              // Submit join request
GET    /mahbers/:id/join-requests              // List join requests (Admin)
PUT    /mahbers/:id/join-requests/:requestId   // Approve/Reject request (Admin)
```

#### Members
```typescript
GET    /mahbers/:id/members                    // List members (paginated)
GET    /mahbers/:id/members/:memberId          // Get member details
POST   /mahbers/:id/members/:memberId/suspend  // Suspend member (Admin)
POST   /mahbers/:id/members/:memberId/reinstate // Reinstate member (Admin)
```

#### Roles
```typescript
PUT    /mahbers/:id/members/:memberId/role     // Assign role (Admin, MANAGE_ROLES)
POST   /mahbers/:id/roles                      // Create custom role (Admin, MANAGE_ROLES)
```

#### Payments
```typescript
POST   /mahbers/:id/payments/initiate          // Initiate payment → returns { checkout_url, ... }
GET    /mahbers/:id/payments                   // List payments (paginated, filterable by status/date)
GET    /mahbers/:id/payments/:paymentId        // Get payment details
POST   /mahbers/:id/payments/:paymentId/retry  // Retry failed payment
```

#### Ledger & Financial
```typescript
GET    /mahbers/:id/ledger                     // Get ledger entries (paginated, filterable)
GET    /mahbers/:id/balance                    // Get member balance → returns { balance: string }
GET    /mahbers/:id/reports/financial          // Financial report (MANAGE_FINANCES permission)
```

#### Fines
```typescript
GET    /mahbers/:id/fines                      // List fines (filterable by memberId, isWaived)
POST   /mahbers/:id/fines/:fineId/waive        // Waive fine (MANAGE_FINANCES permission)
```

#### Events
```typescript
POST   /mahbers/:id/events                     // Create event (CREATE_EVENTS permission)
GET    /mahbers/:id/events                     // List events (paginated)
GET    /mahbers/:id/events/:eventId            // Get event details
PUT    /mahbers/:id/events/:eventId            // Update event (CREATE_EVENTS permission)
DELETE /mahbers/:id/events/:eventId            // Cancel event (CREATE_EVENTS permission)
```

#### Attendance & QR
```typescript
// Returns { qr_code: "data:image/png;base64,..." } — a pre-rendered PNG data URL
// Do NOT pass this to qrcode.react; render it directly as <img src={qr_code} />
GET    /mahbers/:id/events/:eventId/qr              // Generate QR image (CREATE_EVENTS permission)

// Body: { qr_token: string } — the JWT string scanned from the QR image
POST   /mahbers/:id/events/:eventId/attendance      // Record attendance via QR token

// Triggers the attendance processor job — applies absence fines for mandatory events
POST   /mahbers/:id/events/:eventId/process-attendance // Process attendance (CREATE_EVENTS permission)
```

#### Photos
```typescript
POST   /mahbers/:id/events/:eventId/photos     // Upload photo (multipart/form-data)
GET    /mahbers/:id/events/:eventId/photos     // List photos (paginated)
DELETE /mahbers/:id/events/:eventId/photos/:photoId // Delete photo
```

#### Chat
```typescript
POST   /mahbers/:id/chat/messages              // Send message
GET    /mahbers/:id/chat/messages              // List messages (paginated)
PUT    /mahbers/:id/chat/messages/:messageId   // Edit message (own messages only)
DELETE /mahbers/:id/chat/messages/:messageId   // Delete message (own messages only)
```

#### Announcements
```typescript
// Creating requires SEND_ANNOUNCEMENTS permission (Admin or Secretary)
POST   /mahbers/:id/announcements              // Create announcement
GET    /mahbers/:id/announcements              // List announcements (paginated)
POST   /mahbers/:id/announcements/:announcementId/read // Mark as read
```

#### Polls
```typescript
// Creating requires SEND_ANNOUNCEMENTS permission (Admin or Secretary)
POST   /mahbers/:id/polls                      // Create poll
GET    /mahbers/:id/polls                      // List polls (paginated)
POST   /mahbers/:id/polls/:pollId/vote         // Cast vote
GET    /mahbers/:id/polls/:pollId/results      // Get results
```

#### Notifications
```typescript
POST   /notifications/register-device          // Register FCM token
// Note: DELETE with body — use axios.delete(url, { data: dto })
DELETE /notifications/unregister-device        // Unregister device
```

#### Audit Trail
```typescript
// Requires MANAGE_MEMBERS permission (Admin only)
GET    /mahbers/:id/audit-trail                // Get audit logs (paginated, filterable)
```

#### Lottery (Equb only)
```typescript
GET    /mahbers/:id/lottery/history   // Get all past lottery draws
POST   /mahbers/:id/lottery/execute   // Manually trigger a lottery draw (MANAGE_FINANCES permission)
                                      // Body: { operationalCostRate?: number, fineThreshold?: number }
```

#### Health
```typescript
GET    /health                                 // Health check
GET    /                                       // API info
```

---

## 5. Component Library

### 5.1 shadcn/ui Components to Install

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog dropdown-menu table tabs badge avatar toast form select checkbox radio-group switch textarea calendar popover alert skeleton separator scroll-area sheet tooltip progress
```

### 5.2 Custom Components

#### QR Display Component
```typescript
// components/events/qr-display.tsx
// The backend returns a base64 PNG data URL, not a raw token.
// Render it directly — no qrcode.react needed.
interface QRDisplayProps {
  dataUrl: string;   // "data:image/png;base64,..."
  eventTitle: string;
  expiresAt: Date;
}

export function QRDisplay({ dataUrl, eventTitle, expiresAt }: QRDisplayProps) {
  const download = () => {
    const link = document.createElement('a');
    link.download = `${eventTitle}-qr.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <img src={dataUrl} alt="Event QR Code" className="w-72 h-72" />
      <p className="font-semibold">{eventTitle}</p>
      <CountdownTimer expiresAt={expiresAt} />
      <div className="flex gap-2">
        <Button onClick={download}>Download</Button>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
      </div>
    </div>
  );
}
```

#### QR Scanner Component
```typescript
// components/events/qr-scanner.tsx
// Uses html5-qrcode to scan the QR image and extract the JWT token string.
// That token string is then sent to POST /attendance as { qr_token: string }.
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrToken: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      onScan(decodedText);
      scanner.clear();
    }, console.error);
    return () => { scanner.clear(); };
  }, [onScan]);

  return <div id="qr-reader" className="w-full max-w-md" />;
}
```

#### Phone Input Component
```typescript
// components/common/phone-input.tsx
// Auto-format: +251 XXX XXX XXX
// Validation: exactly 9 digits after +251 (matches backend regex /^\+251[0-9]{9}$/)
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}
```

#### Currency Input Component
```typescript
// components/common/currency-input.tsx
// Format: 1,234.56 ETB — 2 decimal places, thousand separators
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: 'ETB';
  min?: number;
  max?: number;
}
```

#### Data Table Component
```typescript
// components/common/data-table.tsx
// Built with TanStack Table v8
// Features: sorting, filtering, pagination, column visibility, row selection, CSV export
```

#### Lottery Results Component
```typescript
// components/financial/lottery-results.tsx
// Displays Equb lottery draw history: winner, payout amount, eligible members, date
// Data sourced from GET /mahbers/:id/lottery/history
// For Equb mahbers only — conditionally shown based on mahber.type === 'EQUB'
// Treasurer also sees an "Execute Draw" button that calls POST /mahbers/:id/lottery/execute
```

---

## 6. State Management

### 6.1 Zustand Stores

#### Auth Store
```typescript
// lib/store/auth-store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phone, password) => {
    const { data } = await authApi.login({ phone, password });
    localStorage.setItem('access_token', data.access_token);
    document.cookie = `auth_token=${data.access_token}; path=/; SameSite=Lax`;
    set({ user: data.user, token: data.access_token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
```

#### Mahber Store
```typescript
// lib/store/mahber-store.ts
interface MahberState {
  mahbers: Mahber[];
  currentMahber: Mahber | null;
  isLoading: boolean;

  fetchMahbers: () => Promise<void>;
  selectMahber: (id: string) => void;
  createMahber: (data: CreateMahberDto) => Promise<Mahber>;
  updateMahber: (id: string, data: UpdateMahberDto) => Promise<Mahber>;
  deleteMahber: (id: string) => Promise<void>;
}
```

#### Notification Store
```typescript
// lib/store/notification-store.ts
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}
```

### 6.2 React Query Setup

> Note: TanStack Query v5 renamed `cacheTime` to `gcTime`. Use `gcTime` below.

```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      gcTime: 5 * 60 * 1000,      // 5 minutes (was cacheTime in v4)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 6.3 Custom Hooks

#### useAuth Hook
```typescript
// lib/hooks/use-auth.ts
// Role names match backend PascalCase: 'Admin', 'Treasurer', 'Secretary', 'Member'
export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const role = user?.role?.name as string | undefined;

  return {
    user,
    isAuthenticated,
    login,
    logout,
    hasPermission: (permission: string) => hasPermission(role ?? '', permission),
    isAdmin: role === 'Admin',
    isTreasurer: role === 'Treasurer',
    isSecretary: role === 'Secretary',
  };
}
```

#### useMahber Hook
```typescript
export function useMahber(mahberId: string) {
  return useQuery({
    queryKey: ['mahber', mahberId],
    queryFn: () => mahberApi.getById(mahberId),
    enabled: !!mahberId,
  });
}
```

#### usePayments Hook
```typescript
export function usePayments(mahberId: string, filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', mahberId, filters],
    queryFn: () => paymentApi.list(mahberId, filters),
    enabled: !!mahberId,
  });
}
```

---

## 7. Authentication & Authorization

### 7.1 Next.js Middleware

The middleware reads the `auth_token` cookie (set client-side after login). Public routes (`/`, `/about`) are excluded from auth checks.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/about'];
const AUTH_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Allow public pages always
  if (isPublicPath) return NextResponse.next();

  // Redirect unauthenticated users to login
  if (!token && !isAuthPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login/register
  if (token && isAuthPath) {
    return NextResponse.redirect(new URL('/mahbers', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 7.2 Permission Checking

Role names are PascalCase to match the backend (`Admin`, `Treasurer`, `Secretary`, `Member`). The `role` field on a membership is a JSON object `{ name: string, permissions: string[] }`.

```typescript
// lib/utils/permissions.ts
export const PERMISSIONS = {
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_FINANCES: 'manage_finances',
  CREATE_EVENTS: 'create_events',
  SEND_ANNOUNCEMENTS: 'send_announcements',
  VIEW_REPORTS: 'view_reports',
  MANAGE_ROLES: 'manage_roles',
} as const;

// Mirrors backend src/membership/rbac/roles.ts DEFAULT_ROLES exactly
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: Object.values(PERMISSIONS),
  Treasurer: [PERMISSIONS.MANAGE_FINANCES, PERMISSIONS.VIEW_REPORTS],
  Secretary: [PERMISSIONS.CREATE_EVENTS, PERMISSIONS.SEND_ANNOUNCEMENTS],
  Member: [],
};

export function hasPermission(roleName: string, permission: string): boolean {
  return ROLE_PERMISSIONS[roleName]?.includes(permission) ?? false;
}
```

### 7.3 Protected UI Component

```typescript
// components/common/protected-ui.tsx
// Use this to conditionally render UI elements based on permissions.
// Route-level protection is handled by middleware + server-side checks.
interface ProtectedUIProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedUI({ permission, children, fallback = null }: ProtectedUIProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
```

---

## 8. Real-time Features

### 8.1 WebSocket Setup

```typescript
// lib/hooks/use-websocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(mahberId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
      query: { mahberId },
    });

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    setSocket(socketInstance);
    return () => { socketInstance.disconnect(); };
  }, [mahberId]);

  return { socket, isConnected };
}
```

### 8.2 Chat Real-time Updates

```typescript
// components/communication/chat-container.tsx
export function ChatContainer({ mahberId }: { mahberId: string }) {
  const { socket } = useWebSocket(mahberId);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (msg: Message) =>
      setMessages((prev) => [...prev, msg]));
    socket.on('message:edit', (updated: Message) =>
      setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m)));
    socket.on('message:delete', (id: string) =>
      setMessages((prev) => prev.filter((m) => m.id !== id)));

    return () => {
      socket.off('message:new');
      socket.off('message:edit');
      socket.off('message:delete');
    };
  }, [socket]);
}
```

### 8.3 Notification Real-time Updates

```typescript
// Attach in the dashboard layout, not root layout, to avoid running before auth
// app/(dashboard)/layout.tsx
useEffect(() => {
  if (!socket) return;
  socket.on('notification:new', (notification: Notification) => {
    addNotification(notification);
    toast.info(notification.title, { description: notification.body });
  });
  return () => { socket.off('notification:new'); };
}, [socket]);
```

---

## 9. Internationalization (i18n)

### 9.1 next-intl Setup (App Router)

Use the `[locale]` folder approach. Do **not** add an `i18n` key to `next.config.js` — that is Pages Router only and conflicts with App Router.

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'am' }];
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 9.2 Translation Files

```json
// messages/en.json
{
  "landing": {
    "hero_title": "Manage Your Mahber, Equb & Iddir",
    "hero_subtitle": "A modern platform for Ethiopian community groups",
    "cta_start": "Get Started",
    "cta_login": "Sign In"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "phone": "Phone Number",
    "password": "Password",
    "name": "Full Name"
  },
  "mahber": {
    "create": "Create Mahber",
    "join": "Join Mahber",
    "list": "My Mahbers",
    "empty_title": "No mahbers yet",
    "empty_description": "Create a new mahber or join an existing one to get started.",
    "type": { "MAHBER": "Mahber", "EQUB": "Equb", "IDDIR": "Iddir" }
  },
  "payment": {
    "initiate": "Make Payment",
    "amount": "Amount",
    "status": { "Pending": "Pending", "Completed": "Completed", "Failed": "Failed" }
  },
  "roles": {
    "Admin": "Admin",
    "Treasurer": "Treasurer",
    "Secretary": "Secretary",
    "Member": "Member"
  }
}
```

```json
// messages/am.json
{
  "landing": {
    "hero_title": "መሀበርዎን፣ እቁብዎን እና እድርዎን ያስተዳድሩ",
    "hero_subtitle": "ለኢትዮጵያ ማህበረሰብ ቡድኖች ዘመናዊ መድረክ",
    "cta_start": "ጀምር",
    "cta_login": "ግባ"
  },
  "auth": {
    "login": "ግባ",
    "register": "ተመዝገብ",
    "logout": "ውጣ",
    "phone": "ስልክ ቁጥር",
    "password": "የይለፍ ቃል",
    "name": "ሙሉ ስም"
  },
  "mahber": {
    "create": "መሀበር ፍጠር",
    "join": "መሀበር ተቀላቀል",
    "list": "የኔ መሀበሮች",
    "empty_title": "ምንም መሀበር የለም",
    "empty_description": "አዲስ መሀበር ፍጠር ወይም ነባር መሀበር ተቀላቀል።",
    "type": { "MAHBER": "መሀበር", "EQUB": "እቁብ", "IDDIR": "እድር" }
  },
  "roles": {
    "Admin": "አስተዳዳሪ",
    "Treasurer": "ገንዘብ ያዥ",
    "Secretary": "ፀሐፊ",
    "Member": "አባል"
  }
}
```

### 9.3 Language Switcher

```typescript
// components/common/language-switcher.tsx
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // Replace the locale segment in the path
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {locale === 'en' ? '🇬🇧 English' : '🇪🇹 አማርኛ'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => switchLanguage('en')}>🇬🇧 English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('am')}>🇪🇹 አማርኛ</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 10. Development Roadmap

### Phase 0: Landing & Public Pages (Week 1)
**Goal**: Public-facing presence before auth

- [ ] Landing page with hero, features, mahber types, how-it-works, CTA sections
- [ ] About page
- [ ] Public navbar with language switcher and login/register links
- [ ] Responsive design for landing
- [ ] SEO meta tags

**Deliverables**: Public landing page live, users understand the product before signing up

---

### Phase 1: Foundation (Week 2)
**Goal**: Core infrastructure and auth

- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Install and configure Tailwind CSS + shadcn/ui
- [ ] Configure ESLint, Prettier, Husky
- [ ] Set up folder structure
- [ ] Create API client with Axios (localStorage + cookie dual strategy)
- [ ] Implement login and register pages
- [ ] Set up Zustand auth store
- [ ] Configure next-intl (App Router `[locale]` approach, no next.config i18n key)
- [ ] Create dashboard layout (header, sidebar, footer)
- [ ] Onboarding page for first-time users with zero mahbers
- [ ] `loading.tsx` and `error.tsx` for root and key route segments

**Deliverables**: Working auth flow, dashboard shell, i18n working

---

### Phase 2: Mahber Management (Weeks 3-4)
**Goal**: Core mahber functionality

- [ ] Mahber list page with empty state
- [ ] Create mahber page with configuration form
- [ ] Join mahber page (search public mahbers + invitation code)
- [ ] Mahber overview page
- [ ] Members list page
- [ ] Member details page
- [ ] Join requests page (Admin)
- [ ] Role assignment dialog

**Deliverables**: Full mahber create/join/manage workflow

---

### Phase 3: Financial Module (Weeks 5-6)
**Goal**: Payments and financial tracking

- [ ] Payment initiation page
- [ ] Chapa checkout flow (open in new tab + poll for status)
- [ ] Payment callback/return page (`/payments/callback`)
- [ ] Payment list and details pages
- [ ] Ledger page with transaction history
- [ ] Balance card
- [ ] Fines management page (with waive dialog for Treasurer)
- [ ] Financial report page (Treasurer only)
- [ ] Lottery history page (Equb groups)
- [ ] Export to CSV/PDF

**Deliverables**: Complete payment flow, ledger, fines, lottery history

---

### Phase 4: Events Module (Weeks 7-8)
**Goal**: Event management and attendance

- [ ] Events list page
- [ ] Create/edit event form
- [ ] Event details page
- [ ] QR code display page (renders backend data URL image)
- [ ] QR scanner page (html5-qrcode → POST attendance)
- [ ] Attendance list
- [ ] Photo gallery with upload

**Deliverables**: Full event lifecycle with QR attendance

---

### Phase 5: Communication (Weeks 9-10)
**Goal**: Chat, announcements, polls

- [ ] Chat interface with WebSocket real-time updates
- [ ] Message edit and delete
- [ ] Announcements page (create requires Secretary/Admin)
- [ ] Polls page with voting and results chart (create requires Secretary/Admin)

**Deliverables**: Real-time chat, announcements, polls

---

### Phase 6: Admin Features (Weeks 11-12)
**Goal**: Admin tools

- [ ] Audit trail page with filtering
- [ ] Mahber settings page
- [ ] Custom role creation
- [ ] Bulk member operations
- [ ] Admin analytics dashboard

**Deliverables**: Complete admin toolset

---

### Phase 7: Polish & Optimization (Weeks 13-14)
**Goal**: UX and performance

- [ ] `loading.tsx` skeletons per route segment
- [ ] `error.tsx` error boundaries per route segment
- [ ] Empty states for all list pages
- [ ] Mobile/tablet responsive pass
- [ ] PWA manifest, service worker, offline support (see Section 15)
- [ ] Performance optimization (image optimization, lazy loading)
- [ ] Accessibility review

---

### Phase 8: Testing & Deployment (Weeks 15-16)
**Goal**: Production-ready

- [ ] Unit tests for utilities and hooks
- [ ] Integration tests for API calls
- [ ] E2E tests with Playwright (auth, payment flow, QR attendance)
- [ ] Deployment to Vercel
- [ ] CI/CD pipeline
- [ ] Monitoring setup (Sentry or similar)

---

## 11. Key Implementation Details

### 11.1 Landing Page Structure

```typescript
// app/(public)/page.tsx
export default function LandingPage() {
  return (
    <>
      <HeroSection />        {/* Headline, subtext, CTA buttons */}
      <FeaturesSection />    {/* Key features: payments, events, chat, etc. */}
      <MahberTypesSection /> {/* Explain Mahber vs Equb vs Iddir */}
      <HowItWorksSection />  {/* 3-step: create/join → contribute → manage */}
      <CTASection />         {/* Final call to register */}
    </>
  );
}
```

### 11.2 Onboarding Flow

After registration, if `GET /mahbers` returns an empty array, redirect to `/onboarding`. The onboarding page presents two clear paths: create a new mahber or join an existing one.

```typescript
// app/(dashboard)/mahbers/page.tsx
const { data: mahbers } = useQuery({ queryKey: ['mahbers'], queryFn: mahberApi.list });

useEffect(() => {
  if (mahbers && mahbers.length === 0) {
    router.replace('/onboarding');
  }
}, [mahbers]);
```

### 11.3 Payment Flow with Chapa

The `InitiatePaymentDto` requires these fields — the payment form must collect them all:

```typescript
// Required by backend InitiatePaymentDto
interface InitiatePaymentDto {
  payment_type: 'Contribution' | 'JoinFee' | 'Fine';
  amount: number;        // positive number
  email: string;         // payer's email (required by Chapa)
  first_name: string;    // payer's first name
  last_name: string;     // payer's last name
  callback_url?: string; // defaults to app.callbackUrl from backend config
  return_url?: string;   // defaults to app.returnUrl from backend config
}
```

The response returns `{ checkout_url, payment_id, tx_ref }`.

```typescript
// app/(dashboard)/mahbers/[id]/payments/initiate/page.tsx
const handleSubmit = async (data: InitiatePaymentDto) => {
  const { checkout_url, payment_id } = await paymentApi.initiate(mahberId, data);

  // Open Chapa in a new tab
  window.open(checkout_url, '_blank');

  // Poll for status (Chapa also calls the backend webhook, but we poll as fallback)
  const interval = setInterval(async () => {
    const payment = await paymentApi.getOne(mahberId, payment_id);
    if (payment.status === 'Completed') {
      clearInterval(interval);
      toast.success('Payment successful!');
      router.push(`/mahbers/${mahberId}/payments/${payment_id}`);
    } else if (payment.status === 'Failed') {
      clearInterval(interval);
      toast.error('Payment failed. Please try again.');
    }
  }, 3000);

  // Stop polling after 10 minutes
  setTimeout(() => clearInterval(interval), 600_000);
};
```

### 11.4 Payment Callback Page

Chapa redirects back to the app after checkout. This page reads the `payment_id` from the query string and shows the final status.

```typescript
// app/(dashboard)/payments/callback/page.tsx
// Chapa redirects to: /payments/callback?payment_id=xxx&mahber_id=yyy
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const mahberId = searchParams.get('mahber_id');

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentApi.getOne(mahberId!, paymentId!),
    enabled: !!paymentId && !!mahberId,
    refetchInterval: (data) => (data?.status === 'Pending' ? 3000 : false),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col items-center gap-4 py-16">
      {payment?.status === 'Completed' && <SuccessState payment={payment} />}
      {payment?.status === 'Failed' && <FailureState payment={payment} />}
      {payment?.status === 'Pending' && <PendingState />}
    </div>
  );
}
```

### 11.5 QR Code Display (Corrected)

The backend returns a pre-rendered PNG as a base64 data URL. No client-side QR generation needed.

```typescript
// app/(dashboard)/mahbers/[id]/events/[eventId]/qr/page.tsx
export default function QRPage() {
  const { data } = useQuery({
    queryKey: ['event-qr', eventId],
    queryFn: () => attendanceApi.getQR(mahberId, eventId),
    // Returns { qr_code: "data:image/png;base64,..." }
  });

  return <QRDisplay dataUrl={data.qr_code} eventTitle={event.title} expiresAt={event.end_time} />;
}
```

### 11.6 DELETE with Body (Notification Unregister)

Some HTTP clients strip bodies from DELETE requests. Use `axios.delete` with the `data` option:

```typescript
// lib/api/notifications.ts
export const notificationApi = {
  unregisterDevice: (token: string) =>
    apiClient.delete('/notifications/unregister-device', { data: { token } }),
};
```

---

## 12. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Production
# NEXT_PUBLIC_API_URL=https://api.mahberconnect.com
# NEXT_PUBLIC_WS_URL=wss://api.mahberconnect.com
# NEXT_PUBLIC_APP_URL=https://mahberconnect.com
```

---

## 13. Deployment

### 13.1 Vercel Deployment

```bash
pnpm i -g vercel
vercel login
vercel --prod
```

### 13.2 Build Configuration

```javascript
// next.config.js
// Note: No 'i18n' key here — that is Pages Router only.
// next-intl uses the app/[locale]/ folder approach with App Router.
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mahberconnect.com' },
    ],
  },
};

module.exports = nextConfig;
```

---

## 14. PWA & Mobile Support

MahberConnect is a daily-use app for community members who will primarily access it on mobile phones. PWA support makes it installable, fast on repeat visits, and functional with poor connectivity — without needing an app store.

### 15.1 Dependencies

```bash
pnpm add next-pwa
pnpm add -D @types/serviceworker
```

`next-pwa` wraps Workbox and integrates cleanly with Next.js App Router.

### 15.2 next.config.js

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // avoid SW noise in dev
  fallbacks: {
    document: '/offline', // served when a page is requested offline
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mahberconnect.com' },
    ],
  },
};

module.exports = withPWA(nextConfig);
```

### 15.3 Web App Manifest

```json
// public/manifest.json
{
  "name": "MahberConnect",
  "short_name": "Mahber",
  "description": "Manage your Mahber, Equb, and Iddir community groups",
  "start_url": "/mahbers",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1a6b3c",
  "lang": "en",
  "icons": [
    { "src": "/icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Dashboard"
    }
  ],
  "categories": ["finance", "social", "utilities"]
}
```

Link it in the root layout:

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  manifest: '/manifest.json',
  themeColor: '#1a6b3c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MahberConnect',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // prevents unwanted zoom on input focus on iOS
    viewportFit: 'cover', // respects iPhone notch/safe areas
  },
};
```

### 15.4 Offline Fallback Page

```typescript
// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
      <WifiOff className="w-16 h-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">You're offline</h1>
      <p className="text-muted-foreground max-w-sm">
        Check your connection and try again. Pages you've visited recently may still be available.
      </p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );
}
```

### 15.5 Caching Strategy

Workbox (via next-pwa) handles this automatically, but the strategy per resource type:

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| Next.js static assets (`/_next/static`) | Cache First | Immutable, versioned filenames |
| Pages (HTML) | Network First | Always try fresh, fall back to cache |
| API responses | Network Only | Financial/membership data must be live |
| Images (`/icons`, `/images`) | Cache First | Rarely change |
| Google Fonts / CDN | Stale While Revalidate | Fast load, background refresh |

For API responses, do **not** cache — stale payment or membership data would be misleading. The offline page handles the case where a user tries to navigate to a new page without connectivity.

### 15.6 Install Prompt (Add to Home Screen)

```typescript
// components/common/install-prompt.tsx
'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-72x72.png" alt="" className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Install MahberConnect</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for quick access
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShow(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1" onClick={handleInstall}>Install</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShow(false)}>
            Not now
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

Mount it in the dashboard layout so it only appears to authenticated users:

```typescript
// app/(dashboard)/layout.tsx
import { InstallPrompt } from '@/components/common/install-prompt';

export default function DashboardLayout({ children }) {
  return (
    <>
      <Sidebar />
      <main>{children}</main>
      <InstallPrompt />
    </>
  );
}
```

### 15.7 Push Notifications (Web Push via FCM)

The backend already has `POST /notifications/register-device` and `DELETE /notifications/unregister-device`. The frontend needs to request permission and register the FCM web token.

```typescript
// lib/hooks/use-push-notifications.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { notificationApi } from '@/lib/api/notifications';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

export function usePushNotifications() {
  const { addNotification } = useNotificationStore();

  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    // Register with backend — platform 'web'
    await notificationApi.registerDevice(token, 'web');

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      addNotification({
        id: payload.messageId ?? Date.now().toString(),
        title: payload.notification?.title ?? '',
        body: payload.notification?.body ?? '',
      });
      toast.info(payload.notification?.title ?? '', {
        description: payload.notification?.body,
      });
    });
  };

  return { requestPermission };
}
```

Trigger permission request after login, not on page load — browsers block prompts that fire immediately:

```typescript
// After successful login in auth-store.ts
login: async (phone, password) => {
  // ... existing login logic ...

  // Defer push permission — ask after user is settled in the app
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Show an in-app prompt first, then call requestPermission on user action
      useUIStore.getState().setShowNotificationPrompt(true);
    }
  }, 5000);
},
```

Add a `firebase-messaging-sw.js` to `public/` for background message handling:

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  projectId: self.FIREBASE_PROJECT_ID,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  });
});
```

### 15.8 Mobile UX Considerations

- Use `safe-area-inset` padding on the bottom nav for iPhone notch/home indicator:
  ```css
  /* globals.css */
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
  }
  ```
- Minimum touch target size: 44×44px for all interactive elements
- Sidebar collapses to a bottom navigation bar on mobile (`useMediaQuery('(max-width: 768px)')`)
- Disable `maximumScale: 1` in viewport to prevent iOS zoom on input focus
- Chat input stays above the keyboard using `position: sticky; bottom: 0` with `env(safe-area-inset-bottom)`

### 15.9 Additional Environment Variables for PWA

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

---

## 15. Summary

**Estimated Timeline**: 16 weeks (8 phases)
**Team Size**: 2-3 developers

Key corrections applied from the original plan:
- Role names are PascalCase (`Admin`, `Treasurer`, `Secretary`, `Member`) matching the backend
- QR endpoint returns a base64 PNG data URL — rendered as `<img>`, not via qrcode.react
- Announcement and poll creation requires `SEND_ANNOUNCEMENTS` permission (Secretary or Admin, not Admin-only)
- Audit trail requires `MANAGE_MEMBERS` permission (Admin only)
- React Query v5 uses `gcTime` not `cacheTime`
- Auth token uses dual storage (localStorage for API client + cookie for middleware)
- `next.config.js` has no `i18n` key — App Router uses `[locale]` folder with next-intl
- `DELETE /notifications/unregister-device` sends body via `{ data: dto }`
- `InitiatePaymentDto` requires `email`, `first_name`, `last_name` — payment form must collect these
- Lottery page now uses `GET /mahbers/:id/lottery/history` (dedicated endpoint, not audit trail)

New additions to the plan:
- Public landing page and about page
- Onboarding flow for new users with zero mahbers
- Payment callback/return page for Chapa redirects
- Lottery history + execute draw page for Equb groups
- `loading.tsx` and `error.tsx` per route segment
- `join-requests` page in folder structure
- `GET /mahbers/public` for mahber discovery on the join page
- `GET /mahbers/:id/statistics` for the mahber overview dashboard
- `POST /mahbers/:id/events/:eventId/process-attendance` for triggering absence fine processing
- Full PWA section (Section 14): manifest, service worker, offline page, install prompt, FCM web push, mobile UX

Backend additions made during audit:
- `GET /mahbers/public` — search public mahbers by name
- `GET /mahbers/:id/statistics` — member count, active members, upcoming events, payment count
- `GET /mahbers/:id/lottery/history` — past lottery draws
- `POST /mahbers/:id/lottery/execute` — manual lottery trigger (Treasurer/Admin)
- `POST /mahbers/:id/events/:eventId/process-attendance` — queue attendance processing job

Remaining known gaps (not blocking, lower priority):
- No WebSocket gateway on the backend — chat is REST-only polling for now; real-time requires adding `@WebSocketGateway` to the backend
- Photo storage is local disk (`./uploads/`) — production deployment needs a volume mount or migration to S3/object storage
- No scheduled announcement publishing — `scheduled_at` field exists in the DB but no background job publishes it
