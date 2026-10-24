import { Elysia, t } from "elysia";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    return await db.select().from(users);
  })
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
      if (result.length === 0) {
        set.status = 404;
        return { message: "User not found" };
      }
      return result[0];
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const insertResult = await db.insert(users).values({
        name: body.name,
        email: body.email,
      });

      set.status = 201;
      return {
        message: "User created successfully",
        id: insertResult[0].insertId,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
      }),
    }
  );
