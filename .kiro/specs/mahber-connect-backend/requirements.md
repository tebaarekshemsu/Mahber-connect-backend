# Requirements Document: MahberConnect Backend

## Introduction

MahberConnect is a cloud-based backend system that digitizes traditional Ethiopian social and financial institutions (Mahber, Equb, Iddir). The system replaces the manual "Dafter" (paper ledger) system with a secure, automated platform that manages membership, financial transactions, event attendance, and community communication. The backend is built with NestJS and provides REST APIs for mobile and web clients, supporting multi-tenancy with strict data isolation, automated financial calculations, payment gateway integration, and real-time notifications.

## Glossary

- **System**: The MahberConnect backend application
- **Mahber**: A traditional Ethiopian social institution for community support and religious gatherings
- **Equb**: A rotating savings and credit association where members contribute regularly and take turns receiving the pot
- **Iddir**: A traditional Ethiopian burial society providing mutual aid during bereavement
- **Dafter**: Traditional paper ledger used to track membership and financial records
- **Member**: A registered user who belongs to one or more Mahber organizations
- **Admin**: A member with elevated privileges to manage a Mahber organization
- **Treasurer**: A member responsible for financial management within a Mahber
- **Secretary**: A member responsible for record-keeping and communication
- **Join_Request**: An application submitted by a user to join a Mahber organization
- **Payment_Gateway**: The Chapa API service for processing payments via Telebirr and CBE Birr
- **Webhook**: An HTTP callback from the Payment Gateway to notify payment status
- **Fine**: A monetary penalty applied for rule violations such as missed payments or absences
- **Lottery_Draw**: The process of randomly selecting an Equb winner from eligible members
- **QR_Attendance**: A time-sensitive QR code used to verify event attendance
- **Background_Worker**: An automated process that runs scheduled tasks
- **Multi_Tenancy**: Architecture pattern ensuring data isolation between different Mahber organizations
- **RBAC**: Role-Based Access Control system for managing permissions
- **Audit_Trail**: Immutable log of all financial transactions and critical operations
- **JWT_Token**: JSON Web Token used for stateless authentication
- **State_Machine**: A model defining valid membership status transitions
- **Penalty_Rate**: Configurable percentage or fixed amount charged for violations
- **Firebase_FCM**: Firebase Cloud Messaging service for push notifications
- **Signature_Verification**: Cryptographic validation of webhook authenticity
- **ACID_Compliance**: Database properties ensuring transaction integrity (Atomicity, Consistency, Isolation, Durability)

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new user, I want to register an account with my phone number and authenticate securely, so that I can access the platform and join Mahber organizations.

#### Acceptance Criteria

1. WHEN a user submits registration data with phone number, password, and profile information, THE System SHALL create a new user account with hashed password
2. WHEN a user provides valid credentials, THE System SHALL generate a JWT_Token with user identity and role claims
3. THE System SHALL validate that phone numbers follow Ethiopian format (+251XXXXXXXXX)
4. WHEN a user attempts to register with an existing phone number, THE System SHALL return a descriptive error
5. THE System SHALL enforce password complexity requirements (minimum 8 characters, mixed case, numbers)
6. WHEN a JWT_Token expires, THE System SHALL reject authenticated requests and require re-authentication
7. THE System SHALL support Amharic characters in user profile fields (name, bio)

### Requirement 2: Mahber Organization Management

**User Story:** As an admin, I want to create and configure Mahber organizations with custom rules and settings, so that I can digitize my community's traditional institution.

#### Acceptance Criteria

1. WHEN an authenticated user creates a Mahber organization, THE System SHALL assign the creator as Admin role
2. THE System SHALL allow Admins to configure organization settings including contribution amount, payment frequency, penalty rates, and meeting schedule
3. THE System SHALL support three organization types: Mahber, Equb, and Iddir
4. WHEN an Admin updates organization settings, THE System SHALL apply changes to future transactions only
5. THE System SHALL enforce unique organization names within the platform
6. THE System SHALL store organization configuration in JSONB format for flexible schema evolution
7. WHILE an organization has active members, THE System SHALL prevent deletion of the organization

