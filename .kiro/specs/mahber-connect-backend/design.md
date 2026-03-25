# Design Document: MahberConnect Backend

## Overview

MahberConnect is a cloud-based backend system built with NestJS that digitizes traditional Ethiopian social and financial institutions (Mahber, Equb, Iddir). The system provides REST APIs for mobile and web clients, implementing a monolithic architecture with modular structure for maintainability and scalability.

### Core Capabilities

- Multi-tenant architecture with strict data isolation per Mahber organization
- JWT-based authentication with role-based access control (RBAC)
- Payment gateway integration with Chapa for mobile money transactions
- Automated financial calculations (fines, lottery draws, balance tracking)
- Real-time notifications via Firebase Cloud Messaging
- QR-based event attendance tracking
- Background job scheduling for automated tasks
- Comprehensive audit trail for financial transactions
- Support for Amharic and English languages

### Technology Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport.js
- **Payment Gateway**: Chapa API (Telebirr/CBE Birr)
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Job Scheduling**: Bull Queue with Redis
- **File Storage**: Local filesystem or S3-compatible storage
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest with property-based testing using fast-check
- **Containerization**: Docker with docker-compose

## Architecture

### High-Level Architecture


```mermaid
graph TB
    Client[Mobile/Web Client]
    API[NestJS API Gateway]
    Auth[Auth Module]
    Membership[Membership Module]
    Financial[Financial Module]
    Events[Events Module]
    Communication[Communication Module]
    Automation[Automation Module]
    
    DB[(PostgreSQL)]
    Redis[(Redis)]
    Chapa[Chapa Payment Gateway]
    FCM[Firebase Cloud Messaging]
    Storage[File Storage]
    
    Client -->|REST API| API
    API --> Auth
    API --> Membership
    API --> Financial
    API --> Events
    API --> Communication
    
    Auth --> DB
    Membership --> DB
    Financial --> DB
    Financial --> Chapa
    Events --> DB
    Events --> Storage
    Communication --> DB
    Communication --> FCM
    
    Automation --> DB
    Automation --> Redis
    Automation --> Financial
    Automation --> Events
    Automation --> Communication
```

### Monolithic Modular Architecture

The system follows a monolithic architecture with clear module boundaries for maintainability. Each module is self-contained with its own controllers, services, entities, and DTOs.

**Module Structure**:
1. **Auth Module**: User registration, authentication, JWT token management
2. **Membership Module**: Organization management, join workflow, state machine, RBAC
3. **Financial Module**: Payments, ledger, fines, Equb lottery, Chapa integration
4. **Events Module**: Event scheduling, QR attendance, photo gallery
5. **Communication Module**: Announcements, chat, voting, FCM notifications
6. **Automation Module**: Background jobs, schedulers, automated tasks


### Multi-Tenancy Strategy

**Shared Database with Row-Level Isolation**: All tenants (Mahber organizations) share the same database with data isolated using `mahber_id` foreign keys.

**Enforcement Mechanisms**:
1. Query-Level Filtering: Custom repository base class automatically adds `mahber_id` filter
2. Guard-Level Validation: JWT token contains `mahber_id` claims, guards verify access
3. Service-Level Checks: All service methods validate tenant ownership

### Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant AuthGuard
    participant RoleGuard
    participant Service
    participant Repository
    participant Database

    Client->>Controller: HTTP Request + JWT
    Controller->>AuthGuard: Validate JWT
    AuthGuard->>AuthGuard: Verify signature & expiration
    AuthGuard->>Controller: Extract user & mahber_id
    Controller->>RoleGuard: Check permissions
    RoleGuard->>RoleGuard: Verify role has required permission
    RoleGuard->>Controller: Authorization OK
    Controller->>Service: Call business logic
    Service->>Repository: Query with mahber_id filter
    Repository->>Database: SELECT WHERE mahber_id = ?
    Database->>Repository: Filtered results
    Repository->>Service: Return data
    Service->>Controller: Process & return
    Controller->>Client: HTTP Response
