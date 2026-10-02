// cPanel / LiteSpeed (lsnode) startup file.
// lsnode loads this file with require() — it MUST be plain CommonJS:
// no import/export statements, no top-level await. The real app is the
// bundled ESM dist/passenger.js, loaded via dynamic import() below.
const { writeFileSync } = require("node:fs");
const path = require("node:path");

async function main() {
  await import("./dist/passenger.js");
}

main().catch((err) => {
  const msg = err && err.stack ? err.stack : String(err);
  try {
    writeFileSync(path.join(__dirname, "startup-error.log"), msg + "\n");
  } catch {}
  console.error(msg);
  process.exit(1);
});