### Requirement 3: Membership Join Workflow

**User Story:** As a user, I want to request to join a Mahber organization and complete the approval process, so that I can participate in community activities.

#### Acceptance Criteria

1. WHEN a user submits a Join_Request to a public organization, THE System SHALL create a request with status "Pending"
2. WHEN a user submits a Join_Request to a private organization, THE System SHALL require an invitation code
3. WHEN an Admin approves a Join_Request, THE System SHALL transition the request status to "Approved" and create a membership record with status "Payment_Required"
4. WHEN an Admin rejects a Join_Request, THE System SHALL transition the request status to "Rejected" and record the rejection reason
5. IF a Join_Request remains in "Pending" status for more than 7 days without payment, THEN THE System SHALL automatically transition it to "Invalidated"
6. THE System SHALL prevent duplicate Join_Requests from the same user to the same organization
7. WHEN a membership payment is confirmed, THE System SHALL transition membership status from "Payment_Required" to "Active"

### Requirement 4: Membership State Machine

**User Story:** As the system, I want to enforce valid membership status transitions, so that membership lifecycle is consistent and auditable.

#### Acceptance Criteria

1. THE System SHALL enforce the following valid state transitions: Pending → Approved → Payment_Required → Active
2. THE System SHALL allow transition from Payment_Required → Invalidated when payment deadline expires
3. THE System SHALL allow transition from Active → Suspended when an Admin suspends a member
4. THE System SHALL allow transition from Suspended → Active when an Admin reinstates a member
5. WHEN an invalid state transition is attempted, THE System SHALL reject the operation and return an error
6. THE System SHALL record all state transitions in the Audit_Trail with timestamp, actor, and reason
7. THE System SHALL prevent deletion of membership records to maintain historical integrity

### Requirement 5: Dynamic Role-Based Access Control

**User Story:** As an admin, I want to assign roles with specific permissions to members, so that I can delegate responsibilities while maintaining security.

#### Acceptance Criteria

1. THE System SHALL support four predefined roles: Admin, Treasurer, Secretary, and Member
2. THE System SHALL store role permissions in JSONB format allowing custom permission sets
3. WHEN a user attempts an operation, THE System SHALL verify the user has the required permission for their role
4. THE System SHALL allow Admins to create custom roles with specific permission combinations
5. THE System SHALL enforce that every organization has at least one Admin at all times
6. WHEN an Admin assigns a role to a member, THE System SHALL validate the member has Active status
7. THE System SHALL scope all permissions by mahber_id to enforce multi-tenancy isolation

### Requirement 6: Payment Integration with Chapa

**User Story:** As a member, I want to make contributions and pay fines through mobile money (Telebirr/CBE Birr), so that I can fulfill my financial obligations conveniently.

#### Acceptance Criteria

1. WHEN a member initiates a payment, THE System SHALL create a payment record and call the Payment_Gateway API to generate a checkout URL
2. THE System SHALL include transaction metadata (mahber_id, member_id, payment_type, amount) in the Payment_Gateway request
3. WHEN the Payment_Gateway sends a webhook notification, THE System SHALL verify the webhook signature using the Chapa secret key
4. WHEN a webhook indicates successful payment, THE System SHALL update the payment record status to "Completed" and update member balance
5. WHEN a webhook indicates failed payment, THE System SHALL update the payment record status to "Failed" and allow retry
6. THE System SHALL implement idempotent webhook processing to handle duplicate notifications
7. THE System SHALL log all Payment_Gateway interactions in the Audit_Trail
8. IF webhook signature verification fails, THEN THE System SHALL reject the webhook and log a security alert

### Requirement 7: Digital Ledger and Transaction Management

