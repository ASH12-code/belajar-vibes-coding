import { Elysia, t } from "elysia";
import { db } from "../../db";
import { users } from "../../db/schema";
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
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  );
