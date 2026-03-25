## Plan: Functional Requirements for NestJS Backend

This document outlines the functional requirements for the backend of the Final Year Project, built using NestJS.

### Functional Requirements

#### 1. **User Authentication and Authorization**

- **Features**:
  - User registration with email and password.
  - User login with JWT-based authentication.
  - Role-based access control (e.g., Admin, User).
- **Endpoints**:
  - `POST /auth/register` - Register a new user.
  - `POST /auth/login` - Authenticate a user and return a JWT.
  - `GET /auth/profile` - Retrieve the authenticated user's profile.

#### 2. **Database Management**

- **Features**:
  - Integration with PostgreSQL using TypeORM or Prisma.
  - Database schema for users, roles, and other entities.
  - Migrations for schema updates.
- **Entities**:
  - **User**: `id`, `name`, `email`, `password`, `roleId`.
  - **Role**: `id`, `name`.

#### 3. **API Endpoints**

- **Features**:
  - RESTful API endpoints for CRUD operations.
  - Modular structure with controllers and services.
- **Examples**:
  - `GET /items` - Fetch all items.
  - `POST /items` - Create a new item.
  - `PUT /items/:id` - Update an item.
  - `DELETE /items/:id` - Delete an item.

#### 4. **Environment Configuration**

- **Features**:
  - Use `dotenv` for managing environment variables.
  - Configuration for development and production environments.
- **Variables**:
  - `DATABASE_URL` - Connection string for the database.
  - `JWT_SECRET` - Secret key for JWT authentication.
  - `PORT` - Port number for the application.

#### 5. **Error Handling**

- **Features**:
  - Centralized error handling middleware.
  - Custom error messages for validation and server errors.

#### 6. **Testing**

- **Features**:
  - Unit tests for services and controllers using Jest.
  - Integration tests for API endpoints.

#### 7. **Documentation**

- **Features**:
  - API documentation using Swagger.
  - Include endpoint descriptions and request/response examples.

#### 8. **Deployment**

- **Features**:
  - Dockerize the application for deployment.
  - CI/CD pipeline for automated testing and deployment.

#### 9. **User Management**

- **Features**:
  - Update user profile (e.g., name, email, password).
  - View user details (admin-only).
  - Deactivate or delete user accounts.
- **Endpoints**:
  - `PUT /users/:id` - Update user details.
  - `GET /users/:id` - Fetch user details.
  - `DELETE /users/:id` - Deactivate or delete a user.

#### 10. **File Uploads**

- **Features**:
  - Upload files (e.g., images, documents).
  - Validate file types and sizes.
  - Store files in cloud storage (e.g., AWS S3) or locally.
- **Endpoints**:
  - `POST /files/upload` - Upload a file.
  - `GET /files/:id` - Fetch a file.

#### 11. **Notifications**

- **Features**:
  - Send email notifications (e.g., registration confirmation, password reset).
  - Push notifications for real-time updates.
- **Endpoints**:
  - `POST /notifications/send` - Send a notification.

---

This document serves as a blueprint for the backend development process. Each requirement should be implemented and verified systematically to ensure the backend meets the project goals.

### Implementation Plan

#### 1. **User Authentication and Authorization**

- **Step 1**: Set up the `AuthModule` in NestJS.
- **Step 2**: Implement user registration and login endpoints.
- **Step 3**: Integrate JWT for authentication and role-based access control.
- **Step 4**: Write unit tests for authentication services and controllers.

#### 2. **Database Management**

- **Step 1**: Configure PostgreSQL database connection using TypeORM or Prisma.
- **Step 2**: Define entities for `User` and `Role`.
- **Step 3**: Create and run database migrations.
- **Step 4**: Seed the database with initial roles and admin user.

#### 3. **API Endpoints**

- **Step 1**: Create modules, controllers, and services for each resource (e.g., `Items`).
- **Step 2**: Implement CRUD operations for each resource.
- **Step 3**: Write integration tests for API endpoints.

#### 4. **Environment Configuration**

- **Step 1**: Install and configure `dotenv` for environment variable management.
- **Step 2**: Set up `.env` files for development and production environments.
- **Step 3**: Validate environment variables using `class-validator` or a similar library.

#### 5. **Error Handling**

- **Step 1**: Implement a global exception filter for centralized error handling.
- **Step 2**: Define custom error classes for validation and server errors.
- **Step 3**: Test error handling with edge cases.

#### 6. **Testing**

- **Step 1**: Set up Jest for unit and integration testing.
- **Step 2**: Write unit tests for services and controllers.
- **Step 3**: Write integration tests for API endpoints.
- **Step 4**: Ensure test coverage meets project standards.

#### 7. **Documentation**

- **Step 1**: Install and configure Swagger for API documentation.
- **Step 2**: Document all endpoints with request/response examples.
- **Step 3**: Generate and verify Swagger documentation.

#### 8. **Deployment**

- **Step 1**: Create a Dockerfile and docker-compose configuration for the application.
- **Step 2**: Set up a CI/CD pipeline for automated testing and deployment.
- **Step 3**: Deploy the application to a cloud platform (e.g., AWS, Heroku, or Azure).

#### 9. **User Management**