**User Story:** As a treasurer, I want to track all financial transactions in a digital ledger, so that I can maintain accurate records and generate reports.

#### Acceptance Criteria

1. WHEN a payment is completed, THE System SHALL create a ledger entry with transaction type, amount, member_id, mahber_id, and timestamp
2. THE System SHALL support transaction types: Contribution, Fine, Equb_Payout, Iddir_Payout, Refund
3. THE System SHALL calculate running balance for each member after every transaction
4. THE System SHALL enforce that ledger entries are immutable once created
5. WHEN a Treasurer requests a financial report, THE System SHALL generate a summary of all transactions within the specified date range
6. THE System SHALL ensure all financial operations execute within database transactions to maintain ACID_Compliance
7. FOR ALL ledger entries, THE System SHALL maintain referential integrity to payment records

### Requirement 8: Automated Fine Calculation

**User Story:** As a treasurer, I want the system to automatically calculate and apply fines for missed payments and absences, so that penalties are applied consistently and fairly.

#### Acceptance Criteria

1. WHEN a Background_Worker detects a missed contribution payment, THE System SHALL calculate the fine using the configured Penalty_Rate
2. WHEN a member is marked absent from a mandatory event, THE System SHALL apply the absence fine to the member's balance
3. THE System SHALL support two penalty calculation modes: fixed amount and percentage of contribution
4. WHEN a fine is applied, THE System SHALL create a ledger entry with transaction type "Fine" and link to the violation record
5. THE System SHALL send a notification to the member when a fine is applied
6. THE System SHALL allow Treasurers to waive fines with recorded justification in the Audit_Trail
7. WHILE a member has unpaid fines exceeding the threshold, THE System SHALL restrict the member from receiving Equb payouts

### Requirement 9: Equb Lottery System

**User Story:** As an Equb member, I want to participate in a fair and transparent lottery to receive the contribution pot, so that I trust the selection process.

#### Acceptance Criteria

1. WHEN the lottery date arrives, THE Background_Worker SHALL trigger a Lottery_Draw for eligible members
2. THE System SHALL use a cryptographically secure random number generator for winner selection
3. THE System SHALL exclude members who have already won in the current cycle from the draw
4. THE System SHALL exclude members with unpaid fines exceeding the threshold from the draw
5. WHEN a winner is selected, THE System SHALL create a payout transaction and update the member's balance
6. THE System SHALL record the lottery result with timestamp, winner, eligible participants list, and random seed in the Audit_Trail
7. THE System SHALL notify all members of the lottery result
8. FOR ALL lottery draws, THE System SHALL ensure each eligible member has equal probability of selection

### Requirement 10: Event Scheduling and Management

**User Story:** As a secretary, I want to create and manage events with details and attendance tracking, so that members are informed and participation is recorded.

#### Acceptance Criteria

1. WHEN a Secretary creates an event, THE System SHALL store event details including title, description, date, time, location, and attendance requirement
2. THE System SHALL support event types: Meeting, Ceremony, Fundraiser, Social_Gathering
3. THE System SHALL allow Secretaries to mark events as mandatory or optional
4. WHEN an event is created, THE System SHALL send notifications to all Active members
5. THE System SHALL allow Secretaries to update event details up to 24 hours before the event start time
6. WHEN an event is cancelled, THE System SHALL notify all members and mark the event as cancelled
7. THE System SHALL prevent deletion of past events to maintain historical records

### Requirement 11: QR-Based Attendance Tracking

**User Story:** As a member, I want to check in to events by scanning a QR code, so that my attendance is recorded automatically and accurately.

#### Acceptance Criteria

