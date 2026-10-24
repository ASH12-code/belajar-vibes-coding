import { test, expect, describe, mock } from "bun:test";
import { Elysia } from "elysia";
import { userRoutes } from "./routes";

describe("User Registration API Unit / Contract Test", () => {
  const app = new Elysia().use(userRoutes);

  test("Validasi input: request body tidak valid harus ditolak", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "bukan-email",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(422);
  });
});
