import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

/* -------- CMS media: serve uploaded images from the database -------- */
app.get("/api/media/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Bad id" }, 400);
  const { findMediaById } = await import("./queries/content");
  const row = await findMediaById(id);
  if (!row) return c.json({ error: "Not found" }, 404);
  const buf = Buffer.from(row.data, "base64");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

/* -------- CMS media: admin upload (multipart form, field "file") -------- */
app.post("/api/upload", async (c) => {
  const { authenticateRequest } = await import("./session");
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  if (!file.type.startsWith("image/")) return c.json({ error: "Images only" }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ error: "Max 8MB" }, 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const { getDb } = await import("./queries/connection");
  const { media } = await import("@db/schema");
  const [{ id }] = await getDb()
    .insert(media)
    .values({ name: file.name || "upload", mimeType: file.type, data: buf.toString("base64") })
    .$returningId();
  return c.json({ id, url: `/api/media/${id}` });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  const { ensureSchemaAndSeed } = await import("./bootstrap");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  await ensureSchemaAndSeed();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
