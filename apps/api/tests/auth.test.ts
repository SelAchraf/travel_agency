import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";

describe("Phase 1A: Authentication, RBAC & Audit Integration Tests", () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("POST /api/v1/auth/login", () => {
    it("successfully logs in with valid credentials and sets secure cookies", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@numidiavoyages.dz",
          password: "PasswordSecure2026!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe("admin@numidiavoyages.dz");
      expect(res.body.user.role).toBe("owner");
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.permissions).toBeInstanceOf(Array);
      expect(res.body.permissions).toContain("users:manage");

      // Verify httpOnly cookies
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes("accessToken=") && c.includes("HttpOnly"))).toBe(true);
      expect(cookies.some((c: string) => c.includes("refreshToken=") && c.includes("HttpOnly"))).toBe(true);
    });

    it("rejects login with unknown email with generic message", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@numidiavoyages.dz",
          password: "PasswordSecure2026!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects login with wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "editor@numidiavoyages.dz",
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("triggers progressive lockout after 5 failed login attempts", async () => {
      const testEmail = "finance@numidiavoyages.dz";

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post("/api/v1/auth/login")
          .send({ email: testEmail, password: "IncorrectPassword!" });
        expect(res.status).toBe(401);
      }

      // 5th failed attempt triggers lockout (HTTP 423 Locked)
      const lockedRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testEmail, password: "IncorrectPassword!" });

      expect(lockedRes.status).toBe(423);
      const errorMsg = typeof lockedRes.body.error === "string" ? lockedRes.body.error : lockedRes.body.error.message;
      expect(errorMsg).toMatch(/verrouill|locked/i);

      // Even correct password is now blocked while locked
      const blockedRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testEmail, password: "PasswordSecure2026!" });

      expect(blockedRes.status).toBe(423);
    });
  });

  describe("Token Refresh & Reuse Detection", () => {
    it("successfully refreshes access token and rotates refresh token", async () => {
      // 1. Login as manager
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "manager@numidiavoyages.dz",
          password: "PasswordSecure2026!",
        });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers["set-cookie"] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
      expect(refreshCookie).toBeDefined();

      // 2. Call /refresh with the cookie
      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", [refreshCookie!])
        .send();

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();

      const newCookies = refreshRes.headers["set-cookie"] as unknown as string[];
      const newRefreshCookie = newCookies.find((c: string) => c.startsWith("refreshToken="));
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie).not.toBe(refreshCookie);

      // 3. REUSE DETECTION: Re-using the old refresh cookie MUST be rejected
      const reuseRes = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", [refreshCookie!])
        .send();

      expect(reuseRes.status).toBe(403);
    });
  });

  describe("GET /api/v1/auth/me & Logout", () => {
    it("returns profile and permissions for authenticated user", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "agent@numidiavoyages.dz",
          password: "PasswordSecure2026!",
        });

      const token = loginRes.body.accessToken;

      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe("agent@numidiavoyages.dz");
      expect(meRes.body.user.role).toBe("reservation_agent");
      expect(meRes.body.permissions).toContain("reservations:read");
      expect(meRes.body.permissions).not.toContain("users:manage");
    });

    it("logs out and clears cookies", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "agent@numidiavoyages.dz",
          password: "PasswordSecure2026!",
        });

      const token = loginRes.body.accessToken;
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });
  });

  describe("Password Reset Flow", () => {
    it("executes complete password reset cycle with hashed single-use token", async () => {
      // 1. Request reset
      const forgotRes = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "editor@numidiavoyages.dz" });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      const resetToken = forgotRes.body.resetToken;
      expect(resetToken).toBeDefined();

      // 2. Reset password with new valid password
      const newPassword = "BrandNewPassword2026!";
      const resetRes = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken,
          newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Login with new password succeeds
      const newLoginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "editor@numidiavoyages.dz",
          password: newPassword,
        });

      expect(newLoginRes.status).toBe(200);

      // 4. Token cannot be reused (single-use)
      const reuseTokenRes = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken,
          newPassword: "AnotherPassword123!",
        });

      expect(reuseTokenRes.status).toBe(400);
    });
  });

  describe("RBAC Enforcement & Staff Management (/api/v1/admin/users)", () => {
    let adminToken: string;
    let editorToken: string;

    beforeAll(async () => {
      const adminLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@numidiavoyages.dz", password: "PasswordSecure2026!" });
      adminToken = adminLogin.body.accessToken;

      const editorLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "editor@numidiavoyages.dz", password: "BrandNewPassword2026!" });
      editorToken = editorLogin.body.accessToken;
    });

    it("rejects unauthenticated access with 401", async () => {
      const res = await request(app).get("/api/v1/admin/users");
      expect(res.status).toBe(401);
    });

    it("rejects unauthorized role with 403 Forbidden (content_editor lacks users:manage)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      const errorMsg = typeof res.body.error === "string" ? res.body.error : res.body.error.message;
      expect(errorMsg).toMatch(/permissions insuffisantes|insufficient/i);
    });

    it("allows authorized role (owner) to list users", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(4);
    });

    it("allows creating a new staff user and enforces password hashing and role validation", async () => {
      const newStaff = {
        email: "new.agent@numidiavoyages.dz",
        password: "NewAgentSecure2026!",
        fullName: "Karim Saidi",
        phone: "+213559998877",
        role: "reservation_agent",
      };

      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newStaff);

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(newStaff.email);
      expect(res.body.user.role).toBe("reservation_agent");
      expect(res.body.user.passwordHash).toBeUndefined(); // Never leak password hash!
    });

    it("immediately cuts access when user is deactivated", async () => {
      // 1. Create and log in as temporary user
      await request(app)
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "temp.agent@numidiavoyages.dz",
          password: "TempPassword2026!",
          fullName: "Temp Agent",
          phone: "+213551122334",
          role: "reservation_agent",
        });

      const tempLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "temp.agent@numidiavoyages.dz", password: "TempPassword2026!" });

      const tempToken = tempLogin.body.accessToken;
      const tempUserId = tempLogin.body.user.id;

      // Verify temp agent can access /me
      const checkRes1 = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tempToken}`);
      expect(checkRes1.status).toBe(200);

      // 2. Admin deactivates temp agent
      const deactRes = await request(app)
        .patch(`/api/v1/admin/users/${tempUserId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deactRes.status).toBe(200);

      // 3. Temp agent is IMMEDIATELY cut off (even with still-valid JWT)
      const checkRes2 = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tempToken}`);
      expect(checkRes2.status).toBe(401);
      const errorMsg = typeof checkRes2.body.error === "string" ? checkRes2.body.error : checkRes2.body.error.message;
      expect(errorMsg).toMatch(/désactivé|deactivated/i);
    });
  });

  describe("Append-Only AuditLog Verification (/api/v1/admin/audit-logs)", () => {
    let adminToken: string;

    beforeAll(async () => {
      const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@numidiavoyages.dz", password: "PasswordSecure2026!" });
      adminToken = login.body.accessToken;
    });

    it("allows authorized role to query append-only audit trail", async () => {
      const res = await request(app)
        .get("/api/v1/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs).toBeInstanceOf(Array);
      expect(res.body.logs.length).toBeGreaterThan(0);

      // Verify audit entries exist for actions taken during tests
      const actions = res.body.logs.map((l: any) => l.action);
      expect(actions).toContain("LOGIN_SUCCESS");
      expect(actions).toContain("LOGIN_FAILED");
      expect(actions).toContain("ACCOUNT_LOCKED");
      expect(actions).toContain("USER_CREATE");
      expect(actions).toContain("USER_DEACTIVATE");
    });
  });
});
