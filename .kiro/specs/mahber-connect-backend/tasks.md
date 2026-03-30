# Implementation Plan: MahberConnect Backend

## Overview

This implementation plan breaks down the MahberConnect backend system into discrete, actionable coding tasks. The system is built with NestJS/TypeScript, PostgreSQL, Redis, and integrates with Chapa payment gateway and Firebase Cloud Messaging. Each task builds incrementally on previous work, with property-based tests validating correctness properties throughout.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize NestJS project with TypeScript configuration
    - Create new NestJS project with CLI
    - Configure tsconfig.json for strict type checking
    - Set up ESLint and Prettier for code quality
    - Configure Jest for testing
    - _Requirements: 26.1_

  - [x] 1.2 Set up PostgreSQL database with Prisma
    - Install Prisma CLI and Prisma Client (`pnpm add -D prisma && pnpm add @prisma/client`)
    - Initialize Prisma with `pnpm exec prisma init`
    - Configure DATABASE_URL in .env with connection pooling parameters
    - Create initial Prisma schema in prisma/schema.prisma
    - Generate Prisma Client with `pnpm exec prisma generate`
    - _Requirements: 23.1, 23.2, 24.1, 24.2, 24.3_

  - [x] 1.3 Set up Redis for Bull Queue
    - Install Bull and Redis client libraries
    - Configure Redis connection with environment variables
    - Set up health check for Redis connection
    - _Requirements: 16.1, 24.1_

  - [x] 1.4 Create Docker configuration
    - Write multi-stage Dockerfile for production builds
    - Create docker-compose.yml with PostgreSQL, Redis, and API services
    - Configure non-root user for security
    - Add health check endpoint
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

  - [x] 1.5 Set up environment configuration management
    - Install @nestjs/config module
    - Create configuration schema with validation
    - Define required environment variables (DATABASE_URL, JWT_SECRET, CHAPA_SECRET_KEY, FIREBASE credentials)
    - Implement startup validation for required variables
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_