```

## Components and Interfaces

### Auth Module

**Key Responsibilities**:
- User registration with Ethiopian phone number validation (+251XXXXXXXXX)
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation with user identity and role claims
- Token validation and expiration handling

**JWT Token Structure**:
```json
{
  "sub": "user-uuid",
  "phone": "+251912345678",
  "mahber_id": "mahber-uuid",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```


### Membership Module

**Key Responsibilities**:
- Mahber organization CRUD with JSONB configuration storage
- Join request workflow (Pending → Approved → Payment_Required → Active)
- Membership state machine enforcement with audit trail
- Dynamic RBAC with custom roles and permissions

**Membership State Machine**:

```mermaid
stateDiagram-v2
    [*] --> Pending: User submits join request
    Pending --> Approved: Admin approves
    Pending --> Rejected: Admin rejects
    Pending --> Invalidated: 7 days without payment
    Approved --> Payment_Required: Approval confirmed
    Payment_Required --> Active: Payment confirmed
    Payment_Required --> Invalidated: Payment deadline expires
    Active --> Suspended: Admin suspends member
    Suspended --> Active: Admin reinstates member
    Rejected --> [*]
    Invalidated --> [*]
```

**State Transition Validation**: The system enforces valid transitions using a state machine service that validates each transition against allowed paths and logs all changes to the audit trail.

**RBAC Implementation**: Roles are stored in JSONB format with flexible permission sets. Four predefined roles exist (Admin, Treasurer, Secretary, Member), and admins can create custom roles. Permissions are scoped by `mahber_id` to enforce multi-tenancy.

**Default Role Permissions**:
- **Admin**: All permissions (manage_members, manage_finances, create_events, send_announcements, view_reports, manage_roles)
- **Treasurer**: manage_finances, view_reports
- **Secretary**: create_events, send_announcements
- **Member**: No special permissions


### Financial Module

**Key Responsibilities**:
- Payment initiation and Chapa API integration
- Webhook processing with HMAC signature verification
- Digital ledger with running balance calculation
- Automated fine calculation (percentage or fixed amount)
- Equb lottery execution with cryptographic randomness
- Balance reconciliation and financial reporting

**Payment Flow with Chapa**:

```mermaid
sequenceDiagram
    participant Member
    participant API
    participant PaymentService
    participant Chapa
    participant WebhookHandler
    participant LedgerService

    Member->>API: POST /payments/initiate
    API->>PaymentService: Create payment record
    PaymentService->>Chapa: Initialize payment
    Chapa->>PaymentService: Return checkout URL
    PaymentService->>API: Return checkout URL
    API->>Member: Redirect to Chapa

    Member->>Chapa: Complete payment
    Chapa->>WebhookHandler: POST /webhooks/chapa
    WebhookHandler->>WebhookHandler: Verify HMAC signature
    WebhookHandler->>PaymentService: Update payment status
    PaymentService->>LedgerService: Create ledger entry
    LedgerService->>LedgerService: Update member balance
    WebhookHandler->>Chapa: 200 OK
```

**Webhook Security**: All webhooks from Chapa are verified using HMAC-SHA256 signature verification. Invalid signatures are rejected and logged as security alerts.

**Ledger Design**: The ledger maintains immutable transaction records with running balance calculation. Each entry includes transaction type (Contribution, Fine, Equb_Payout, Iddir_Payout, Refund), amount, and references to related entities.

**Fine Calculation**: Fines are calculated based on configurable penalty rates (percentage or fixed amount). The system supports two violation types: MISSED_PAYMENT and MISSED_ATTENDANCE. Treasurers can waive fines with recorded justification.

**Equb Lottery**: Uses cryptographically secure random number generation (crypto.randomBytes) with deterministic selection based on seed. Eligible members exclude those who have won in the current cycle or have unpaid fines exceeding threshold.


### Events Module

**Key Responsibilities**:
- Event creation with type classification (Meeting, Ceremony, Fundraiser, Social_Gathering)
- QR code generation for time-sensitive attendance tracking
- Attendance validation and recording
- Photo gallery management with thumbnail generation
- Automated fine application for mandatory event absences

**QR Attendance System**: QR codes are JWT tokens containing event_id, mahber_id, and expiration timestamp. Codes are valid for event duration plus 30-minute buffer. Scanning validates token signature, expiration, and member eligibility before recording attendance.

**Photo Gallery**: Supports JPEG/PNG uploads up to 10MB with automatic thumbnail generation. Photos are scoped by mahber_id with storage quotas per organization. Supports Amharic captions.

### Communication Module

**Key Responsibilities**:
- Announcement broadcasting with priority levels (Normal, Important, Urgent)
- Real-time chat messaging with Amharic support
- Voting/polling system with single-choice and multiple-choice options
- Push notification delivery via Firebase Cloud Messaging

**FCM Integration**: Notifications are sent using Firebase Admin SDK with multi-device support. Invalid tokens are automatically removed. Notifications include type-specific data payloads for client-side handling.

**Chat System**: Messages are stored with sender_id, mahber_id, content, and timestamp. Members can edit messages within 5 minutes. Pagination is implemented for message history. Offline members receive push notifications.

**Voting System**: Polls support eligibility criteria and voting deadlines. Votes are immutable after submission. Vote anonymity is maintained by not exposing individual choices. Admins can view real-time vote counts.


### Automation Module

**Key Responsibilities**:
- Background job scheduling using Bull Queue with Redis
- Fine calculation for overdue payments (daily at midnight)
- Join request expiry checker (daily at midnight)
- Equb lottery execution (daily at configured time)
- Payment reminder sender (3 days and 1 day before due date)
- Attendance processor (after event ends)

**Job Queue Architecture**: Uses Bull Queue with Redis for reliable job processing. Each job type has its own queue with retry logic and exponential backoff. Concurrent execution of the same job is prevented using job locks.

**Scheduled Jobs**:
1. **Fine Calculation**: Runs daily at midnight, checks for overdue payments based on payment frequency, applies fines to members with missed contributions
2. **Join Request Expiry**: Runs daily at midnight, transitions pending join requests older than 7 days to "Invalidated" status
3. **Lottery Execution**: Runs daily at configured time, executes lottery for Equb organizations with scheduled draw date
4. **Payment Reminders**: Runs daily, sends FCM notifications 3 days and 1 day before payment due date
5. **Attendance Processor**: Runs after event end time, marks non-attending members as absent and applies fines for mandatory events

## Data Models

### Core Entities

**User Entity**:
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string; // +251XXXXXXXXX format

  @Column()
  password: string; // bcrypt hashed

  @Column()
  name: string; // Supports Amharic

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  bio: string; // Supports Amharic

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Membership, membership => membership.user)
  memberships: Membership[];
}
```


**Mahber Entity**:
```typescript
@Entity('mahbers')
export class Mahber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: MahberType })
  type: MahberType; // MAHBER, EQUB, IDDIR

  @Column({ type: 'jsonb' })
  configuration: {
    contribution_amount: number;
    payment_frequency: 'Weekly' | 'Monthly' | 'Quarterly';
    penalty_rate: number;
    penalty_calculation_mode: 'percentage' | 'fixed';
    absence_fine_amount: number;
    operational_cost_rate: number;
    lottery_date?: string; // For Equb
    meeting_schedule?: string;
  };

  @Column({ default: true })
  is_public: boolean;

  @Column({ nullable: true })
  invitation_code: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Membership, membership => membership.mahber)
  memberships: Membership[];
}
```

**Membership Entity**:
```typescript
@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mahber_id: string;

  @Column()
  member_id: string;

  @Column({ type: 'enum', enum: MembershipStatus })
  status: MembershipStatus;

  @Column({ type: 'jsonb' })
  role: {
    name: string;
    permissions: string[];
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ default: false })
  has_won_current_cycle: boolean; // For Equb

  @Column({ nullable: true })
  approval_date: Date;

  @Column({ nullable: true })
  activation_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.memberships)
  @JoinColumn({ name: 'member_id' })
  user: User;

  @ManyToOne(() => Mahber, mahber => mahber.memberships)
  @JoinColumn({ name: 'mahber_id' })
  mahber: Mahber;

  @Index(['mahber_id', 'member_id'])
  mahber_member_idx: void;
}
```


**Payment Entity**:
```typescript
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mahber_id: string;

  @Column()
  member_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentType })
  payment_type: PaymentType;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ unique: true })
  tx_ref: string; // Transaction reference for Chapa

  @Column({ nullable: true })
  chapa_reference: string;

  @Column({ nullable: true })
  checkout_url: string;

  @Column({ nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Index(['mahber_id', 'member_id', 'status'])
  payment_lookup_idx: void;
}
```

**LedgerEntry Entity**:
```typescript
@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mahber_id: string;

  @Column()
  member_id: string;

  @Column({ type: 'enum', enum: TransactionType })
  transaction_type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // Positive for credit, negative for debit

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  running_balance: number;

  @Column({ nullable: true })
  payment_id: string;

  @Column({ nullable: true })
  fine_id: string;

  @Column({ nullable: true })
  lottery_id: string;

  @Column()
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @Index(['mahber_id', 'member_id', 'created_at'])
  ledger_query_idx: void;
}
```


**Event Entity**:
```typescript
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mahber_id: string;

  @Column()
  title: string; // Supports Amharic

  @Column({ type: 'text' })
  description: string; // Supports Amharic

  @Column({ type: 'enum', enum: EventType })
  event_type: EventType;

  @Column()
  start_time: Date;

  @Column()
  end_time: Date;

  @Column()
  location: string;

  @Column({ default: false })
  is_mandatory: boolean;

  @Column({ default: false })
  is_cancelled: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Index(['mahber_id', 'start_time'])
  event_schedule_idx: void;
}
```

**AuditTrail Entity**:
```typescript
@Entity('audit_trail')
export class AuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mahber_id: string;

  @Column()
  entity_type: string; // 'payment', 'membership', 'fine', 'lottery', etc.

  @Column()
  entity_id: string;

  @Column()
  action: string; // 'payment_completed', 'status_transition', 'fine_applied', etc.

  @Column({ nullable: true })
  actor_id: string; // User who performed the action

  @Column({ type: 'jsonb', nullable: true })
  old_value: any;

  @Column({ type: 'jsonb', nullable: true })
  new_value: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @Index(['mahber_id', 'entity_type', 'created_at'])
  audit_query_idx: void;
}
```

### Database Indexes

**Performance Optimization**: Indexes are strategically placed on frequently queried columns:
- `mahber_id` on all tenant-scoped tables
- Composite indexes on `(mahber_id, member_id)` for membership lookups
- Composite indexes on `(mahber_id, created_at)` for time-based queries
- Unique indexes on `phone` (users), `name` (mahbers), `tx_ref` (payments)


## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number must follow Ethiopian format (+251XXXXXXXXX)"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/auth/register"
}
```

### Error Categories

1. **Validation Errors (400)**: Invalid input data, failed DTO validation
2. **Authentication Errors (401)**: Invalid credentials, expired tokens
3. **Authorization Errors (403)**: Insufficient permissions, cross-tenant access attempts
4. **Not Found Errors (404)**: Resource does not exist
5. **Conflict Errors (409)**: Duplicate resources, invalid state transitions
6. **External Service Errors (503)**: Payment gateway unavailable, FCM failures

### Resilience Patterns

**Circuit Breaker**: Implemented for external API calls (Chapa, FCM) to prevent cascading failures. After 5 consecutive failures, circuit opens for 60 seconds before allowing retry.

**Retry Logic**: Failed external API calls are retried with exponential backoff (1s, 2s, 4s, 8s, 16s max). Idempotent operations use request IDs to prevent duplicates.

**Database Connection Pooling**: PostgreSQL connection pool with min 5, max 20 connections. Failed connections trigger automatic reconnection with exponential backoff.

## Testing Strategy

### Dual Testing Approach

The system employs both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Controller endpoint testing with mocked services
- Service method testing with mocked repositories
- Guard and middleware testing
- DTO validation testing
- Error handling scenarios

**Property-Based Tests**: Verify universal properties across all inputs using fast-check library
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: mahber-connect-backend, Property {number}: {property_text}`


