/**
 * cPanel (Phusion Passenger) entry point.
 *
 * Passenger hands the app a listen target via process.env.PORT — usually a
 * numeric port, on some hosts a Unix socket path. We handle both.
 * Setting PASSENGER=1 before importing ./boot disables boot.ts's own
 * server startup so we stay in control of the listener here.
 */
process.env.PASSENGER = "1";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const { default: app } = await import("./boot");
const { ensureSchemaAndSeed } = await import("./bootstrap");
const { createServer } = await import("node:http");
const { getRequestListener } = await import("@hono/node-server");

await ensureSchemaAndSeed();

const target = process.env.PORT || "3000";
const server = createServer(getRequestListener(app.fetch));

if (/^\d+$/.test(target)) {
  server.listen(parseInt(target), () => {
    console.log(`OllJira API (Passenger) listening on port ${target}`);
  });
} else {
  // Unix socket path (some Passenger setups)
  server.listen(target, () => {
    console.log(`OllJira API (Passenger) listening on socket ${target}`);
  });
}
