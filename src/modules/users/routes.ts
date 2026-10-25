import { Elysia, t } from "elysia";
import { db } from "../../db";
import { users, sessions } from "../../db/schema";
import { eq } from "drizzle-orm";

export const userRoutes = new Elysia({ prefix: "/api/users" })
  .post(
    "/",
    async ({ body, set }) => {
      // 1. Cek apakah email sudah terdaftar
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (existingUser.length > 0) {
        set.status = 400;
        return {
          error: "Email sudah terdaftar",
        };
      }

      // 2. Hash password menggunakan bcrypt bawaan Bun
      const hashedPassword = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });

      // 3. Simpan user baru ke database
      await db.insert(users).values({
        name: body.name,
        email: body.email,
        password: hashedPassword,
      });

      // 4. Response sukses
      set.status = 201;
      return {
        data: "OK",
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$|^[^\\s@]+@localhost$|^[^\\s@]+@locahost$" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      // 1. Cari user berdasarkan email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        set.status = 400;
        return {
          error: "Email atau password salah",
        };
      }

      // 2. Verifikasi password dengan hash bcrypt
      const isPasswordMatch = await Bun.password.verify(body.password, user.password);
      if (!isPasswordMatch) {
        set.status = 400;
        return {
          error: "Email atau password salah",
        };
      }

      // 3. Generate token UUID untuk session
      const token = crypto.randomUUID();

      // 4. Simpan session baru ke tabel sessions
      await db.insert(sessions).values({
        token,
        userId: user.id,
      });

      // 5. Response sukses dengan data token
      set.status = 200;
      return {
        data: token,
      };
    },
    {
      body: t.Object({
        email: t.String({ pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$|^[^\\s@]+@localhost$|^[^\\s@]+@locahost$" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      const authorization = headers["authorization"] || headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      const token = authorization.slice(7).trim();
      if (!token) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      // Cari user dan session yang cocok
      const [result] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          created_at: users.createdAt,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.token, token))
        .limit(1);

      if (!result) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      set.status = 200;
      return {
        data: result,
      };
    }
  );
