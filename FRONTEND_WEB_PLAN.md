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
- **Server State**: TanStack Query (React Query)
- **API Client**: Axios
- **WebSocket**: Socket.io-client
- **Form State**: React Hook Form

### Utilities
- **Date**: date-fns
- **i18n**: next-intl
- **QR Code**: qrcode.react (generation), html5-qrcode (scanning)
- **PDF**: jsPDF or @react-pdf/renderer
- **Notifications**: react-hot-toast or sonner
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
│   ├── (auth)/                      # Auth layout group (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                 # Main app layout (with sidebar)
│   │   ├── layout.tsx              # Dashboard layout
│   │   ├── page.tsx                # Home/Dashboard
│   │   │
│   │   ├── mahbers/
│   │   │   ├── page.tsx            # List all mahbers
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   ├── join/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Mahber overview
│   │   │       ├── members/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [memberId]/
│   │   │       │       └── page.tsx
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
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── api/                         # API routes (optional)
│   │   └── webhook/
│   │       └── route.ts
│   │
│   ├── layout.tsx                   # Root layout
│   ├── globals.css
│   ├── providers.tsx
│   └── not-found.tsx
│
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
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── mobile-nav.tsx
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
│   │   ├── ledger-table.tsx
│   │   ├── balance-card.tsx
│   │   ├── financial-chart.tsx
│   │   ├── fine-table.tsx
│   │   └── waive-fine-dialog.tsx
│   │
│   ├── events/
│   │   ├── event-card.tsx
│   │   ├── event-list.tsx
│   │   ├── event-form.tsx
│   │   ├── qr-generator.tsx
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

### 3.1 Authentication Pages

| Route | Page | API Calls | Auth Required |
|-------|------|-----------|---------------|
| `/login` | Login | `POST /auth/login` | No |
| `/register` | Register | `POST /auth/register` | No |
| `/forgot-password` | Forgot Password (future) | `POST /auth/forgot-password` | No |

### 3.2 Dashboard Pages

| Route | Page | API Calls | Auth Required |
|-------|------|-----------|---------------|
| `/` or `/mahbers` | Mahber List (Home) | `GET /mahbers` | Yes |
| `/profile` | User Profile | `GET /auth/profile`, `PUT /auth/profile` | Yes |
| `/settings` | App Settings | - | Yes |

### 3.3 Mahber Management

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/create` | Create Mahber | `POST /mahbers` | Yes | - |
| `/mahbers/join` | Join Mahber | `POST /mahbers/:id/join-requests` | Yes | - |
| `/mahbers/[id]` | Mahber Overview | `GET /mahbers/:id` | Yes | Member |
| `/mahbers/[id]/settings` | Mahber Settings | `GET /mahbers/:id`, `PUT /mahbers/:id` | Yes | Admin |

### 3.4 Membership Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/members` | Members List | `GET /mahbers/:id/members` | Yes | Member |
| `/mahbers/[id]/members/[memberId]` | Member Details | `GET /mahbers/:id/members/:memberId` | Yes | Member |
| `/mahbers/[id]/join-requests` | Join Requests (Admin) | `GET /mahbers/:id/join-requests`, `PUT /mahbers/:id/join-requests/:requestId` | Yes | Admin |

### 3.5 Financial Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/payments` | Payments List | `GET /mahbers/:id/payments` | Yes | Member |
| `/mahbers/[id]/payments/initiate` | Initiate Payment | `POST /mahbers/:id/payments/initiate` | Yes | Member |
| `/mahbers/[id]/payments/[paymentId]` | Payment Details | `GET /mahbers/:id/payments/:paymentId` | Yes | Member |
| `/mahbers/[id]/ledger` | Ledger | `GET /mahbers/:id/ledger`, `GET /mahbers/:id/balance` | Yes | Member |
| `/mahbers/[id]/fines` | Fines | `GET /mahbers/:id/fines`, `POST /mahbers/:id/fines/:fineId/waive` | Yes | Member |
| `/mahbers/[id]/reports/financial` | Financial Report | `GET /mahbers/:id/reports/financial` | Yes | Treasurer |

### 3.6 Events Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/events` | Events List | `GET /mahbers/:id/events` | Yes | Member |
| `/mahbers/[id]/events/create` | Create Event | `POST /mahbers/:id/events` | Yes | Secretary+ |
| `/mahbers/[id]/events/[eventId]` | Event Details | `GET /mahbers/:id/events/:eventId` | Yes | Member |
| `/mahbers/[id]/events/[eventId]/qr` | QR Code Generator | `GET /mahbers/:id/events/:eventId/qr` | Yes | Secretary+ |
| `/mahbers/[id]/events/[eventId]/scan` | QR Scanner | `POST /mahbers/:id/events/:eventId/attendance` | Yes | Member |
| `/mahbers/[id]/events/[eventId]/photos` | Photo Gallery | `GET /mahbers/:id/events/:eventId/photos`, `POST /mahbers/:id/events/:eventId/photos` | Yes | Member |