### Property-Based Testing Library

**fast-check**: A TypeScript property-based testing library that generates random test inputs and verifies properties hold across all generated values.

**Configuration**: Each property test runs minimum 100 iterations with configurable seed for reproducibility.

**Example Property Test**:
```typescript
import * as fc from 'fast-check';

describe('Feature: mahber-connect-backend, Property 1: Configuration round-trip', () => {
  it('should preserve configuration through serialize-deserialize cycle', () => {
    fc.assert(
      fc.property(
        fc.record({
          contribution_amount: fc.float({ min: 1, max: 10000 }),
          payment_frequency: fc.constantFrom('Weekly', 'Monthly', 'Quarterly'),
          penalty_rate: fc.float({ min: 0, max: 100 }),
          penalty_calculation_mode: fc.constantFrom('percentage', 'fixed'),
        }),
        (config) => {
          const serialized = JSON.stringify(config);
          const deserialized = JSON.parse(serialized);
          expect(deserialized).toEqual(config);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Configuration Round-Trip

*For any* valid Configuration object, serializing to JSON then deserializing should produce an equivalent Configuration object with all fields preserved.

**Validates: Requirements 2.6, 27.3, 27.4**

### Property 2: Membership State Machine Validity

*For any* membership record and attempted state transition, the transition should be allowed if and only if it is in the set of valid transitions (Pending→Approved, Approved→Payment_Required, Payment_Required→Active, Payment_Required→Invalidated, Active→Suspended, Suspended→Active, Pending→Rejected, Pending→Invalidated).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 3: Ledger Balance Consistency

*For any* member in a Mahber organization, the member's current balance should equal the sum of all ledger entry amounts (positive for credits, negative for debits) for that member, and the running balance in each ledger entry should equal the sum of all previous entry amounts plus the current entry amount.

**Validates: Requirements 7.3**

### Property 4: Multi-Tenancy Data Isolation

*For any* API request with mahber_id M and user U, the response should contain only data where mahber_id equals M, and if U is not a member of Mahber M, the request should be rejected with authorization error.

**Validates: Requirements 5.7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7**

### Property 5: Payment Webhook Idempotence

*For any* payment webhook notification W, processing W multiple times should produce the same final payment status and member balance as processing W once.

**Validates: Requirements 6.6**

### Property 6: QR Attendance Round-Trip

*For any* event_id E, mahber_id M, and expiration timestamp T, encoding these values into a QR code then decoding should return the original (E, M, T) tuple, and scanning an expired QR code (current time > T) should be rejected.

**Validates: Requirements 11.2, 11.3, 11.6**


### Property 7: Fine Calculation Determinism

*For any* penalty rate P, contribution amount C, and violation type V, calculating the fine for (P, C, V) multiple times should always produce the same fine amount.

**Validates: Requirements 8.1, 8.3**

### Property 8: Equb Lottery Fairness

*For any* lottery draw with N eligible members, each eligible member should have probability 1/N of being selected, and members who have already won in the current cycle or have unpaid fines exceeding the threshold should not be in the eligible set.

**Validates: Requirements 9.3, 9.4, 9.8**

### Property 9: Audit Trail Immutability

*For any* audit trail record, once created, the record should not be modifiable or deletable, and for any operation O that requires audit logging (financial transactions, state transitions, role changes, payment gateway interactions), performing O should create exactly one audit record with all required fields.

**Validates: Requirements 4.6, 6.7, 8.6, 9.6, 19.1, 19.2, 19.3, 19.4, 19.8**

### Property 10: JWT Token Validation Consistency

*For any* JWT token T, validating T multiple times should return the same result (accept if signature valid and not expired, reject otherwise), and any token with invalid signature or past expiration time should be rejected.

**Validates: Requirements 1.2, 1.6**

### Property 11: Phone Number Format Validation

*For any* string S, S should be accepted as a valid phone number if and only if it matches the Ethiopian format (+251 followed by exactly 9 digits).

**Validates: Requirements 1.3**

### Property 12: Password Complexity Enforcement

*For any* string P, P should be accepted as a valid password if and only if it has minimum 8 characters, contains at least one uppercase letter, one lowercase letter, and one digit.

**Validates: Requirements 1.5**


### Property 13: Amharic Character Round-Trip

*For any* string containing Amharic Unicode characters, storing the string in a user profile field (name, bio) then retrieving it should return the exact same string with all Amharic characters preserved.

**Validates: Requirements 1.7**

### Property 14: Organization Name Uniqueness

*For any* two Mahber organizations M1 and M2, if M1 and M2 have the same name, then M1 and M2 must be the same organization (same ID).

**Validates: Requirements 2.5**

### Property 15: Join Request Duplicate Prevention

*For any* user U and Mahber organization M, if U has an existing join request to M in any status except Rejected or Invalidated, then attempting to create another join request should be rejected.

**Validates: Requirements 3.6**

### Property 16: Permission-Based Authorization

*For any* API operation requiring permission P and user U with role R, U should be able to perform the operation if and only if R's permission set includes P.

**Validates: Requirements 5.3**

### Property 17: Webhook Signature Verification

*For any* webhook payload W with signature S, the webhook should be processed if and only if HMAC-SHA256(W, secret_key) equals S, and webhooks with invalid signatures should be rejected and logged as security alerts.

**Validates: Requirements 6.3, 6.8**

### Property 18: Ledger Entry Immutability

*For any* ledger entry L, once L is created, any attempt to modify or delete L should be rejected.

**Validates: Requirements 7.4**


### Property 19: Date Range Query Completeness

*For any* financial report with date range [start, end], the report should include all and only transactions T where start ≤ T.created_at ≤ end, and the sum of amounts in the report should equal the sum of all transaction amounts in that date range.

**Validates: Requirements 7.5**

### Property 20: Transaction Atomicity

*For any* financial operation F that involves multiple database writes (payment update, ledger entry creation, balance update), if any step fails, all changes should be rolled back and the database should remain in its pre-operation state.

**Validates: Requirements 7.6**

### Property 21: Attendance Fine Application

*For any* mandatory event E with N registered members and A attendees, exactly (N - A) fines should be applied, each absent member should receive exactly one fine, and members who attended should not receive fines.

**Validates: Requirements 8.2, 11.7**

### Property 22: Lottery Payout Calculation

*For any* Equb organization, the payout amount should equal the sum of all contribution transactions minus operational costs (calculated as total × operational_cost_rate / 100).

**Validates: Requirements 9.5**

### Property 23: Event Update Time Constraint

*For any* event E with start time T, updates to E should be allowed if and only if the current time is more than 24 hours before T.

**Validates: Requirements 10.5**

### Property 24: Historical Record Preservation

*For any* past event (end_time < current_time), membership record, or ledger entry, deletion attempts should be rejected to maintain historical integrity.

**Validates: Requirements 4.7, 7.4, 10.7**


### Property 25: Configuration Validation

*For any* organization configuration, penalty_rate should be non-negative, payment_frequency should be one of (Weekly, Monthly, Quarterly), and contribution_amount should be positive, otherwise the configuration should be rejected with descriptive validation error.

**Validates: Requirements 27.5, 27.6, 27.7**

### Property 26: Admin Role Invariant

*For any* Mahber organization M, M should have at least one member with Admin role at all times, and attempts to remove the last admin should be rejected.

**Validates: Requirements 5.5**

### Property 27: Payment Metadata Completeness

*For any* payment P initiated through the system, the Chapa API request should include all required metadata fields (mahber_id, member_id, payment_type, amount), and the payment record should store the transaction reference for idempotent webhook processing.

**Validates: Requirements 6.2**

### Property 28: Duplicate Attendance Prevention

*For any* event E and member M, if M has already recorded attendance for E, then attempting to record attendance again should be rejected.

**Validates: Requirements 11.5**

### Property 29: Notification Delivery Guarantee

*For any* notification event (fine applied, lottery result, event created, event cancelled), a notification should be sent to all eligible recipients, and each recipient should receive at most one notification per event.

**Validates: Requirements 8.5, 9.7, 10.4, 10.6**

### Property 30: Join Request Expiry

*For any* join request J in Pending status, if J.created_at is more than 7 days before the current time, then J should be automatically transitioned to Invalidated status.

**Validates: Requirements 3.5**


## Deployment Architecture

### Docker Configuration

**Dockerfile** (Multi-stage build):
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package*.json ./
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]
```

