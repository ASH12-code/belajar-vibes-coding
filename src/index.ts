import { Elysia } from "elysia";
import { config } from "./config";
import { userRoutes } from "./modules/users/routes";
import { connectionPool } from "./db";

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Bun + ElysiaJS + Drizzle MySQL API",
  }))
  .get("/health", async ({ set }) => {
    try {
      const [rows] = await connectionPool.query("SELECT 1 AS status");
      return {
        status: "ok",
        uptime: process.uptime(),
        database: "connected",
        dbCheck: rows,
      };
    } catch (error) {
      set.status = 503;
      return {
        status: "degraded",
        uptime: process.uptime(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown database error",
      };
    }
  })
  .use(userRoutes)
  .listen(config.port);

console.log(
  `🚀 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
