import { app } from "./app";
import { config } from "./config";

app.listen(config.port);

console.log(
  `🚀 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export { app };
export type { App } from "./app";
