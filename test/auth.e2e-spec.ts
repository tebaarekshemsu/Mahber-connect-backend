/**
 * Auth E2E / Integration Tests
 *
 * Tests the Auth HTTP endpoints end-to-end using a NestJS test application
 * with mocked external dependencies (PrismaService, ChapaService,
 * FirebaseService).  No real database or Redis instance is required.
 *
 * Covers:
 *  - POST /auth/register  (201 success, 409 duplicate phone, 400 invalid phone)
 *  - POST /auth/login     (200 success, 401 wrong credentials)
 *  - GET  /auth/profile   (200 with valid JWT, 401 without JWT)
 *
 * Requirements: 26.2 (integration tests), 26.7 (E2E critical flows)
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { TestAppHelper, PrismaMock } from './helpers/test-app.helper';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const VALID_PHONE = '+251912345678';
const VALID_PASSWORD = 'Password1';
const VALID_NAME = 'Abebe Kebede';

const REGISTER_PAYLOAD = {
  phone: VALID_PHONE,
  password: VALID_PASSWORD,
  name: VALID_NAME,
};

const MOCK_USER = {
  id: 'user-uuid-001',
  phone: VALID_PHONE,
  name: VALID_NAME,
  password: '', // filled in beforeAll
  email: null,
  bio: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Auth Endpoints (E2E)', () => {
  let app: INestApplication;
  let prismaMock: PrismaMock;

  beforeAll(async () => {
    MOCK_USER.password = await bcrypt.hash(VALID_PASSWORD, 10);
    ({ app, prismaMock } = await TestAppHelper.createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /auth/register
  // -------------------------------------------------------------------------

  describe('POST /auth/register', () => {
    it('201 – registers a new user and returns user data without password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(REGISTER_PAYLOAD)
        .expect(201);

      expect(res.body).toMatchObject({
        id: MOCK_USER.id,
        phone: VALID_PHONE,
        name: VALID_NAME,
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('409 – returns Conflict when phone number is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(REGISTER_PAYLOAD)
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it('400 – returns Bad Request for an invalid phone number format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...REGISTER_PAYLOAD, phone: '0912345678' }) // missing +251 prefix
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('400 – returns Bad Request when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: VALID_PHONE }) // missing password and name
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('400 – returns Bad Request when password does not meet complexity rules', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...REGISTER_PAYLOAD, password: 'weakpassword' }) // no uppercase / digit
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /auth/login
  // -------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    it('200 – returns access_token and user info on valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: VALID_PHONE, password: VALID_PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.user).toMatchObject({
        id: MOCK_USER.id,
        phone: VALID_PHONE,
      });
    });

    it('401 – returns Unauthorized when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: VALID_PHONE, password: VALID_PASSWORD })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('401 – returns Unauthorized when password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: VALID_PHONE, password: 'WrongPass1' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('400 – returns Bad Request for invalid phone format in login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: 'not-a-phone', password: VALID_PASSWORD })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /auth/profile
  // -------------------------------------------------------------------------

  describe('GET /auth/profile', () => {
    let jwtToken: string;

    beforeEach(async () => {
      // Obtain a real JWT by going through the login endpoint
      prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: VALID_PHONE, password: VALID_PASSWORD });

      jwtToken = loginRes.body.access_token;
    });

    it('200 – returns profile for authenticated user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: MOCK_USER.id,
        phone: VALID_PHONE,
        name: VALID_NAME,
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('401 – returns Unauthorized when no JWT is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('401 – returns Unauthorized when JWT is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer this.is.not.a.valid.jwt')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // E2E: Complete registration → login flow  (Requirement 26.7)
  // -------------------------------------------------------------------------

  describe('E2E: User registration and login flow', () => {
    it('registers a user then logs in and accesses profile successfully', async () => {
      // Step 1 – Register
      prismaMock.user.findUnique.mockResolvedValueOnce(null); // no existing user
      prismaMock.user.create.mockResolvedValueOnce(MOCK_USER);

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(REGISTER_PAYLOAD)
        .expect(201);

      expect(registerRes.body.phone).toBe(VALID_PHONE);

      // Step 2 – Login
      prismaMock.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: VALID_PHONE, password: VALID_PASSWORD })
        .expect(200);

      const token = loginRes.body.access_token;
      expect(token).toBeDefined();

      // Step 3 – Access protected profile endpoint
      prismaMock.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const profileRes = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileRes.body.id).toBe(MOCK_USER.id);
      expect(profileRes.body.phone).toBe(VALID_PHONE);
    });
  });
});
