import { authRouter } from "./auth-router";
import { contentRouter } from "./contentRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;
