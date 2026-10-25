import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { app } from "../src/app";
import { db, connectionPool } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Helper function untuk membersihkan data agar pengujian terisolasi dan konsisten
async function clearDatabase() {
  await db.delete(sessions);
  await db.delete(users);
}

describe("Automated API Tests", () => {
  // 1. Database cleanup sebelum setiap skenario dijalankan
  beforeEach(async () => {
    await clearDatabase();
  });

  // Tutup koneksi database setelah seluruh rangkaian pengujian selesai
  afterAll(async () => {
    await clearDatabase();
    await connectionPool.end();
  });

  // ==========================================
  // A. Root & Utility Endpoints
  // ==========================================
  describe("A. Root & Utility Endpoints", () => {
    test("Skenario 1.1: GET / - Respon sukses mengembalikan HTTP 200 dan pesan selamat datang", async () => {
      const res = await app.handle(new Request("http://localhost/"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        message: "Welcome to Bun + ElysiaJS + Drizzle MySQL API",
      });
    });

    test("Skenario 1.2: GET /health - Respon sukses mengembalikan HTTP 200 dan status database connected", async () => {
      const res = await app.handle(new Request("http://localhost/health"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.database).toBe("connected");
      expect(typeof body.uptime).toBe("number");
    });
  });

  // ==========================================
  // B. Registrasi Pengguna (POST /api/users)
  // ==========================================
  describe("B. Registrasi Pengguna (POST /api/users)", () => {
    test("Skenario 2.1 & 2.2: Registrasi sukses (HTTP 201) dan password tersimpan sebagai hash bcrypt", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi",
            email: "budi@localhost",
            password: "passwordRahasia123",
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({ data: "OK" });

      // Verifikasi di database
      const [savedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "budi@localhost"))
        .limit(1);

      expect(savedUser).toBeDefined();
      expect(savedUser.name).toBe("Budi");
      expect(savedUser.password).not.toBe("passwordRahasia123");
      expect(savedUser.password.startsWith("$2b$") || savedUser.password.startsWith("$2a$")).toBe(true);

      const isPasswordValid = await Bun.password.verify("passwordRahasia123", savedUser.password);
      expect(isPasswordValid).toBe(true);
    });

    test("Skenario 2.3: Registrasi dengan email duplikat mengembalikan HTTP 400", async () => {
      // Registrasi pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi",
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      // Registrasi kedua dengan email sama
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi Lain",
            email: "budi@localhost",
            password: "passwordLain",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Email sudah terdaftar" });
    });

    test("Skenario 2.4: Format email tidak valid mengembalikan HTTP 422", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi",
            email: "bukan-format-email",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("Skenario 2.5: Nama melebihi batas 255 karakter mengembalikan HTTP 422", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "A".repeat(256),
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("Skenario 2.6: Field wajib tidak lengkap (tanpa password) mengembalikan HTTP 422", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi",
            email: "budi@localhost",
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  // ==========================================
  // C. Login Pengguna (POST /api/users/login)
  // ==========================================
  describe("C. Login Pengguna (POST /api/users/login)", () => {
    beforeEach(async () => {
      // Siapkan user untuk pengetesan login
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi Login",
            email: "budi@localhost",
            password: "passwordBenar123",
          }),
        })
      );
    });

    test("Skenario 3.1 & 3.2: Login sukses mengembalikan HTTP 200 dan token tersimpan di sessions", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "budi@localhost",
            password: "passwordBenar123",
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.data).toBe("string");
      expect(body.data.length).toBeGreaterThan(0);

      // Verifikasi token tersimpan di database sessions
      const [savedSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, body.data))
        .limit(1);

      expect(savedSession).toBeDefined();
      expect(savedSession.token).toBe(body.data);
    });

    test("Skenario 3.3: Login dengan email yang tidak terdaftar mengembalikan HTTP 400", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "tidak-ada@localhost",
            password: "passwordBenar123",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Email atau password salah" });
    });

    test("Skenario 3.4: Login dengan password salah mengembalikan HTTP 400", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "budi@localhost",
            password: "passwordSalahTotal",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Email atau password salah" });
    });

    test("Skenario 3.5: Request body tidak lengkap mengembalikan HTTP 422", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "budi@localhost",
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  // ==========================================
  // D. Get Current User (GET /api/users/current)
  // ==========================================
  describe("D. Get Current User (GET /api/users/current)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Registrasi dan login user untuk mendapatkan token valid
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi Sesi",
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      const loginBody = await loginRes.json();
      validToken = loginBody.data;
    });

    test("Skenario 4.1 & 4.2: Berhasil mengambil profil user (HTTP 200) tanpa mengekspos password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe("Budi Sesi");
      expect(body.data.email).toBe("budi@localhost");
      expect(body.data.created_at).toBeDefined();
      expect("password" in body.data).toBe(false);
    });

    test("Skenario 4.3: Request tanpa header Authorization mengembalikan HTTP 401", async () => {
      const res = await app.handle(new Request("http://localhost/api/users/current"));
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    test("Skenario 4.4: Format header bukan Bearer mengembalikan HTTP 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          headers: {
            Authorization: `Basic ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    test("Skenario 4.5: Token palsu / tidak terdaftar mengembalikan HTTP 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          headers: {
            Authorization: "Bearer token-palsu-acak-123",
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });

  // ==========================================
  // E. Logout Pengguna (DELETE /api/users/logout)
  // ==========================================
  describe("E. Logout Pengguna (DELETE /api/users/logout)", () => {
    let validToken: string;

    beforeEach(async () => {
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Budi Logout",
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "budi@localhost",
            password: "password123",
          }),
        })
      );

      const loginBody = await loginRes.json();
      validToken = loginBody.data;
    });

    test("Skenario 5.1, 5.2, 5.3: Logout sukses menghapus sesi dan menginvalidasi token", async () => {
      // 1. Logout
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: "OK" });

      // 2. Verifikasi token terhapus dari tabel sessions
      const [sessionInDb] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, validToken))
        .limit(1);

      expect(sessionInDb).toBeUndefined();

      // 3. Verifikasi token tidak bisa dipakai lagi untuk GET /current
      const currentRes = await app.handle(
        new Request("http://localhost/api/users/current", {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(currentRes.status).toBe(401);

      // 4. Verifikasi logout ulang dengan token yang sama ditolak (401)
      const logoutAgainRes = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(logoutAgainRes.status).toBe(401);
    });

    test("Skenario 5.4: Logout tanpa header Authorization mengembalikan HTTP 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    test("Skenario 5.5: Logout dengan token palsu mengembalikan HTTP 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer token-palsu-12345",
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });
});