1. WHEN an event starts, THE System SHALL generate a time-sensitive QR_Attendance code valid for the event duration
2. THE System SHALL encode the event_id, mahber_id, and expiration timestamp in the QR_Attendance code
3. WHEN a member scans the QR_Attendance code, THE System SHALL verify the code is valid and not expired
4. WHEN a valid QR_Attendance code is scanned, THE System SHALL record the member's attendance with timestamp
5. THE System SHALL prevent duplicate attendance records for the same member and event
6. IF a member scans an expired QR_Attendance code, THEN THE System SHALL reject the scan and return an error
7. WHEN the event ends, THE Background_Worker SHALL mark all non-attending members as absent and apply fines if the event was mandatory

### Requirement 12: Event Photo Gallery

**User Story:** As a member, I want to upload and view photos from events, so that we can share memories and strengthen community bonds.

#### Acceptance Criteria

1. WHEN a member uploads a photo to an event gallery, THE System SHALL validate the file type (JPEG, PNG) and size (max 10MB)
2. THE System SHALL store photo metadata (uploader_id, event_id, upload_timestamp) in the database
3. THE System SHALL generate thumbnail versions of uploaded photos for efficient loading
4. WHEN a member requests event photos, THE System SHALL return photos only for events in Mahber organizations they belong to
5. THE System SHALL allow photo uploaders and Admins to delete photos
6. THE System SHALL enforce storage quotas per organization to prevent abuse
7. THE System SHALL support Amharic captions for photos

### Requirement 13: Announcement System

**User Story:** As an admin, I want to broadcast announcements to all members, so that important information reaches everyone quickly.

#### Acceptance Criteria

1. WHEN an Admin creates an announcement, THE System SHALL store the announcement with title, content, priority level, and target audience
2. THE System SHALL support three priority levels: Normal, Important, Urgent
3. WHEN an announcement is published, THE System SHALL send push notifications via Firebase_FCM to all target members
4. THE System SHALL allow Admins to target announcements to specific roles or all members
5. THE System SHALL mark announcements as read when a member views them
6. THE System SHALL allow Admins to schedule announcements for future publication
7. THE System SHALL support Amharic content in announcements

### Requirement 14: Real-Time Chat System

**User Story:** As a member, I want to participate in group chat with other members, so that we can communicate and coordinate activities.

#### Acceptance Criteria

1. WHEN a member sends a chat message, THE System SHALL store the message with sender_id, mahber_id, content, and timestamp
2. THE System SHALL enforce that members can only send messages to Mahber organizations they belong to with Active status
3. THE System SHALL support text messages with Amharic characters
4. THE System SHALL allow members to edit their own messages within 5 minutes of sending
5. THE System SHALL allow message senders and Admins to delete messages
6. THE System SHALL implement pagination for message history retrieval
7. THE System SHALL send push notifications for new messages when the recipient is offline

### Requirement 15: Voting System

**User Story:** As an admin, I want to create polls for members to vote on decisions, so that we can make democratic choices on important matters.

#### Acceptance Criteria

1. WHEN an Admin creates a poll, THE System SHALL store the poll with question, options, voting deadline, and eligibility criteria
2. THE System SHALL support single-choice and multiple-choice poll types
3. WHEN a member submits a vote, THE System SHALL validate the member is eligible and has not already voted
4. THE System SHALL enforce that votes cannot be changed after submission
5. WHEN the voting deadline passes, THE System SHALL close the poll and calculate results
6. THE System SHALL allow Admins to view real-time vote counts during active polls
7. THE System SHALL maintain vote anonymity by not exposing individual vote choices to other members
8. THE System SHALL support Amharic text in poll questions and options

### Requirement 16: Background Job Scheduling

**User Story:** As the system, I want to execute scheduled tasks automatically, so that routine operations happen reliably without manual intervention.

#### Acceptance Criteria

1. THE System SHALL run a Background_Worker every day at midnight to check for overdue payments
2. THE System SHALL run a Background_Worker every day at midnight to check for expired Join_Requests
3. THE System SHALL run a Background_Worker at configured times to trigger Equb lottery draws
4. THE System SHALL run a Background_Worker after each event to process attendance and apply fines
5. THE System SHALL run a Background_Worker daily to send payment reminders for upcoming contributions
6. WHEN a Background_Worker fails, THE System SHALL log the error and retry with exponential backoff
7. THE System SHALL prevent concurrent execution of the same Background_Worker job