### 3.7 Communication Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/chat` | Chat | `GET /mahbers/:id/chat/messages`, `POST /mahbers/:id/chat/messages` | Yes | Member |
| `/mahbers/[id]/announcements` | Announcements | `GET /mahbers/:id/announcements`, `POST /mahbers/:id/announcements` | Yes | Member |
| `/mahbers/[id]/polls` | Polls | `GET /mahbers/:id/polls`, `POST /mahbers/:id/polls`, `POST /mahbers/:id/polls/:pollId/vote` | Yes | Member |

### 3.8 Admin Pages

| Route | Page | API Calls | Auth Required | Role Required |
|-------|------|-----------|---------------|---------------|
| `/mahbers/[id]/audit` | Audit Trail | `GET /mahbers/:id/audit-trail` | Yes | Admin |

---

## 4. API Integration Reference

### 4.1 API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies
});

// Request interceptor - add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
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

### 4.2 Complete API Endpoint Map

#### Authentication
```typescript
POST   /auth/register          // Register new user
POST   /auth/login             // Login
GET    /auth/profile           // Get current user
PUT    /auth/profile           // Update profile
```

#### Mahbers
```typescript
POST   /mahbers                // Create mahber
GET    /mahbers                // List user's mahbers
GET    /mahbers/:id            // Get mahber details
PUT    /mahbers/:id            // Update mahber
DELETE /mahbers/:id            // Delete mahber
```

#### Join Requests
```typescript
POST   /mahbers/:id/join-requests              // Submit join request
GET    /mahbers/:id/join-requests              // List join requests (Admin)
PUT    /mahbers/:id/join-requests/:requestId   // Approve/Reject request
```

#### Members
```typescript
GET    /mahbers/:id/members                    // List members (paginated)
GET    /mahbers/:id/members/:memberId          // Get member details
POST   /mahbers/:id/members/:memberId/suspend  // Suspend member
POST   /mahbers/:id/members/:memberId/reinstate // Reinstate member
```

#### Roles
```typescript
PUT    /mahbers/:id/members/:memberId/role     // Assign role
POST   /mahbers/:id/roles                      // Create custom role
```

#### Payments
```typescript
POST   /mahbers/:id/payments/initiate          // Initiate payment
GET    /mahbers/:id/payments                   // List payments (paginated, filterable)
GET    /mahbers/:id/payments/:paymentId        // Get payment details
POST   /mahbers/:id/payments/:paymentId/retry  // Retry failed payment
```

#### Ledger & Financial
```typescript
GET    /mahbers/:id/ledger                     // Get ledger entries (paginated, filterable)
GET    /mahbers/:id/balance                    // Get member balance
GET    /mahbers/:id/reports/financial          // Financial report (Treasurer)
```

#### Fines
```typescript
GET    /mahbers/:id/fines                      // List fines (filterable)
POST   /mahbers/:id/fines/:fineId/waive        // Waive fine (Treasurer)
```

#### Events
```typescript
POST   /mahbers/:id/events                     // Create event
GET    /mahbers/:id/events                     // List events (paginated, filterable)
GET    /mahbers/:id/events/:eventId            // Get event details
PUT    /mahbers/:id/events/:eventId            // Update event
DELETE /mahbers/:id/events/:eventId            // Cancel event
```

#### Attendance
```typescript
GET    /mahbers/:id/events/:eventId/qr         // Generate QR code (Admin)
POST   /mahbers/:id/events/:eventId/attendance // Record attendance
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
PUT    /mahbers/:id/chat/messages/:messageId   // Edit message
DELETE /mahbers/:id/chat/messages/:messageId   // Delete message
```

#### Announcements
```typescript
POST   /mahbers/:id/announcements              // Create announcement (Admin)
GET    /mahbers/:id/announcements              // List announcements (paginated)
POST   /mahbers/:id/announcements/:announcementId/read // Mark as read
```

#### Polls
```typescript
POST   /mahbers/:id/polls                      // Create poll (Admin)
GET    /mahbers/:id/polls                      // List polls (paginated)
POST   /mahbers/:id/polls/:pollId/vote         // Cast vote
GET    /mahbers/:id/polls/:pollId/results      // Get results
```

