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

  test("Validasi input registrasi: nama lebih dari 255 karakter harus ditolak (422)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A".repeat(300),
          email: "valid@localhost",
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

  test("GET /current: tanpa header Authorization harus 401 Unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("GET /current: format header bukan Bearer harus 401 Unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("DELETE /logout: tanpa header Authorization harus 401 Unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("DELETE /logout: format header bukan Bearer harus 401 Unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Basic token-test",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