### Requirement 17: Payment Reminder Notifications

**User Story:** As a member, I want to receive reminders before my payment is due, so that I can avoid late fees and maintain good standing.

#### Acceptance Criteria

1. WHEN a contribution payment is due in 3 days, THE Background_Worker SHALL send a reminder notification to the member
2. WHEN a contribution payment is due in 1 day, THE Background_Worker SHALL send a final reminder notification to the member
3. THE System SHALL include payment amount, due date, and payment link in reminder notifications
4. THE System SHALL send reminders via Firebase_FCM push notifications
5. THE System SHALL not send reminders for payments that have already been completed
6. THE System SHALL allow members to configure reminder preferences (enable/disable, timing)
7. THE System SHALL support Amharic text in reminder notifications

### Requirement 18: Multi-Tenancy Data Isolation

**User Story:** As a member, I want my Mahber's data to be completely isolated from other organizations, so that privacy and security are maintained.

#### Acceptance Criteria

1. THE System SHALL include mahber_id in all database queries for tenant-scoped resources
2. THE System SHALL validate that authenticated users can only access data for Mahber organizations they belong to
3. THE System SHALL enforce data isolation at the application layer using query filters
4. WHEN a user attempts to access data from a Mahber they don't belong to, THE System SHALL return an authorization error
5. THE System SHALL scope all API endpoints by mahber_id extracted from JWT_Token claims or request parameters
6. THE System SHALL prevent cross-tenant data leakage in aggregation queries and reports
7. THE System SHALL enforce that Admins can only manage members within their own Mahber organizations

### Requirement 19: Audit Trail and Logging

**User Story:** As an admin, I want to view a complete history of all financial transactions and critical operations, so that I can ensure accountability and resolve disputes.

#### Acceptance Criteria

1. THE System SHALL log all financial transactions (payments, fines, payouts) in the Audit_Trail with immutable records
2. THE System SHALL log all membership state transitions in the Audit_Trail with actor and reason
3. THE System SHALL log all role assignments and permission changes in the Audit_Trail
4. THE System SHALL log all Payment_Gateway webhook interactions in the Audit_Trail
5. THE System SHALL log all failed authentication attempts with IP address and timestamp
6. WHEN an Admin requests audit logs, THE System SHALL return filtered logs based on date range, event type, and actor
7. THE System SHALL retain audit logs for a minimum of 7 years for compliance purposes
8. THE System SHALL prevent modification or deletion of Audit_Trail records

### Requirement 20: API Documentation with Swagger

**User Story:** As a frontend developer, I want to access interactive API documentation, so that I can integrate with the backend efficiently.

#### Acceptance Criteria

1. THE System SHALL generate Swagger documentation from NestJS decorators and DTOs
2. THE System SHALL expose Swagger UI at the /api/docs endpoint
3. THE System SHALL document all request/response schemas using class-validator decorators
4. THE System SHALL document authentication requirements for protected endpoints
5. THE System SHALL include example requests and responses for all endpoints
6. THE System SHALL group endpoints by module (Auth, Membership, Payments, Events, etc.)
7. THE System SHALL document error response formats and status codes

### Requirement 21: Input Validation and Sanitization

**User Story:** As the system, I want to validate and sanitize all user inputs, so that data integrity is maintained and injection attacks are prevented.

#### Acceptance Criteria

1. THE System SHALL validate all request DTOs using class-validator decorators
2. WHEN invalid input is received, THE System SHALL return a 400 error with descriptive validation messages
3. THE System SHALL sanitize string inputs to prevent SQL injection and XSS attacks
4. THE System SHALL validate that numeric inputs are within acceptable ranges
5. THE System SHALL validate that date inputs are in ISO 8601 format
6. THE System SHALL validate that enum inputs match predefined values
7. THE System SHALL validate that file uploads match allowed types and size limits
8. THE System SHALL support validation of Amharic text inputs