- [x] 2. Auth Module Implementation
  - [x] 2.1 Create User model in Prisma schema
    - Define User model with phone, password, name, email, bio fields
    - Add @unique constraint on phone field
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_users`
    - Generate Prisma Client
    - Create PrismaService for dependency injection
    - _Requirements: 1.1, 1.3, 1.7_

  - [ ]* 2.2 Write property test for phone number validation
    - **Property 11: Phone Number Format Validation**
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement user registration endpoint
    - Create RegisterDto with class-validator decorators
    - Implement phone number format validation (+251XXXXXXXXX)
    - Hash passwords with bcrypt (10 salt rounds)
    - Handle duplicate phone number errors
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 21.1, 21.2, 21.3, 28.1_

  - [ ]* 2.4 Write property test for password complexity
    - **Property 12: Password Complexity Enforcement**
    - **Validates: Requirements 1.5**

  - [ ]* 2.5 Write property test for Amharic character handling
    - **Property 13: Amharic Character Round-Trip**
    - **Validates: Requirements 1.7**

  - [x] 2.6 Implement JWT token generation and validation
    - Install @nestjs/jwt and @nestjs/passport
    - Create JwtStrategy with RS256 algorithm
    - Implement token generation with user claims (sub, phone, mahber_id, role)
    - Set token expiration to 7 days
    - _Requirements: 1.2, 1.6, 28.3_

  - [ ]* 2.7 Write property test for JWT token validation
    - **Property 10: JWT Token Validation Consistency**
    - **Validates: Requirements 1.2, 1.6**

  - [x] 2.8 Implement login endpoint
    - Create LoginDto with phone and password fields
    - Validate credentials against database
    - Generate and return JWT token on success
    - Implement rate limiting (5 requests per minute)
    - Log failed authentication attempts
    - _Requirements: 1.2, 19.5, 28.2_

  - [x] 2.9 Create authentication guards
    - Implement JwtAuthGuard for protected endpoints
    - Extract user and mahber_id from JWT claims
    - Handle token expiration and invalid signatures
    - _Requirements: 1.6, 28.3_

  - [x] 2.10 Implement profile management endpoints
    - Create GET /auth/profile endpoint
    - Create PUT /auth/profile endpoint with validation
    - Support Amharic characters in profile fields
    - _Requirements: 1.7, 21.8_

  - [ ]* 2.11 Write unit tests for auth service
    - Test registration with valid and invalid inputs
    - Test login with correct and incorrect credentials
    - Test JWT token generation and validation
    - Test rate limiting behavior


- [x] 3. Membership Module - Core Entities
  - [x] 3.1 Create Mahber model in Prisma schema
    - Define Mahber model with name, type, configuration (Json), is_public, invitation_code
    - Add @unique constraint on name field
    - Create enum for MahberType (MAHBER, EQUB, IDDIR)
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_mahbers`
    - Generate Prisma Client
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ]* 3.2 Write property test for configuration round-trip
    - **Property 1: Configuration Round-Trip**
    - **Validates: Requirements 2.6, 27.3, 27.4**

  - [ ]* 3.3 Write property test for configuration validation
    - **Property 25: Configuration Validation**
    - **Validates: Requirements 27.5, 27.6, 27.7**

  - [x] 3.4 Create Membership model in Prisma schema
    - Define Membership model with mahber_id, member_id, status, role (Json), balance
    - Create enum for MembershipStatus (Pending, Approved, Payment_Required, Active, Suspended, Rejected, Invalidated)
    - Add @@index on [mahber_id, member_id]
    - Add relations to User and Mahber models
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_memberships`
    - _Requirements: 3.1, 3.7, 4.1, 4.2, 4.3, 4.4, 23.7_

  - [x] 3.5 Create JoinRequest model in Prisma schema
    - Define JoinRequest model with mahber_id, user_id, status, invitation_code, rejection_reason
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_join_requests`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.6 Implement Mahber CRUD endpoints
    - Create POST /mahbers endpoint with CreateMahberDto
    - Create GET /mahbers endpoint (list user's organizations)
    - Create GET /mahbers/:id endpoint with authorization check
    - Create PUT /mahbers/:id endpoint (admin only)
    - Create DELETE /mahbers/:id endpoint with active member check
    - _Requirements: 2.1, 2.2, 2.4, 2.7_

  - [ ]* 3.7 Write property test for organization name uniqueness
    - **Property 14: Organization Name Uniqueness**
    - **Validates: Requirements 2.5**

  - [ ]* 3.8 Write unit tests for Mahber service
    - Test organization creation with valid configuration
    - Test configuration validation errors
    - Test deletion prevention with active members
    - Test multi-tenancy isolation


- [x] 4. Membership Module - State Machine and Workflow
  - [x] 4.1 Implement membership state machine service
    - Define valid state transitions map
    - Create validateTransition method
    - Create transitionState method with audit logging
    - Implement state-specific validation (e.g., Active requires activation_date)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.2 Write property test for state machine validity
    - **Property 2: Membership State Machine Validity**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [x] 4.3 Implement join request workflow endpoints
    - Create POST /mahbers/:id/join-requests endpoint
    - Validate invitation code for private organizations
    - Prevent duplicate join requests
    - Create request with Pending status
    - _Requirements: 3.1, 3.2, 3.6_

  - [ ]* 4.4 Write property test for join request duplicate prevention
    - **Property 15: Join Request Duplicate Prevention**
    - **Validates: Requirements 3.6**

  - [x] 4.5 Implement join request approval/rejection
    - Create PUT /mahbers/:id/join-requests/:requestId endpoint (admin only)
    - Implement approval flow: Pending → Approved → Payment_Required
    - Implement rejection flow: Pending → Rejected with reason
    - Create membership record on approval
    - _Requirements: 3.3, 3.4_

  - [x] 4.6 Implement membership management endpoints
    - Create GET /mahbers/:id/members endpoint with pagination
    - Create GET /mahbers/:id/members/:memberId endpoint
    - Create POST /mahbers/:id/members/:memberId/suspend endpoint (admin only)
    - Create POST /mahbers/:id/members/:memberId/reinstate endpoint (admin only)
    - _Requirements: 4.3, 4.4_

  - [ ]* 4.7 Write property test for historical record preservation
    - **Property 24: Historical Record Preservation**
    - **Validates: Requirements 4.7, 7.4, 10.7**

  - [ ]* 4.8 Write unit tests for membership workflow
    - Test join request creation and validation
    - Test approval and rejection flows
    - Test state transition validation
    - Test duplicate prevention


- [x] 5. Membership Module - RBAC Implementation
  - [x] 5.1 Define role and permission structures
    - Create Role interface with name and permissions array
    - Define default roles (Admin, Treasurer, Secretary, Member)
    - Define permission constants (manage_members, manage_finances, create_events, etc.)
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Implement role assignment endpoints
    - Create PUT /mahbers/:id/members/:memberId/role endpoint (admin only)
    - Validate member has Active status
    - Prevent removing last admin
    - Store role in JSONB format
    - _Requirements: 5.4, 5.6_

  - [ ]* 5.3 Write property test for admin role invariant
    - **Property 26: Admin Role Invariant**
    - **Validates: Requirements 5.5**

  - [x] 5.3 Create RoleGuard for permission checking
    - Implement @RequirePermission decorator
    - Extract user role from JWT claims
    - Verify role has required permission
    - Scope permissions by mahber_id
    - _Requirements: 5.3, 5.7_

  - [ ]* 5.4 Write property test for permission-based authorization
    - **Property 16: Permission-Based Authorization**
    - **Validates: Requirements 5.3**

  - [x] 5.4 Implement custom role creation
    - Create POST /mahbers/:id/roles endpoint (admin only)
    - Validate permission combinations
    - Store custom roles in organization configuration
    - _Requirements: 5.4_

  - [ ]* 5.5 Write unit tests for RBAC system
    - Test role assignment and validation
    - Test permission checking with various roles
    - Test admin removal prevention
    - Test custom role creation

- [x] 6. Checkpoint - Core membership functionality complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 7. Financial Module - Core Entities and Ledger
  - [x] 7.1 Create Payment model in Prisma schema
    - Define Payment model with mahber_id, member_id, amount, payment_type, status, tx_ref, chapa_reference
    - Create enums for PaymentType and PaymentStatus
    - Add @unique constraint on tx_ref
    - Add @@index on [mahber_id, member_id, status]
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_payments`
    - _Requirements: 6.1, 6.2, 23.7_

  - [x] 7.2 Create LedgerEntry model in Prisma schema
    - Define LedgerEntry model with mahber_id, member_id, transaction_type, amount, running_balance
    - Create enum for TransactionType (Contribution, Fine, Equb_Payout, Iddir_Payout, Refund)
    - Add @@index on [mahber_id, member_id, created_at]
    - Add optional relations to payments, fines, lottery tables
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_ledger_entries`
    - _Requirements: 7.1, 7.2, 7.4, 7.7, 23.7_

  - [x] 7.3 Implement ledger service with balance calculation using Prisma
    - Create createLedgerEntry method with running balance calculation
    - Implement getMemberBalance method using Prisma aggregations
    - Implement getLedgerEntries method with pagination
    - Ensure all operations use Prisma transactions ($transaction)
    - _Requirements: 7.3, 7.6_

  - [ ]* 7.4 Write property test for ledger balance consistency
    - **Property 3: Ledger Balance Consistency**
    - **Validates: Requirements 7.3**

  - [ ]* 7.5 Write property test for ledger entry immutability
    - **Property 18: Ledger Entry Immutability**
    - **Validates: Requirements 7.4**

  - [ ]* 7.6 Write property test for transaction atomicity
    - **Property 20: Transaction Atomicity**
    - **Validates: Requirements 7.6**

  - [x] 7.4 Implement financial reporting endpoints
    - Create GET /mahbers/:id/ledger endpoint with date range filtering
    - Create GET /mahbers/:id/balance endpoint
    - Create GET /mahbers/:id/reports/financial endpoint (treasurer only)
    - Implement pagination for ledger queries
    - _Requirements: 7.5, 29.4_

  - [ ]* 7.7 Write property test for date range query completeness
    - **Property 19: Date Range Query Completeness**
    - **Validates: Requirements 7.5**

  - [ ]* 7.8 Write unit tests for ledger service
    - Test ledger entry creation with balance calculation
    - Test balance retrieval accuracy
    - Test date range filtering
    - Test transaction rollback on errors


- [x] 8. Financial Module - Chapa Payment Integration
  - [x] 8.1 Create Chapa API client service
    - Install axios for HTTP requests
    - Implement initializePayment method with Chapa API
    - Include metadata (mahber_id, member_id, payment_type, amount)
    - Handle API errors with circuit breaker pattern
    - _Requirements: 6.1, 6.2, 22.6_

  - [ ]* 8.2 Write property test for payment metadata completeness
    - **Property 27: Payment Metadata Completeness**
    - **Validates: Requirements 6.2**

  - [x] 8.2 Implement payment initiation endpoint
    - Create POST /mahbers/:id/payments/initiate endpoint
    - Generate unique tx_ref for idempotency
    - Call Chapa API to get checkout URL
    - Store payment record with Pending status
    - Return checkout URL to client
    - _Requirements: 6.1, 6.2_

  - [x] 8.3 Implement webhook signature verification
    - Create verifyWebhookSignature method using HMAC-SHA256
    - Compare computed signature with Chapa signature header
    - Log security alerts for invalid signatures
    - _Requirements: 6.3, 6.8, 28.8_

  - [ ]* 8.4 Write property test for webhook signature verification
    - **Property 17: Webhook Signature Verification**
    - **Validates: Requirements 6.3, 6.8**

  - [x] 8.4 Implement webhook handler endpoint
    - Create POST /webhooks/chapa endpoint (no auth required)
    - Verify webhook signature before processing
    - Implement idempotent processing using tx_ref
    - Update payment status based on webhook data
    - Create ledger entry on successful payment
    - Update membership status from Payment_Required to Active
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 3.7_

  - [ ]* 8.5 Write property test for webhook idempotence
    - **Property 5: Payment Webhook Idempotence**
    - **Validates: Requirements 6.6**

  - [x] 8.5 Implement payment listing and details endpoints
    - Create GET /mahbers/:id/payments endpoint with pagination
    - Create GET /mahbers/:id/payments/:paymentId endpoint
    - Filter by member_id, status, date range
    - _Requirements: 6.1_

  - [x] 8.6 Implement payment retry mechanism
    - Create POST /mahbers/:id/payments/:paymentId/retry endpoint
    - Create new payment attempt with same metadata
    - Implement exponential backoff for external API failures
    - _Requirements: 22.4_

  - [ ]* 8.7 Write unit tests for payment integration
    - Test payment initiation with Chapa API
    - Test webhook processing with valid and invalid signatures
    - Test idempotent webhook handling
    - Test payment status transitions


- [x] 9. Financial Module - Fine Calculation
  - [x] 9.1 Create Fine model in Prisma schema
    - Define Fine model with mahber_id, member_id, violation_type, amount, is_waived, waiver_reason
    - Create enum for ViolationType (MISSED_PAYMENT, MISSED_ATTENDANCE)
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_fines`
    - _Requirements: 8.1, 8.2, 8.4, 8.6_

  - [x] 9.2 Implement fine calculation service
    - Create calculateFine method supporting percentage and fixed modes
    - Implement deterministic calculation based on penalty_rate and contribution_amount
    - Create applyFine method that creates fine record and ledger entry
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 9.3 Write property test for fine calculation determinism
    - **Property 7: Fine Calculation Determinism**
    - **Validates: Requirements 8.1, 8.3**

  - [x] 9.3 Implement fine management endpoints
    - Create GET /mahbers/:id/fines endpoint with filtering
    - Create POST /mahbers/:id/fines/:fineId/waive endpoint (treasurer only)
    - Record waiver justification in audit trail
    - _Requirements: 8.6_

  - [x] 9.4 Implement fine threshold checking
    - Create hasUnpaidFinesExceedingThreshold method
    - Use in Equb lottery eligibility check
    - _Requirements: 8.7, 9.4_

  - [ ]* 9.5 Write unit tests for fine calculation
    - Test percentage-based fine calculation
    - Test fixed-amount fine calculation
    - Test fine waiver with audit logging
    - Test threshold checking

- [x] 10. Financial Module - Equb Lottery System
  - [x] 10.1 Create Lottery model in Prisma schema
    - Define Lottery model with mahber_id, winner_id, eligible_members (Json), random_seed, payout_amount
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_lottery_draws`
    - _Requirements: 9.5, 9.6_

  - [x] 10.2 Implement lottery service with cryptographic randomness
    - Create executeLottery method using crypto.randomBytes
    - Filter eligible members (exclude winners, members with unpaid fines)
    - Implement deterministic selection based on seed
    - Calculate payout amount (contributions - operational costs)
    - Create payout transaction and ledger entry
    - Mark winner's has_won_current_cycle flag
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.3 Write property test for lottery fairness
    - **Property 8: Equb Lottery Fairness**
    - **Validates: Requirements 9.3, 9.4, 9.8**

  - [ ]* 10.4 Write property test for lottery payout calculation
    - **Property 22: Lottery Payout Calculation**
    - **Validates: Requirements 9.5**

  - [x] 10.3 Implement lottery result recording
    - Store lottery result with all metadata in audit trail
    - Send notifications to all members
    - _Requirements: 9.6, 9.7_

  - [ ]* 10.5 Write unit tests for lottery system
    - Test eligible member filtering
    - Test winner selection randomness
    - Test payout calculation
    - Test audit trail recording

- [x] 11. Checkpoint - Financial module complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 12. Events Module - Core Entities
  - [x] 12.1 Create Event model in Prisma schema
    - Define Event model with mahber_id, title, description, event_type, start_time, end_time, location, is_mandatory
    - Create enum for EventType (Meeting, Ceremony, Fundraiser, Social_Gathering)
    - Add @@index on [mahber_id, start_time]
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_events`
    - _Requirements: 10.1, 10.2, 10.3, 23.7_

  - [x] 12.2 Create Attendance model in Prisma schema
    - Define Attendance model with event_id, member_id, mahber_id, checked_in_at
    - Add @@unique constraint on [event_id, member_id]
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_attendance`
    - _Requirements: 11.4, 11.5_

  - [x] 12.3 Create EventPhoto model in Prisma schema
    - Define EventPhoto model with event_id, mahber_id, uploader_id, file_path, thumbnail_path, caption
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_event_photos`
    - _Requirements: 12.1, 12.2, 12.7_

  - [x] 12.4 Implement event CRUD endpoints
    - Create POST /mahbers/:id/events endpoint (secretary only)
    - Create GET /mahbers/:id/events endpoint with pagination
    - Create GET /mahbers/:id/events/:eventId endpoint
    - Create PUT /mahbers/:id/events/:eventId endpoint (secretary only, 24h before event)
    - Create DELETE /mahbers/:id/events/:eventId endpoint (cancel, not delete)
    - Send notifications on event creation and cancellation
    - _Requirements: 10.1, 10.4, 10.5, 10.6_

  - [ ]* 12.5 Write property test for event update time constraint
    - **Property 23: Event Update Time Constraint**
    - **Validates: Requirements 10.5**

  - [ ]* 12.6 Write unit tests for event management
    - Test event creation with valid data
    - Test event update time restrictions
    - Test event cancellation
    - Test notification delivery


- [x] 13. Events Module - QR Attendance System
  - [x] 13.1 Implement QR code generation service
    - Install qrcode library
    - Create generateQRCode method that creates JWT with event_id, mahber_id, expiration
    - Set expiration to event end_time + 30 minutes
    - Return QR code as base64 image
    - _Requirements: 11.1, 11.2_

  - [ ]* 13.2 Write property test for QR attendance round-trip
    - **Property 6: QR Attendance Round-Trip**
    - **Validates: Requirements 11.2, 11.3, 11.6**

  - [x] 13.2 Implement QR code validation service
    - Create validateQRCode method that decodes JWT
    - Verify signature and expiration
    - Validate event_id and mahber_id match
    - Check member eligibility (Active status, belongs to mahber)
    - _Requirements: 11.3, 11.6_

  - [x] 13.3 Implement attendance recording endpoints
    - Create GET /mahbers/:id/events/:eventId/qr endpoint (secretary only)
    - Create POST /mahbers/:id/events/:eventId/attendance endpoint
    - Validate QR code and record attendance with timestamp
    - Prevent duplicate attendance records
    - _Requirements: 11.1, 11.4, 11.5_

  - [ ]* 13.4 Write property test for duplicate attendance prevention
    - **Property 28: Duplicate Attendance Prevention**
    - **Validates: Requirements 11.5**

  - [x] 13.4 Implement attendance processor for fines
    - Create processEventAttendance method
    - Mark non-attending members as absent
    - Apply fines for mandatory events
    - Ensure each absent member receives exactly one fine
    - _Requirements: 11.7, 8.2_

  - [ ]* 13.5 Write property test for attendance fine application
    - **Property 21: Attendance Fine Application**
    - **Validates: Requirements 8.2, 11.7**

  - [ ]* 13.6 Write unit tests for QR attendance
    - Test QR code generation and validation
    - Test attendance recording
    - Test duplicate prevention
    - Test fine application for absences


- [x] 14. Events Module - Photo Gallery
  - [x] 14.1 Set up file upload configuration
    - Install multer for file uploads
    - Configure upload directory and file size limits (10MB)
    - Validate file types (JPEG, PNG)
    - _Requirements: 12.1, 21.7_

  - [x] 14.2 Implement thumbnail generation service
    - Install sharp for image processing
    - Create generateThumbnail method
    - Generate thumbnails at 300x300 resolution
    - _Requirements: 12.3_

  - [x] 14.3 Implement photo upload endpoint
    - Create POST /mahbers/:id/events/:eventId/photos endpoint
    - Validate file type and size
    - Generate thumbnail
    - Store photo metadata in database
    - Support Amharic captions
    - _Requirements: 12.1, 12.2, 12.7_

  - [x] 14.4 Implement photo gallery endpoints
    - Create GET /mahbers/:id/events/:eventId/photos endpoint with pagination
    - Create DELETE /mahbers/:id/events/:eventId/photos/:photoId endpoint (uploader or admin)
    - Enforce multi-tenancy isolation
    - _Requirements: 12.4, 12.5_

  - [x] 14.5 Implement storage quota enforcement
    - Create checkStorageQuota method
    - Track total storage per organization
    - Reject uploads exceeding quota
    - _Requirements: 12.6_

  - [ ]* 14.6 Write unit tests for photo gallery
    - Test photo upload with valid files
    - Test file type and size validation
    - Test thumbnail generation
    - Test storage quota enforcement

- [x] 15. Checkpoint - Events module complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 16. Communication Module - Announcements
  - [x] 16.1 Create Announcement model in Prisma schema
    - Define Announcement model with mahber_id, title, content, priority, target_audience, scheduled_at
    - Create enum for AnnouncementPriority (Normal, Important, Urgent)
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_announcements`
    - _Requirements: 13.1, 13.2, 13.6, 13.7_

  - [x] 16.2 Create AnnouncementRead model for tracking
    - Define AnnouncementRead model with announcement_id, member_id, read_at
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_announcement_reads`
    - _Requirements: 13.5_

  - [x] 16.3 Implement announcement endpoints
    - Create POST /mahbers/:id/announcements endpoint (admin only)
    - Create GET /mahbers/:id/announcements endpoint with pagination
    - Support role-based targeting (all members, specific roles)
    - Support scheduled announcements
    - Support Amharic content
    - _Requirements: 13.1, 13.4, 13.6, 13.7_

  - [x] 16.4 Implement announcement read tracking
    - Create POST /mahbers/:id/announcements/:announcementId/read endpoint
    - Mark announcement as read for current user
    - _Requirements: 13.5_

  - [ ]* 16.5 Write unit tests for announcements
    - Test announcement creation with targeting
    - Test scheduled announcements
    - Test read tracking
    - Test Amharic content handling


- [x] 17. Communication Module - Chat System
  - [x] 17.1 Create ChatMessage model in Prisma schema
    - Define ChatMessage model with mahber_id, sender_id, content, edited_at, is_deleted
    - Add @@index on [mahber_id, created_at]
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_chat_messages`
    - _Requirements: 14.1, 14.3, 14.4, 14.5_

  - [x] 17.2 Implement chat messaging endpoints
    - Create POST /mahbers/:id/chat/messages endpoint
    - Create GET /mahbers/:id/chat/messages endpoint with pagination
    - Create PUT /mahbers/:id/chat/messages/:messageId endpoint (5-minute window)
    - Create DELETE /mahbers/:id/chat/messages/:messageId endpoint (sender or admin)
    - Enforce Active membership status for sending
    - Support Amharic content
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 17.3 Implement offline notification for chat
    - Send push notification when recipient is offline
    - _Requirements: 14.7_

  - [ ]* 17.4 Write unit tests for chat system
    - Test message sending and retrieval
    - Test edit time window enforcement
    - Test deletion permissions
    - Test pagination


- [x] 18. Communication Module - Voting System
  - [x] 18.1 Create Poll and Vote models in Prisma schema
    - Define Poll model with mahber_id, question, options (Json), poll_type, voting_deadline, eligibility_criteria
    - Define Vote model with poll_id, member_id, choices (Json)
    - Create enum for PollType (SINGLE_CHOICE, MULTIPLE_CHOICE)
    - Add @@unique constraint on [poll_id, member_id] for Vote model
    - Create Prisma migrations with `pnpm exec prisma migrate dev --name create_polls_and_votes`
    - _Requirements: 15.1, 15.2, 15.3, 15.8_

  - [x] 18.2 Implement voting endpoints
    - Create POST /mahbers/:id/polls endpoint (admin only)
    - Create GET /mahbers/:id/polls endpoint
    - Create POST /mahbers/:id/polls/:pollId/vote endpoint
    - Validate voter eligibility and prevent duplicate votes
    - Enforce vote immutability
    - Support Amharic content
    - _Requirements: 15.1, 15.3, 15.4, 15.8_

  - [x] 18.3 Implement poll results endpoint
    - Create GET /mahbers/:id/polls/:pollId/results endpoint
    - Calculate vote counts by option
    - Maintain vote anonymity (no individual vote exposure)
    - Allow admins to view real-time results
    - _Requirements: 15.6, 15.7_

  - [x] 18.4 Implement automatic poll closing
    - Close poll when voting_deadline passes
    - Calculate final results
    - _Requirements: 15.5_

  - [ ]* 18.5 Write unit tests for voting system
    - Test poll creation and voting
    - Test eligibility validation
    - Test vote immutability
    - Test result calculation and anonymity


- [x] 19. Communication Module - Firebase FCM Integration
  - [x] 19.1 Set up Firebase Admin SDK
    - Install firebase-admin package
    - Configure Firebase credentials from environment variables
    - Initialize Firebase app on module startup
    - _Requirements: 24.3_

  - [x] 19.2 Create DeviceToken model in Prisma schema
    - Define DeviceToken model with user_id, token, platform, is_active
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_device_tokens`
    - _Requirements: 13.3_

  - [x] 19.3 Implement device token management endpoints
    - Create POST /notifications/register-device endpoint
    - Create DELETE /notifications/unregister-device endpoint
    - Handle invalid token removal
    - _Requirements: 13.3_

  - [x] 19.4 Implement notification service
    - Create sendNotification method using Firebase Admin SDK
    - Support multi-device delivery
    - Handle notification failures and retry
    - Remove invalid tokens automatically
    - Support Amharic content in notifications
    - _Requirements: 13.3, 17.6, 22.7_

  - [ ]* 19.5 Write property test for notification delivery guarantee
    - **Property 29: Notification Delivery Guarantee**
    - **Validates: Requirements 8.5, 9.7, 10.4, 10.6**

  - [x] 19.5 Integrate notifications with existing features
    - Send notifications for announcements
    - Send notifications for event creation/cancellation
    - Send notifications for chat messages (offline users)
    - Send notifications for fines applied
    - Send notifications for lottery results
    - Send notifications for payment reminders
    - _Requirements: 13.3, 14.7, 8.5, 9.7, 17.1, 17.2_

  - [ ]* 19.6 Write unit tests for FCM integration
    - Test notification sending with valid tokens
    - Test invalid token removal
    - Test multi-device delivery
    - Test Amharic content in notifications

- [x] 20. Checkpoint - Communication module complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 21. Automation Module - Bull Queue Setup
  - [x] 21.1 Set up Bull Queue with Redis
    - Install @nestjs/bull and bull packages
    - Configure Bull module with Redis connection
    - Set up queue monitoring and health checks
    - _Requirements: 16.1_

  - [x] 21.2 Create job processors base structure
    - Define job types and data interfaces
    - Implement retry logic with exponential backoff
    - Implement job locking to prevent concurrent execution
    - Add error logging for failed jobs
    - _Requirements: 16.6, 16.7_

  - [ ]* 21.3 Write unit tests for queue infrastructure
    - Test job creation and processing
    - Test retry mechanism
    - Test concurrent execution prevention


- [x] 22. Automation Module - Scheduled Jobs
  - [x] 22.1 Implement fine calculation scheduler
    - Create FineCalculationProcessor
    - Schedule job to run daily at midnight
    - Check for overdue payments based on payment_frequency
    - Calculate and apply fines for missed contributions
    - Send notifications to members with fines
    - _Requirements: 16.1, 8.1, 8.5_

  - [x] 22.2 Implement join request expiry checker
    - Create JoinRequestExpiryProcessor
    - Schedule job to run daily at midnight
    - Find join requests in Pending status older than 7 days
    - Transition expired requests to Invalidated status
    - _Requirements: 16.2, 3.5_

  - [ ]* 22.3 Write property test for join request expiry
    - **Property 30: Join Request Expiry**
    - **Validates: Requirements 3.5**

  - [x] 22.3 Implement lottery execution scheduler
    - Create LotteryExecutionProcessor
    - Schedule job to run daily at configured time
    - Find Equb organizations with scheduled lottery date
    - Execute lottery and record results
    - Send notifications to all members
    - _Requirements: 16.3, 9.1, 9.7_

  - [x] 22.4 Implement payment reminder scheduler
    - Create PaymentReminderProcessor
    - Schedule job to run daily
    - Find upcoming payments (3 days and 1 day before due date)
    - Send reminder notifications with payment details
    - Respect member notification preferences
    - _Requirements: 16.5, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 22.5 Implement attendance processor
    - Create AttendanceProcessor
    - Trigger after event end_time
    - Mark non-attending members as absent
    - Apply fines for mandatory events
    - _Requirements: 16.4, 11.7_

  - [ ]* 22.6 Write unit tests for scheduled jobs
    - Test fine calculation job execution
    - Test join request expiry job
    - Test lottery execution job
    - Test payment reminder job
    - Test attendance processor job


- [x] 23. Audit Trail and Multi-Tenancy
  - [x] 23.1 Create AuditTrail model in Prisma schema
    - Define AuditTrail model with mahber_id, entity_type, entity_id, action, actor_id, old_value, new_value, metadata
    - Add @@index on [mahber_id, entity_type, created_at]
    - Create Prisma migration with `pnpm exec prisma migrate dev --name create_audit_trail`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 23.7_

  - [x] 23.2 Implement audit logging service
    - Create logAuditEvent method
    - Integrate with financial transactions
    - Integrate with membership state transitions
    - Integrate with role assignments
    - Integrate with payment gateway interactions
    - Ensure immutability of audit records
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.8_

  - [ ]* 23.3 Write property test for audit trail immutability
    - **Property 9: Audit Trail Immutability**
    - **Validates: Requirements 4.6, 6.7, 8.6, 9.6, 19.1, 19.2, 19.3, 19.4, 19.8**

  - [x] 23.3 Implement audit trail query endpoints
    - Create GET /mahbers/:id/audit-trail endpoint (admin only)
    - Support filtering by date range, event type, actor
    - Implement pagination
    - _Requirements: 19.6_

  - [x] 23.4 Implement multi-tenancy guards
    - Create TenantGuard to enforce mahber_id filtering
    - Extract mahber_id from JWT claims or request params
    - Validate user membership in requested mahber
    - Apply guard to all tenant-scoped endpoints
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 23.5 Write property test for multi-tenancy isolation
    - **Property 4: Multi-Tenancy Data Isolation**
    - **Validates: Requirements 5.7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7**

  - [x] 23.5 Create Prisma middleware for tenant filtering
    - Implement Prisma middleware to automatically add mahber_id filter to queries
    - Apply middleware to all tenant-scoped models
    - _Requirements: 18.1_

  - [ ]* 23.6 Write unit tests for audit trail
    - Test audit logging for various operations
    - Test audit record immutability
    - Test audit query filtering
    - Test multi-tenancy isolation

- [x] 24. Checkpoint - Audit and multi-tenancy complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 25. API Documentation and Validation
  - [x] 25.1 Set up Swagger/OpenAPI documentation
    - Install @nestjs/swagger package
    - Configure Swagger module with API metadata
    - Expose Swagger UI at /api/docs endpoint
    - _Requirements: 20.1, 20.2_

  - [ ] 25.2 Add Swagger decorators to all endpoints
    - Add @ApiTags for module grouping
    - Add @ApiOperation for endpoint descriptions
    - Add @ApiResponse for response documentation
    - Add @ApiBearerAuth for protected endpoints
    - Document all DTOs with @ApiProperty
    - _Requirements: 20.3, 20.4, 20.5, 20.6, 20.7_

  - [ ] 25.3 Implement comprehensive input validation
    - Add class-validator decorators to all DTOs
    - Implement custom validators for Ethiopian phone format
    - Implement custom validators for Amharic text
    - Configure global validation pipe
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

  - [ ]* 25.4 Write unit tests for validation
    - Test DTO validation with valid and invalid inputs
    - Test custom validators
    - Test error message formatting


- [ ] 26. Error Handling and Resilience
  - [ ] 26.1 Implement global exception filter
    - Create custom exception filter for consistent error responses
    - Handle validation errors (400)
    - Handle authentication errors (401)
    - Handle authorization errors (403)
    - Handle not found errors (404)
    - Handle conflict errors (409)
    - Handle internal server errors (500)
    - Log all errors with context
    - _Requirements: 22.1, 22.2, 22.3_

  - [ ] 26.2 Implement internationalized error messages
    - Set up i18n module with English and Amharic translations
    - Create error message translation files
    - Return errors in requested language (Accept-Language header)
    - _Requirements: 22.7, 30.1, 30.2, 30.3, 30.6, 30.7_

  - [ ] 26.3 Implement circuit breaker for external APIs
    - Install circuit breaker library
    - Apply to Chapa API calls
    - Apply to Firebase FCM calls
    - Configure failure threshold and timeout
    - _Requirements: 22.6_

  - [ ] 26.4 Implement database connection resilience
    - Configure connection retry with exponential backoff
    - Implement connection health checks
    - _Requirements: 22.5_

  - [ ] 26.5 Implement external service error handling
    - Handle Chapa API unavailability with 503 response
    - Queue failed payments for retry
    - Handle FCM failures gracefully
    - _Requirements: 22.4_

  - [ ]* 26.6 Write unit tests for error handling
    - Test exception filter with various error types
    - Test internationalized error messages
    - Test circuit breaker behavior
    - Test retry mechanisms


- [ ] 27. Security Hardening
  - [ ] 27.1 Implement security middleware
    - Install and configure helmet for HTTP security headers
    - Configure CORS policy with allowed origins
    - Implement rate limiting with @nestjs/throttler
    - Configure rate limits per endpoint (100 req/15min general, 5 req/min auth)
    - _Requirements: 28.2, 28.5, 28.7_

  - [ ] 27.2 Implement input sanitization
    - Add sanitization middleware for SQL injection prevention
    - Add sanitization for XSS prevention
    - Validate all user inputs
    - _Requirements: 21.3, 28.6_

  - [ ] 27.3 Implement HTTPS enforcement
    - Configure HTTPS redirect middleware
    - Enforce TLS 1.3 in production
    - _Requirements: 28.4_

  - [ ] 27.4 Implement security event logging
    - Log failed authentication attempts with IP
    - Log invalid JWT tokens
    - Log webhook signature failures
    - Log suspicious activity
    - _Requirements: 19.5, 28.8_

  - [ ]* 27.5 Write unit tests for security features
    - Test rate limiting enforcement
    - Test CORS policy
    - Test input sanitization
    - Test security event logging


- [ ] 28. Performance Optimization
  - [ ] 28.1 Implement caching with Redis
    - Install @nestjs/cache-manager and cache-manager-redis-store
    - Configure Redis cache module
    - Cache organization settings (1 hour TTL)
    - Cache user roles (30 minutes TTL)
    - Implement cache invalidation on updates
    - _Requirements: 29.5_

  - [ ] 28.2 Optimize database queries
    - Review and optimize N+1 query problems with eager loading
    - Ensure all indexes are properly configured
    - Implement query result pagination
    - _Requirements: 29.3, 29.4, 29.6_

  - [ ] 28.3 Implement response time monitoring
    - Add request duration middleware
    - Log slow queries (>500ms)
    - Track 95th and 99th percentile response times
    - _Requirements: 29.1_

  - [ ] 28.4 Optimize file operations
    - Implement streaming for large file uploads
    - Optimize thumbnail generation
    - _Requirements: 29.7_

  - [ ]* 28.5 Write performance tests
    - Test API response times under load
    - Test database query performance
    - Test cache hit rates

- [ ] 29. Checkpoint - Security and performance complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 30. Internationalization Support
  - [ ] 30.1 Set up i18n module
    - Install nestjs-i18n package
    - Configure i18n module with English and Amharic
    - Set up translation file structure
    - Configure Accept-Language header resolver
    - _Requirements: 30.1, 30.2, 30.7_

  - [ ] 30.2 Create translation files
    - Create English translation files (errors, notifications, messages)
    - Create Amharic translation files (errors, notifications, messages)
    - _Requirements: 30.3, 30.6_

  - [ ] 30.3 Implement language-aware content storage
    - Add language metadata to user-generated content
    - Store announcements with language tags
    - Store event descriptions with language tags
    - Store chat messages with language tags
    - _Requirements: 30.4_

  - [ ] 30.4 Configure database for Amharic support
    - Ensure UTF-8 encoding in PostgreSQL
    - Configure proper collation for Amharic text
    - _Requirements: 30.5_

  - [ ]* 30.5 Write unit tests for i18n
    - Test translation retrieval in both languages
    - Test language fallback to English
    - Test Amharic character storage and retrieval


- [ ] 31. Testing - Unit Tests
  - [ ] 31.1 Write unit tests for Auth module
    - Test user registration with various inputs
    - Test login flow and JWT generation
    - Test password hashing and validation
    - Test authentication guards
    - _Requirements: 26.1_

  - [ ] 31.2 Write unit tests for Membership module
    - Test Mahber CRUD operations
    - Test join request workflow
    - Test state machine transitions
    - Test RBAC permission checking
    - _Requirements: 26.1_

  - [ ] 31.3 Write unit tests for Financial module
    - Test payment initiation and webhook processing
    - Test ledger entry creation and balance calculation
    - Test fine calculation
    - Test lottery execution
    - _Requirements: 26.1_

  - [ ] 31.4 Write unit tests for Events module
    - Test event CRUD operations
    - Test QR code generation and validation
    - Test attendance recording
    - Test photo upload and gallery
    - _Requirements: 26.1_

  - [ ] 31.5 Write unit tests for Communication module
    - Test announcement creation and delivery
    - Test chat messaging
    - Test voting system
    - Test FCM notification sending
    - _Requirements: 26.1_

  - [ ] 31.6 Write unit tests for Automation module
    - Test scheduled job execution
    - Test job retry logic
    - Test concurrent execution prevention
    - _Requirements: 26.1_

  - [ ] 31.7 Configure test coverage reporting
    - Configure Jest coverage collection
    - Set minimum coverage threshold to 80%
    - Generate coverage reports
    - _Requirements: 26.5_


- [ ] 32. Testing - Property-Based Tests
  - [ ] 32.1 Set up fast-check library
    - Install fast-check package
    - Configure property test runner
    - Set minimum 100 iterations per property
    - _Requirements: 26.3_

  - [ ] 32.2 Write remaining property tests
    - Verify all 30 correctness properties have corresponding tests
    - Ensure each test references its property number and validates specific requirements
    - Tag all tests with "Feature: mahber-connect-backend, Property {N}: {title}"
    - _Requirements: 26.3_

  - [ ] 32.3 Implement property test utilities
    - Create custom arbitraries for domain objects (Configuration, Membership, Payment)
    - Create test data generators
    - _Requirements: 26.3_


- [ ] 33. Testing - Integration and E2E Tests
  - [ ] 33.1 Set up integration test infrastructure
    - Configure test database with Docker
    - Set up test Redis instance
    - Mock external services (Chapa, Firebase)
    - _Requirements: 26.2, 26.4_

  - [ ] 33.2 Write integration tests for API endpoints
    - Test all Auth endpoints with real database
    - Test all Membership endpoints
    - Test all Financial endpoints
    - Test all Events endpoints
    - Test all Communication endpoints
    - _Requirements: 26.2_

  - [ ] 33.3 Write E2E tests for critical flows
    - Test complete user registration and login flow
    - Test join request to active membership flow
    - Test payment initiation to completion flow
    - Test event creation to attendance recording flow
    - _Requirements: 26.7_

  - [ ] 33.4 Configure CI/CD test execution
    - Set up GitHub Actions workflow
    - Run linter, unit tests, property tests, integration tests
    - Upload coverage reports
    - _Requirements: 26.6_

- [ ] 34. Checkpoint - All tests complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 35. Deployment and Monitoring
  - [ ] 35.1 Create production Docker image
    - Optimize Dockerfile for production
    - Implement multi-stage build
    - Configure health check endpoint
    - _Requirements: 25.1, 25.2, 25.7_

  - [ ] 35.2 Set up Prisma migrations for production
    - Review all Prisma migrations for production readiness
    - Test migration deployment process
    - Document migration rollback strategy
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 25.5_

  - [ ] 35.3 Configure production environment
    - Set up production environment variables
    - Configure secrets management
    - Set up HTTPS certificates
    - _Requirements: 24.4, 24.5, 28.4_

  - [ ] 35.4 Implement health check and monitoring
    - Create /health endpoint with database and Redis checks
    - Set up logging infrastructure
    - Configure metrics collection
    - _Requirements: 25.7_

  - [ ] 35.5 Create deployment documentation
    - Document deployment process
    - Document environment configuration
    - Document database migration process
    - Document monitoring and troubleshooting
    - _Requirements: 20.1_

  - [ ] 35.6 Set up CI/CD pipeline
    - Configure automated testing on pull requests
    - Configure automated deployment to staging
    - Configure production deployment workflow
    - _Requirements: 26.6_


- [ ] 36. Final Integration and Wiring
  - [ ] 36.1 Wire all modules together
    - Import all modules in AppModule
    - Configure module dependencies
    - Set up global pipes, filters, and interceptors
    - _Requirements: All_

  - [ ] 36.2 Verify end-to-end functionality
    - Test complete user journey from registration to active participation
    - Test payment flow from initiation to ledger entry
    - Test event flow from creation to attendance recording
    - Test automation jobs execution
    - _Requirements: All_

  - [ ] 36.3 Perform security audit
    - Review all authentication and authorization implementations
    - Review all input validation
    - Review all multi-tenancy isolation
    - Review all sensitive data handling
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8_

  - [ ] 36.4 Optimize performance
    - Profile API response times
    - Optimize slow queries
    - Verify cache effectiveness
    - Test under load
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7_

  - [ ] 36.5 Complete API documentation
    - Verify all endpoints are documented in Swagger
    - Add example requests and responses
    - Document error codes and messages
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

- [ ] 37. Final checkpoint - System ready for deployment
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code should be written in TypeScript using NestJS framework
- The implementation follows a modular architecture with clear separation of concerns
- Multi-tenancy isolation is enforced at multiple layers (query, guard, service)
- All financial operations use database transactions for ACID compliance
- External API calls implement circuit breaker and retry patterns for resilience

## Implementation Order

The tasks are organized to build incrementally:
1. Foundation (Project setup, database, Docker)
2. Authentication (User management, JWT)
3. Core membership (Organizations, join workflow, RBAC)
4. Financial system (Payments, ledger, fines, lottery)
5. Events (Event management, QR attendance, photos)
6. Communication (Announcements, chat, voting, notifications)
7. Automation (Background jobs, schedulers)
8. Cross-cutting concerns (Audit trail, multi-tenancy, security)
9. Testing (Unit, property-based, integration, E2E)
10. Deployment (Docker, CI/CD, monitoring)

Each phase builds on previous work and includes checkpoints to validate progress before moving forward.
