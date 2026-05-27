import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const src = resolve(root, "node_modules/pretendard/dist/web/static/woff2-dynamic-subset");
const dst = resolve(root, "public/fonts/pretendard");

if (!existsSync(src)) {
  console.warn("[copy-pretendard-fonts] pretendard package not found, skipping");
  process.exit(0);
}

mkdirSync(dst, { recursive: true });

const WEIGHTS = ["Regular", "Bold"];
const pattern = new RegExp(`^Pretendard-(${WEIGHTS.join("|")})\\.subset\\.\\d+\\.woff2$`);
const files = readdirSync(src).filter(f => pattern.test(f));

for (const name of files) {
  cpSync(resolve(src, name), resolve(dst, name));
}
console.log(`[copy-pretendard-fonts] ${files.length} files (${WEIGHTS.join(", ")}) → public/fonts/pretendard/`);