### Requirement 22: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully and provide helpful feedback, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an unhandled exception occurs, THE System SHALL return a 500 error with a generic message and log the full error details
2. WHEN a resource is not found, THE System SHALL return a 404 error with a descriptive message
3. WHEN authorization fails, THE System SHALL return a 403 error with the required permission
4. WHEN the Payment_Gateway is unavailable, THE System SHALL return a 503 error and queue the payment for retry
5. WHEN database connection fails, THE System SHALL attempt reconnection with exponential backoff
6. THE System SHALL implement circuit breaker pattern for external API calls
7. THE System SHALL provide error messages in Amharic when the client requests Amharic language

### Requirement 23: Database Schema and Migrations

**User Story:** As a developer, I want to manage database schema changes through migrations, so that schema evolution is tracked and deployable.

#### Acceptance Criteria

1. THE System SHALL use Prisma migrations to manage schema changes
2. THE System SHALL version all migration files with timestamps
3. WHEN a migration is applied, THE System SHALL record the migration in the migrations table
4. THE System SHALL prevent running the same migration twice
5. THE System SHALL support rollback of migrations for development environments
6. THE System SHALL enforce foreign key constraints to maintain referential integrity
7. THE System SHALL use appropriate indexes on frequently queried columns (mahber_id, user_id, status)

### Requirement 24: Configuration Management

**User Story:** As a DevOps engineer, I want to manage application configuration through environment variables, so that the same code can run in different environments.

#### Acceptance Criteria

1. THE System SHALL load configuration from environment variables using NestJS ConfigModule
2. THE System SHALL validate required environment variables at application startup
3. THE System SHALL support configuration for database connection, JWT secret, Chapa API keys, and Firebase credentials
4. THE System SHALL use different configuration values for development, staging, and production environments
5. THE System SHALL not commit sensitive configuration values to version control
6. THE System SHALL provide default values for optional configuration parameters
7. WHEN a required environment variable is missing, THE System SHALL fail to start and log a descriptive error

### Requirement 25: Docker Containerization

**User Story:** As a DevOps engineer, I want to deploy the application as a Docker container, so that deployment is consistent across environments.

#### Acceptance Criteria

1. THE System SHALL provide a Dockerfile that builds a production-ready image
2. THE System SHALL use multi-stage Docker builds to minimize image size
3. THE System SHALL provide a docker-compose.yml file for local development with PostgreSQL
4. THE System SHALL expose the application on a configurable port
5. THE System SHALL run database migrations automatically on container startup
6. THE System SHALL use non-root user in the container for security
7. THE System SHALL include health check endpoint for container orchestration

### Requirement 26: Testing Strategy

**User Story:** As a developer, I want comprehensive test coverage, so that I can refactor with confidence and catch bugs early.

#### Acceptance Criteria

1. THE System SHALL include unit tests for all service methods using Jest
2. THE System SHALL include integration tests for all API endpoints
3. THE System SHALL include property-based tests for critical business logic (fine calculation, lottery selection, state transitions)
4. THE System SHALL mock external dependencies (Payment_Gateway, Firebase_FCM) in tests
5. THE System SHALL achieve minimum 80% code coverage
6. THE System SHALL run all tests in CI/CD pipeline before deployment
7. THE System SHALL include end-to-end tests for critical user flows (registration, join workflow, payment)

### Requirement 27: Parser and Serializer for Configuration

**User Story:** As a developer, I want to parse and serialize organization configuration, so that settings can be stored flexibly and validated correctly.

#### Acceptance Criteria

