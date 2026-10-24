import { test, expect, describe } from "bun:test";
import { Elysia } from "elysia";
import { userRoutes } from "./routes";

describe("User Routes API Unit / Contract Test", () => {
  const app = new Elysia().use(userRoutes);

  test("Validasi input registrasi: request body tidak valid harus ditolak", async () => {
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

  test("Validasi input login: request body tanpa password harus ditolak", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
        }),
      })
    );

    expect(res.status).toBe(422);
  });
});