- **Step 1**: Create `UserController` and `UserService` for user management.
- **Step 2**: Implement endpoints for updating, viewing, and deleting users.
- **Step 3**: Add role-based access control for admin-only actions.
- **Step 4**: Write unit and integration tests for user management.

#### 10. **File Uploads**

- **Step 1**: Install and configure `multer` for file uploads.
- **Step 2**: Validate file types and sizes in the upload endpoint.
- **Step 3**: Integrate cloud storage (e.g., AWS S3) or local storage.
- **Step 4**: Write tests for file upload functionality.

#### 11. **Notifications**

- **Step 1**: Set up email service (e.g., Nodemailer) for email notifications.
- **Step 2**: Implement push notifications using a library like `socket.io`.
- **Step 3**: Create endpoints for sending and fetching notifications.
- **Step 4**: Write tests for notification services.

#### 12. **Search and Filtering**

- **Step 1**: Implement search functionality using query parameters.
- **Step 2**: Add filtering options for resources.
- **Step 3**: Optimize database queries for performance.
- **Step 4**: Write tests for search and filtering endpoints.

#### 13. **Analytics and Reporting**

- **Step 1**: Define analytics metrics and reporting requirements.
- **Step 2**: Implement endpoints for fetching analytics data.
- **Step 3**: Generate reports in desired formats (e.g., PDF, CSV).
- **Step 4**: Write tests for analytics and reporting features.

#### 14. **Advanced Role Management**

- **Step 1**: Create `RoleController` and `RoleService` for role management.
- **Step 2**: Implement endpoints for creating, updating, and fetching roles.
- **Step 3**: Integrate role-based access control with dynamic permissions.
- **Step 4**: Write tests for role management functionality.

#### 15. **Real-Time Features**

- **Step 1**: Set up WebSocket communication using `socket.io`.
- **Step 2**: Implement real-time updates for chat and notifications.
- **Step 3**: Test WebSocket connections and real-time features.

#### 16. **Audit Logs**

- **Step 1**: Implement middleware for logging user actions.
- **Step 2**: Store logs in the database with timestamps.
- **Step 3**: Create endpoints for fetching audit logs.
- **Step 4**: Write tests for audit log functionality.

---

This implementation plan provides a step-by-step guide to develop the backend systematically, ensuring all functional requirements are met efficiently.

### Complete API Route Specification

#### 1. Authentication & User Profile Module

- **`POST /api/auth/register`**: Registers a new user with their phone number and legal name.
- **`POST /api/auth/login`**: Authenticates the user and returns a JWT for session management.
- **`GET /api/users/profile`**: Retrieves the authenticated user's profile and their joined Mahbers.
- **`POST /api/users/fcm-token`**: Stores the Firebase Cloud Messaging token for push notifications.

#### 2. Mahber Governance & Configurable Roles

- **`POST /api/mahbers/create`**: Creates a Mahber with contribution intervals, join fees, and public/private status.
- **`PATCH /api/mahbers/config`**: Updates group settings (penalty rates, grace periods, and auto-invalidation limits).
- **`POST /api/roles/define`**: Defines custom roles and assigns granular permissions (e.g., "Can scan QR").
- **`PATCH /api/roles/assign`**: Assigns a defined role to a specific member.

#### 3. Intelligent Membership Workflow

- **`POST /api/mahbers/join`**: Submits a request to join. Public Mahbers go to Payment_Required; Private go to Pending_Approval.
- **`POST /api/admin/approve`**: Admin approves a request. System sets an expiry_at timestamp for the join fee payment.
- **`GET /api/members/status`**: Checks if a user's join request has expired or is awaiting payment.
- **`DELETE /api/members/remove`**: Revokes membership (Soft delete to preserve historical ledger data).

#### 4. Financial Ledger, Automation & Chapa Integration

- **`POST /api/payments/init`**: Requests a Chapa checkout URL for join fees, contributions, or fines.
- **`GET /api/payments/verify`**: Webhook/Callback handler that confirms payment and updates member status to 'Active'.
- **`GET /api/finance/ledger`**: Returns a transparent view of all group contributions and payouts.
- **`POST /api/finance/fines`**: Automatically issues fines for late payments based on the grace period config.
- **`POST /api/equb/draw`**: Runs the lottery algorithm for the current cycle among eligible (paid) members.

#### 5. Event Management & QR Attendance

- **`POST /api/events/create`**: Schedules an event. Defines if it is mandatory (absence results in auto-fines).
- **`GET /api/events/qr/gen`**: Generates a time-sensitive, encrypted QR code for a member's check-in.
- **`POST /api/events/qr/scan`**: Admin scans member QR. Verifies identity and logs "Present" status in the database.
- **`POST /api/events/gallery`**: Allows members to upload photos after an event is marked "Finished."
- **`POST /api/events/lottery`**: Runs a special lottery for organizers/attendees of a specific event.

#### 6. Communication & Decision Making

- **`POST /api/broadcasts`**: Sends a formal announcement to all Mahber members via push/SMS.
- **`GET/POST /api/chat/messages`**: Retrieves or sends real-time group messages.
- **`POST /api/votes/init`**: Creates a formal poll (e.g., changing the monthly contribution amount).
- **`POST /api/votes/cast`**: Records a member's vote and calculates real-time results.

---

This API specification integrates all functional requirements, including advanced automation, governance, and event management features. Let me know if further refinements are needed.