1. WHEN organization configuration is provided as JSON, THE Config_Parser SHALL parse it into a Configuration object
2. WHEN invalid configuration JSON is provided, THE Config_Parser SHALL return a descriptive error with the validation failure
3. THE Config_Serializer SHALL format Configuration objects back into valid JSON
4. FOR ALL valid Configuration objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)
5. THE System SHALL validate that penalty rates are non-negative numbers
6. THE System SHALL validate that payment frequencies are valid enum values (Weekly, Monthly, Quarterly)
7. THE System SHALL validate that contribution amounts are positive numbers

### Requirement 28: Security Hardening

**User Story:** As a security engineer, I want the system to implement security best practices, so that user data and financial transactions are protected.

#### Acceptance Criteria

1. THE System SHALL hash passwords using bcrypt with minimum 10 salt rounds
2. THE System SHALL implement rate limiting on authentication endpoints to prevent brute force attacks
3. THE System SHALL validate JWT_Token signature and expiration on all protected endpoints
4. THE System SHALL use HTTPS for all API communication in production
5. THE System SHALL implement CORS policy to restrict API access to authorized origins
6. THE System SHALL sanitize all database queries to prevent SQL injection
7. THE System SHALL implement helmet middleware for HTTP security headers
8. THE System SHALL log all security events (failed auth, invalid tokens, suspicious activity)

### Requirement 29: Performance Optimization

**User Story:** As a user, I want the system to respond quickly to my requests, so that I have a smooth experience.

#### Acceptance Criteria

1. THE System SHALL respond to API requests within 200ms for 95th percentile
2. THE System SHALL implement database connection pooling to optimize query performance
3. THE System SHALL use database indexes on frequently queried columns
4. THE System SHALL implement pagination for list endpoints to limit response size
5. THE System SHALL cache frequently accessed data (organization settings, user roles) with appropriate TTL
6. THE System SHALL optimize N+1 query problems using eager loading
7. WHEN the system is under high load, THE System SHALL maintain response times within acceptable limits

### Requirement 30: Internationalization Support

**User Story:** As an Amharic-speaking user, I want to use the system in my native language, so that I can understand all content and interactions.

#### Acceptance Criteria

1. THE System SHALL support Amharic (am) and English (en) language codes
2. THE System SHALL accept language preference in request headers (Accept-Language)
3. THE System SHALL return error messages in the requested language
4. THE System SHALL store user-generated content (announcements, messages, event descriptions) with language metadata
5. THE System SHALL validate and store Amharic Unicode characters correctly in the database
6. THE System SHALL provide translated validation messages for common errors
7. THE System SHALL default to English when requested language is not supported

## Correctness Properties for Property-Based Testing

### Property 1: Membership State Machine Invariants

FOR ALL membership records, the following invariants SHALL hold:
- A membership in "Active" status SHALL have a non-null activation_date
- A membership in "Payment_Required" status SHALL have a non-null approval_date
- A membership SHALL NOT transition from "Invalidated" to "Active" without going through "Pending" again
- The created_at timestamp SHALL be less than or equal to any status transition timestamp

### Property 2: Financial Ledger Balance Consistency

FOR ALL members in a Mahber organization:
- The member's current balance SHALL equal the sum of all ledger entries (credits minus debits) for that member
- FOR ALL ledger entries, the running balance SHALL equal the sum of all previous entries plus the current entry amount
- The total contributions collected SHALL equal the sum of all "Contribution" transaction amounts
- The total payouts SHALL NOT exceed the total contributions minus operational costs

### Property 3: Fine Calculation Idempotence

FOR ALL fine calculation operations:
- Calculating a fine for the same violation twice SHALL produce the same fine amount
- Applying a fine SHALL create exactly one ledger entry
- The fine amount SHALL be deterministic based on penalty rate and violation type
- FOR ALL penalty rates P and contribution amounts C, fine(P, C) SHALL equal fine(P, C) when called multiple times

### Property 4: Equb Lottery Fairness