**docker-compose.yml** (Local development):
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mahberconnect
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=your-secret-key
      - CHAPA_SECRET_KEY=your-chapa-key
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mahberconnect
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Environment Configuration

**Required Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Chapa Payment Gateway
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_WEBHOOK_SECRET=your-webhook-secret

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# Application
PORT=3000
NODE_ENV=production
API_URL=https://api.mahberconnect.com

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```


### Database Migrations

**Migration Strategy**: TypeORM migrations with timestamp-based versioning.

**Example Migration**:
```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMembershipsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'memberships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'mahber_id',
            type: 'uuid',
          },
          {
            name: 'member_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['Pending', 'Approved', 'Payment_Required', 'Active', 'Suspended', 'Rejected', 'Invalidated'],
          },
          {
            name: 'role',
            type: 'jsonb',
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'has_won_current_cycle',
            type: 'boolean',
            default: false,
          },
          {
            name: 'approval_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'activation_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'memberships',
      new TableIndex({
        name: 'IDX_MEMBERSHIP_MAHBER_MEMBER',
        columnNames: ['mahber_id', 'member_id'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'memberships',
      new TableForeignKey({
        columnNames: ['mahber_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'mahbers',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'memberships',
      new TableForeignKey({
        columnNames: ['member_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('memberships');
  }
}
```

### CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Run property-based tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:e2e
      
      - name: Check code coverage
        run: npm run test:cov
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t mahberconnect-backend:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push mahberconnect-backend:${{ github.sha }}
```


## API Design

### RESTful Endpoint Structure

**Base URL**: `https://api.mahberconnect.com/v1`

**Authentication Endpoints**:
```
POST   /auth/register          - Register new user
POST   /auth/login             - Login and get JWT token
POST   /auth/refresh           - Refresh JWT token
GET    /auth/profile           - Get current user profile
PUT    /auth/profile           - Update user profile
```

**Mahber Organization Endpoints**:
```
POST   /mahbers                - Create new Mahber organization
GET    /mahbers                - List user's Mahber organizations
GET    /mahbers/:id            - Get Mahber details
PUT    /mahbers/:id            - Update Mahber configuration
DELETE /mahbers/:id            - Delete Mahber (if no active members)
```

**Membership Endpoints**:
```
POST   /mahbers/:id/join-requests              - Submit join request
GET    /mahbers/:id/join-requests              - List join requests (Admin)
PUT    /mahbers/:id/join-requests/:requestId   - Approve/reject join request
GET    /mahbers/:id/members                    - List members
GET    /mahbers/:id/members/:memberId          - Get member details
PUT    /mahbers/:id/members/:memberId/role     - Update member role
POST   /mahbers/:id/members/:memberId/suspend  - Suspend member
POST   /mahbers/:id/members/:memberId/reinstate - Reinstate member
```

**Payment Endpoints**:
```
POST   /mahbers/:id/payments/initiate          - Initiate payment
GET    /mahbers/:id/payments                   - List payments
GET    /mahbers/:id/payments/:paymentId        - Get payment details
POST   /webhooks/chapa                         - Chapa webhook handler
```

**Financial Endpoints**:
```
GET    /mahbers/:id/ledger                     - Get ledger entries
GET    /mahbers/:id/balance                    - Get member balance
GET    /mahbers/:id/fines                      - List fines
POST   /mahbers/:id/fines/:fineId/waive        - Waive fine
GET    /mahbers/:id/reports/financial          - Generate financial report
```

**Event Endpoints**:
```
POST   /mahbers/:id/events                     - Create event
GET    /mahbers/:id/events                     - List events
GET    /mahbers/:id/events/:eventId            - Get event details
PUT    /mahbers/:id/events/:eventId            - Update event
DELETE /mahbers/:id/events/:eventId            - Cancel event
GET    /mahbers/:id/events/:eventId/qr         - Generate QR code
POST   /mahbers/:id/events/:eventId/attendance - Record attendance
GET    /mahbers/:id/events/:eventId/photos     - List event photos
POST   /mahbers/:id/events/:eventId/photos     - Upload event photo
```

**Communication Endpoints**:
```
POST   /mahbers/:id/announcements              - Create announcement
GET    /mahbers/:id/announcements              - List announcements
POST   /mahbers/:id/chat/messages              - Send chat message
GET    /mahbers/:id/chat/messages              - Get chat history
PUT    /mahbers/:id/chat/messages/:messageId   - Edit message
DELETE /mahbers/:id/chat/messages/:messageId   - Delete message
POST   /mahbers/:id/polls                      - Create poll
GET    /mahbers/:id/polls                      - List polls
POST   /mahbers/:id/polls/:pollId/vote         - Submit vote
GET    /mahbers/:id/polls/:pollId/results      - Get poll results
```

### Request/Response DTOs

**RegisterDto**:
```typescript
export class RegisterDto {
  @IsString()
  @Matches(/^\+251\d{9}$/, { message: 'Phone must follow Ethiopian format (+251XXXXXXXXX)' })
  phone: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
    message: 'Password must contain uppercase, lowercase, and number' 
  })
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
```

**CreateMahberDto**:
```typescript
export class CreateMahberDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(MahberType)
  type: MahberType;

  @ValidateNested()
  @Type(() => MahberConfigurationDto)
  configuration: MahberConfigurationDto;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}

export class MahberConfigurationDto {
  @IsNumber()
  @Min(1)
  contribution_amount: number;

  @IsEnum(PaymentFrequency)
  payment_frequency: PaymentFrequency;

  @IsNumber()
  @Min(0)
  penalty_rate: number;

  @IsEnum(PenaltyCalculationMode)
  penalty_calculation_mode: PenaltyCalculationMode;

  @IsNumber()
  @Min(0)
  absence_fine_amount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  operational_cost_rate?: number;

  @IsString()
  @IsOptional()
  lottery_date?: string;

  @IsString()
  @IsOptional()
  meeting_schedule?: string;
}
```

### Pagination

**Query Parameters**:
```typescript
export class PaginationDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string = 'created_at';

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

**Paginated Response**:
```typescript
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```


## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant Database

    Client->>API: POST /auth/login {phone, password}
    API->>AuthService: validateUser(phone, password)
    AuthService->>Database: findUser(phone)
    Database->>AuthService: User record
    AuthService->>AuthService: bcrypt.compare(password, hashedPassword)
    AuthService->>AuthService: generateJWT(user)
    AuthService->>API: {access_token}
    API->>Client: 200 OK {access_token}
    
    Client->>API: GET /mahbers/:id (Authorization: Bearer token)
    API->>AuthService: validateToken(token)
    AuthService->>AuthService: verifySignature & expiration
    AuthService->>API: User claims
    API->>Client: 200 OK {data}
```

### Security Best Practices

**Password Security**:
- Bcrypt hashing with 10 salt rounds
- Password complexity requirements enforced
- No password storage in logs or error messages

**JWT Security**:
- RS256 algorithm for asymmetric signing
- Short expiration time (7 days)
- Token refresh mechanism
- Blacklist for revoked tokens (Redis)

**API Security**:
- Rate limiting: 100 requests per 15 minutes per IP
- CORS policy restricting origins
- Helmet middleware for HTTP security headers
- Input validation and sanitization on all endpoints
- SQL injection prevention through parameterized queries

**Webhook Security**:
- HMAC-SHA256 signature verification
- Replay attack prevention using timestamp validation
- IP whitelist for Chapa webhook endpoints

**Data Security**:
- Encryption at rest for sensitive data
- TLS 1.3 for data in transit
- Database connection encryption
- Secrets management using environment variables

### Rate Limiting Configuration

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 900, // 15 minutes
      limit: 100, // 100 requests
    }),
  ],
})
export class AppModule {}

// Custom rate limit for auth endpoints
@Throttle(5, 60) // 5 requests per minute
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```


## Performance Optimization

### Database Optimization

**Connection Pooling**:
```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  extra: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
})
```

**Query Optimization**:
- Strategic indexes on frequently queried columns
- Eager loading for related entities to prevent N+1 queries
- Query result caching for static data
- Pagination for large result sets

**Caching Strategy**:
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      ttl: 300, // 5 minutes default
    }),
  ],
})
export class AppModule {}

// Cache organization settings
@Cacheable('mahber-config', 3600) // 1 hour TTL
async getMahberConfiguration(mahberId: string) {
  return this.mahberRepository.findOne({ where: { id: mahberId } });
}
```

### Response Time Targets

- **95th percentile**: < 200ms for read operations
- **95th percentile**: < 500ms for write operations
- **99th percentile**: < 1000ms for all operations

### Monitoring and Observability

**Health Check Endpoint**:
```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

**Metrics Collection**:
- Request duration histogram
- Error rate by endpoint
- Database query performance
- Background job execution time
- External API call latency

## Internationalization

### Language Support

**Supported Languages**: English (en), Amharic (am)

**Implementation**:
```typescript
import { I18nModule, I18nJsonLoader } from 'nestjs-i18n';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: HeaderResolver, options: ['accept-language'] },
      ],
    }),
  ],
})
export class AppModule {}
```

**Translation Files**:

`i18n/en/errors.json`:
```json
{
  "INVALID_PHONE": "Phone number must follow Ethiopian format (+251XXXXXXXXX)",
  "WEAK_PASSWORD": "Password must contain uppercase, lowercase, and number",
  "UNAUTHORIZED": "Invalid credentials",
  "FORBIDDEN": "You don't have permission to perform this action",
  "NOT_FOUND": "Resource not found"
}
```

`i18n/am/errors.json`:
```json
{
  "INVALID_PHONE": "ስልክ ቁጥር የኢትዮጵያ ቅርጸት መከተል አለበት (+251XXXXXXXXX)",
  "WEAK_PASSWORD": "የይለፍ ቃል ትልቅ ፊደል፣ ትንሽ ፊደል እና ቁጥር መያዝ አለበት",
  "UNAUTHORIZED": "ልክ ያልሆነ መረጃ",
  "FORBIDDEN": "ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም",
  "NOT_FOUND": "ግብዓት አልተገኘም"
}
```

### Amharic Character Handling

**Database Configuration**:
```sql
CREATE DATABASE mahberconnect
  WITH ENCODING 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;