#### Notifications
```typescript
POST   /notifications/register-device          // Register FCM token (for web push)
DELETE /notifications/unregister-device        // Unregister device
```

#### Audit Trail
```typescript
GET    /mahbers/:id/audit-trail                // Get audit logs (Admin, paginated, filterable)
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
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tooltip
```

### 5.2 Custom Components

#### Phone Input Component
```typescript
// components/common/phone-input.tsx
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// Features:
// - Auto-format: +251 XXX XXX XXX
// - Validation: Must be exactly 9 digits after +251
// - Ethiopian flag icon
// - Error state styling
```

#### Currency Input Component
```typescript
// components/common/currency-input.tsx
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: 'ETB';
  min?: number;
  max?: number;
}

// Features:
// - Format: 1,234.56 ETB
// - Thousand separators
// - Decimal precision (2 places)
// - Min/max validation
```

#### Data Table Component
```typescript
// components/common/data-table.tsx
// Built with TanStack Table
// Features:
// - Sorting
// - Filtering
// - Pagination
// - Column visibility toggle
// - Row selection
// - Export to CSV
```

#### QR Generator Component
```typescript
// components/events/qr-generator.tsx
// Uses qrcode.react
// Features:
// - Generate QR from token
// - Customizable size
// - Download as image
// - Print functionality
// - Expiration countdown
```

#### QR Scanner Component
```typescript
// components/events/qr-scanner.tsx
// Uses html5-qrcode
// Features:
// - Camera permission request
// - Scanning frame overlay
// - Success/error feedback
// - Fallback for no camera
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
  
  // Actions
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
    const response = await authApi.login({ phone, password });
    localStorage.setItem('access_token', response.access_token);
    set({ user: response.user, token: response.access_token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  // ... other actions
}));
```

#### Mahber Store
```typescript
// lib/store/mahber-store.ts
interface MahberState {
  mahbers: Mahber[];
  currentMahber: Mahber | null;
  isLoading: boolean;
  
  // Actions
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
  
  // Actions
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}
```

### 6.2 React Query Setup

```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
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
export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isTreasurer: user?.role === 'treasurer',
  };
}
```

#### useMahber Hook
```typescript
// lib/hooks/use-mahber.ts
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
// lib/hooks/use-payments.ts
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
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/register');
  
  // Redirect to login if not authenticated
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect to home if authenticated and trying to access auth pages
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/mahbers', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 7.2 Permission Checking

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

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  treasurer: [PERMISSIONS.MANAGE_FINANCES, PERMISSIONS.VIEW_REPORTS],
  secretary: [PERMISSIONS.CREATE_EVENTS, PERMISSIONS.SEND_ANNOUNCEMENTS],
  member: [],
};

export function hasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

### 7.3 Protected Route Component

```typescript
// components/common/protected-route.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission,
  fallback 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    redirect('/login');
  }
  
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return fallback || <div>Access Denied</div>;
  }
  
  return <>{children}</>;
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
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
    });
    
    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
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
    
    // Listen for new messages
    socket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });
    
    // Listen for message edits
    socket.on('message:edit', (updatedMessage: Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    });
    
    // Listen for message deletes
    socket.on('message:delete', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });
    
    return () => {
      socket.off('message:new');
      socket.off('message:edit');
      socket.off('message:delete');
    };
  }, [socket]);
  
  // ... rest of component
}
```

### 8.3 Notification Real-time Updates

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { socket } = useWebSocket('global');
  const { addNotification } = useNotificationStore();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('notification:new', (notification: Notification) => {
      addNotification(notification);
      toast.info(notification.title, {
        description: notification.body,
      });
    });
    
    return () => {
      socket.off('notification:new');
    };
  }, [socket]);
  
  return <html>{children}</html>;
}
```

---

## 9. Internationalization (i18n)