FOR ALL lottery draws with N eligible members:
- Each eligible member SHALL have probability 1/N of being selected
- A member who won in the current cycle SHALL NOT be eligible for subsequent draws in the same cycle
- The lottery result SHALL be reproducible given the same random seed
- FOR ALL lottery draws, exactly one winner SHALL be selected

### Property 5: QR Code Round-Trip Property

FOR ALL QR_Attendance codes generated:
- Encoding event data then decoding SHALL produce the original event data
- A QR code generated for event E at time T SHALL be valid only for event E
- A QR code SHALL be invalid after its expiration timestamp
- FOR ALL valid event_id and timestamp pairs, encode(event_id, timestamp) then decode SHALL return (event_id, timestamp)

### Property 6: Configuration Round-Trip Property

FOR ALL valid Configuration objects C:
- serialize(deserialize(C)) SHALL equal C
- deserialize(serialize(C)) SHALL equal C
- Invalid JSON SHALL produce a descriptive parse error
- Configuration with negative penalty rates SHALL fail validation

### Property 7: Multi-Tenancy Isolation

FOR ALL API requests with mahber_id M:
- The response SHALL contain only data where mahber_id equals M
- A user who is not a member of Mahber M SHALL NOT access data for Mahber M
- FOR ALL database queries, the WHERE clause SHALL include mahber_id filter
- Cross-tenant data leakage SHALL NOT occur in any query result

### Property 8: Payment Webhook Idempotence

FOR ALL payment webhook notifications:
- Processing the same webhook twice SHALL produce the same final state
- A webhook with invalid signature SHALL be rejected
- A webhook for transaction T SHALL update only the payment record for T
- FOR ALL webhooks W, process(W) then process(W) SHALL equal process(W)

### Property 9: Audit Trail Immutability

FOR ALL audit trail records:
- Once created, an audit record SHALL NOT be modified
- An audit record SHALL NOT be deleted
- FOR ALL operations O that create audit records, performing O SHALL create exactly one audit record
- The audit trail SHALL contain a complete history of all financial transactions

### Property 10: JWT Token Validation

FOR ALL JWT_Tokens:
- A token with invalid signature SHALL be rejected
- An expired token SHALL be rejected
- A valid token SHALL contain user_id and mahber_id claims
- FOR ALL tokens T, validate(T) SHALL return the same result when called multiple times with the same token

### Property 11: Attendance Fine Application

FOR ALL mandatory events with N registered members and A attendees:
- Exactly (N - A) fines SHALL be applied
- Each absent member SHALL receive exactly one fine
- Members who attended SHALL NOT receive fines
- FOR ALL events E, the sum of fines applied SHALL equal (N - A) × fine_amount

### Property 12: Role Permission Enforcement

FOR ALL API operations requiring permission P:
- A user with role R SHALL access the operation IF AND ONLY IF R includes permission P
- A user without permission P SHALL receive a 403 error
- FOR ALL users U and operations O, access(U, O) SHALL be deterministic based on U's role permissions

### Property 13: Payment Retry Consistency

FOR ALL failed payments:
- Retrying a failed payment SHALL create a new payment attempt record
- The original payment record SHALL remain in "Failed" status
- FOR ALL payment P, retry(P) SHALL NOT modify P's status
- A payment SHALL transition to "Completed" only after successful webhook confirmation

### Property 14: Date Range Query Completeness

FOR ALL financial reports with date range [start, end]:
- The report SHALL include all transactions where start ≤ transaction_date ≤ end
- The report SHALL NOT include transactions outside the date range
- FOR ALL transactions T in range, T SHALL appear exactly once in the report
- The sum of report amounts SHALL equal the sum of all transaction amounts in the range

### Property 15: Notification Delivery Guarantee

FOR ALL notification events:
- A notification SHALL be sent to all eligible recipients
- A recipient SHALL receive at most one notification per event
- Failed notification delivery SHALL be retried with exponential backoff
- FOR ALL events E, the number of notifications sent SHALL equal the number of eligible recipients