```

**Entity Configuration**:
```typescript
@Column({ type: 'varchar', length: 255, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
name: string; // Supports Amharic characters
```


## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Project setup with NestJS, TypeORM, PostgreSQL
- Database schema and migrations
- Auth module (registration, login, JWT)
- Basic CRUD for users and organizations
- Docker configuration

### Phase 2: Core Membership (Weeks 3-4)
- Membership module with state machine
- Join request workflow
- RBAC implementation
- Multi-tenancy enforcement
- Audit trail system

### Phase 3: Financial System (Weeks 5-7)
- Payment module with Chapa integration
- Webhook handler with signature verification
- Digital ledger implementation
- Fine calculation service
- Balance tracking and reconciliation

### Phase 4: Events & Attendance (Weeks 8-9)
- Event management module
- QR code generation and validation
- Attendance tracking
- Photo gallery with file upload
- Automated fine application

### Phase 5: Communication (Weeks 10-11)
- Announcement system
- Chat messaging
- Voting/polling system
- Firebase FCM integration
- Notification delivery

### Phase 6: Automation (Weeks 12-13)
- Bull Queue setup with Redis
- Background job processors
- Fine calculation scheduler
- Lottery execution scheduler
- Payment reminder system

### Phase 7: Testing & Documentation (Weeks 14-15)
- Unit test suite
- Property-based tests with fast-check
- Integration tests
- E2E tests
- Swagger API documentation

### Phase 8: Deployment & Monitoring (Week 16)
- Production Docker images
- CI/CD pipeline setup
- Monitoring and logging
- Performance optimization
- Security hardening

## Conclusion

This design document provides a comprehensive blueprint for implementing the MahberConnect backend system. The architecture emphasizes:

1. **Modularity**: Clear separation of concerns with distinct modules for each domain
2. **Security**: Multi-layered security with JWT authentication, RBAC, webhook verification, and data isolation
3. **Reliability**: ACID transactions, idempotent operations, audit trails, and error handling
4. **Scalability**: Connection pooling, caching, background jobs, and efficient database queries
5. **Testability**: Dual testing approach with unit tests and property-based tests for comprehensive coverage
6. **Maintainability**: TypeScript type safety, consistent patterns, and comprehensive documentation

The system is designed to handle the complex requirements of digitizing traditional Ethiopian social institutions while maintaining data integrity, security, and user experience. The property-based testing approach ensures correctness across all possible inputs, while the modular architecture allows for independent development and testing of each component.

