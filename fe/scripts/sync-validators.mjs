// Copies the shared zod field validators from the backend (source of truth) into the frontend.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const src = new URL("../../be/src/validators/fields.ts", import.meta.url);
const dest = new URL("../src/schemas/fields.ts", import.meta.url);

if (!existsSync(src)) {
  console.warn("[sync:validators] backend source not found, keeping existing copy");
  process.exit(0);
}
const header = "// AUTO-GENERATED from be/src/validators/fields.ts. Do not edit; run `npm run sync:validators`.\n";
const next = header + readFileSync(src, "utf8");
if (!existsSync(dest) || readFileSync(dest, "utf8") !== next) {
  writeFileSync(dest, next);
  console.log("[sync:validators] src/schemas/fields.ts updated");
}