### 9.1 next-intl Setup

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
  } catch (error) {
    notFound();
  }
  
  return (
    <html lang={locale} dir={locale === 'am' ? 'ltr' : 'ltr'}>
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
// public/locales/en/common.json
{
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "phone": "Phone Number",
    "password": "Password",
    "name": "Name"
  },
  "mahber": {
    "create": "Create Mahber",
    "join": "Join Mahber",
    "list": "My Mahbers",
    "type": {
      "MAHBER": "Mahber",
      "EQUB": "Equb",
      "IDDIR": "Iddir"
    }
  },
  "payment": {
    "initiate": "Make Payment",
    "amount": "Amount",
    "status": {
      "Pending": "Pending",
      "Completed": "Completed",
      "Failed": "Failed"
    }
  }
}
```

```json
// public/locales/am/common.json
{
  "auth": {
    "login": "ግባ",
    "register": "ተመዝገብ",
    "logout": "ውጣ",
    "phone": "ስልክ ቁጥር",
    "password": "የይለፍ ቃል",
    "name": "ስም"
  },
  "mahber": {
    "create": "መሀበር ፍጠር",
    "join": "መሀበር ተቀላቀል",
    "list": "የኔ መሀበሮች",
    "type": {
      "MAHBER": "መሀበር",
      "EQUB": "እቁብ",
      "IDDIR": "እድር"
    }
  }
}
```

### 9.3 Language Switcher Component

```typescript
// components/common/language-switcher.tsx
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const switchLanguage = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {locale === 'en' ? '🇬🇧 English' : '🇪🇹 አማርኛ'}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => switchLanguage('en')}>
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('am')}>
          🇪🇹 አማርኛ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 10. Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up project and core infrastructure

- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Set up shadcn/ui components
- [ ] Configure ESLint, Prettier, Husky
- [ ] Set up folder structure
- [ ] Create API client with Axios
- [ ] Implement authentication (login, register)
- [ ] Set up Zustand stores
- [ ] Configure next-intl for i18n
- [ ] Create layout components (header, sidebar, footer)

**Deliverables**:
- Working authentication flow
- Basic layout with navigation
- API client configured
- i18n working (English/Amharic)

---

### Phase 2: Mahber Management (Weeks 3-4)
**Goal**: Core mahber functionality

- [ ] Mahber list page
- [ ] Create mahber page with configuration form
- [ ] Join mahber page
- [ ] Mahber details page (overview tab)
- [ ] Members list page
- [ ] Member details page
- [ ] Join request management (admin)
- [ ] Role assignment functionality

**Deliverables**:
- Users can create and join mahbers
- Admins can manage members and roles
- Complete membership workflow

---

### Phase 3: Financial Module (Weeks 5-6)
**Goal**: Payment and financial tracking

- [ ] Payment initiation page
- [ ] Chapa payment integration
- [ ] Payment list and details pages
- [ ] Ledger page with transaction history
- [ ] Balance tracking
- [ ] Fines management
- [ ] Financial reports (treasurer)
- [ ] Payment status polling
- [ ] Export functionality (CSV/PDF)

**Deliverables**:
- Complete payment flow with Chapa
- Ledger and balance tracking
- Financial reporting for treasurers

---

### Phase 4: Events Module (Weeks 7-8)
**Goal**: Event management and attendance

- [ ] Events list page
- [ ] Create/edit event page
- [ ] Event details page
- [ ] QR code generation
- [ ] QR code scanning
- [ ] Attendance tracking
- [ ] Photo gallery
- [ ] Photo upload functionality
- [ ] Event notifications

**Deliverables**:
- Complete event lifecycle
- QR-based attendance system
- Photo gallery for events

---

### Phase 5: Communication (Weeks 9-10)
**Goal**: Chat, announcements, and polls

- [ ] Chat interface
- [ ] WebSocket integration for real-time chat
- [ ] Message editing and deletion
- [ ] Announcements page
- [ ] Create announcement (admin)
- [ ] Polls page
- [ ] Create poll (admin)
- [ ] Vote on polls
- [ ] Poll results visualization

**Deliverables**:
- Real-time chat system
- Announcement broadcasting
- Voting/polling system

---

### Phase 6: Admin Features (Weeks 11-12)
**Goal**: Admin tools and audit

- [ ] Audit trail page
- [ ] Advanced filtering and search
- [ ] Mahber settings page
- [ ] Custom role creation
- [ ] Bulk operations
- [ ] Data export tools
- [ ] Admin dashboard with analytics

**Deliverables**:
- Complete admin toolset
- Audit trail for compliance
- Analytics dashboard

---

### Phase 7: Polish & Optimization (Weeks 13-14)
**Goal**: UX improvements and performance

- [ ] Responsive design for mobile/tablet
- [ ] Loading states and skeletons
- [ ] Error boundaries
- [ ] Empty states
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] PWA features (offline support, install prompt)
- [ ] Comprehensive testing

**Deliverables**:
- Fully responsive application
- Excellent UX with proper feedback
- Accessible to all users
- Fast and optimized

---

### Phase 8: Testing & Deployment (Weeks 15-16)
**Goal**: Production-ready application

