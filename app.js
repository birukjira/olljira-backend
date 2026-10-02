// cPanel "Setup Node.js App" startup file.
// Loads the bundled API; any boot crash is written to startup-error.log
// so it can be read from cPanel File Manager (Passenger hides stderr).
import { writeFileSync } from "node:fs";

try {
  await import("./dist/passenger.js");
} catch (err) {
  const msg = err && err.stack ? err.stack : String(err);
  try {
    writeFileSync(new URL("./startup-error.log", import.meta.url), msg + "\n");
  } catch {}
  console.error(msg);
  throw err;
}