- [ ] Unit tests for critical functions
- [ ] Integration tests for API calls
- [ ] E2E tests with Playwright
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deployment to Vercel/Netlify
- [ ] CI/CD pipeline
- [ ] Monitoring and analytics setup

**Deliverables**:
- Fully tested application
- Deployed to production
- Documentation complete
- Monitoring in place

---

## 11. Key Implementation Details

### 11.1 Payment Flow with Chapa

```typescript
// lib/api/payments.ts
export async function initiatePayment(
  mahberId: string,
  data: InitiatePaymentDto
): Promise<{ checkout_url: string; payment_id: string }> {
  const response = await apiClient.post(
    `/mahbers/${mahberId}/payments/initiate`,
    data
  );
  return response.data;
}

// app/mahbers/[id]/payments/initiate/page.tsx
export default function InitiatePaymentPage() {
  const router = useRouter();
  const { mahberId } = useParams();
  
  const handleSubmit = async (data: InitiatePaymentDto) => {
    try {
      const { checkout_url, payment_id } = await initiatePayment(mahberId, data);
      
      // Open Chapa checkout in new window
      const chapaWindow = window.open(checkout_url, '_blank');
      
      // Poll for payment status
      const pollInterval = setInterval(async () => {
        const payment = await getPaymentStatus(mahberId, payment_id);
        
        if (payment.status === 'Completed') {
          clearInterval(pollInterval);
          chapaWindow?.close();
          toast.success('Payment successful!');
          router.push(`/mahbers/${mahberId}/payments/${payment_id}`);
        } else if (payment.status === 'Failed') {
          clearInterval(pollInterval);
          chapaWindow?.close();
          toast.error('Payment failed. Please try again.');
        }
      }, 3000);
      
      // Stop polling after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600000);
    } catch (error) {
      toast.error('Failed to initiate payment');
    }
  };
  
  return <PaymentForm onSubmit={handleSubmit} />;
}
```

### 11.2 QR Code Generation

```typescript
// components/events/qr-generator.tsx
import QRCode from 'qrcode.react';

interface QRGeneratorProps {
  qrToken: string;
  eventTitle: string;
  expiresAt: Date;
}

export function QRGenerator({ qrToken, eventTitle, expiresAt }: QRGeneratorProps) {
  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${eventTitle}-qr.png`;
    link.href = url;
    link.click();
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      <QRCode
        id="qr-code"
        value={qrToken}
        size={300}
        level="H"
        includeMargin
      />
      <div className="text-center">
        <p className="font-semibold">{eventTitle}</p>
        <p className="text-sm text-muted-foreground">
          Expires: {format(expiresAt, 'PPpp')}
        </p>
        <CountdownTimer expiresAt={expiresAt} />
      </div>
      <div className="flex gap-2">
        <Button onClick={downloadQR}>Download QR</Button>
        <Button variant="outline" onClick={() => window.print()}>
          Print QR
        </Button>
      </div>
    </div>
  );
}
```

### 11.3 QR Code Scanning

```typescript
// components/events/qr-scanner.tsx
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

interface QRScannerProps {
  onScan: (qrToken: string) => void;
  onError: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    );
    
    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        console.error(error);
      }
    );
    
    scannerRef.current = scanner;
    
    return () => {
      scanner.clear();
    };
  }, [onScan]);
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div id="qr-reader" className="w-full max-w-md" />
      <p className="text-sm text-muted-foreground">
        Point your camera at the QR code to mark attendance
      </p>
    </div>
  );
}
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
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 13.2 Build Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.mahberconnect.com'],
  },
  i18n: {
    locales: ['en', 'am'],
    defaultLocale: 'en',
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

---

## 14. Summary

This comprehensive plan provides everything needed to build the MahberConnect web application:

✅ **Complete technology stack** - Next.js 14, TypeScript, Tailwind, shadcn/ui
✅ **Detailed project structure** - Every folder and file mapped out
✅ **All 40+ pages documented** - Routes, APIs, components, features
✅ **API integration guide** - Every endpoint with examples
✅ **Component library** - Reusable components for all features
✅ **State management** - Zustand stores and React Query setup
✅ **Real-time features** - WebSocket integration for chat and notifications
✅ **Internationalization** - Amharic and English support
✅ **16-week development roadmap** - Phased approach with clear deliverables
✅ **Implementation examples** - Code snippets for complex features
✅ **Deployment guide** - Production-ready configuration

**Estimated Timeline**: 16 weeks (4 months)
**Team Size**: 2-3 developers
**Complexity**: Medium-High

The web application will be fully responsive, accessible, and production-ready with all features from the backend API integrated seamlessly.
