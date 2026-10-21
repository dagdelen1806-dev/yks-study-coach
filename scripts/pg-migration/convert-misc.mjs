// Tek seferlik: MySQL'in büyük/küçük harfe duyarsız karşılaştırma ve sayım alışkanlıklarını PostgreSQL'e taşır.
//   like(...)            → ilike(...)        MySQL varsayılan harmanlaması büyük/küçük harfe duyarsızdır; PG'de LIKE duyarlıdır.
//   sql<number>`COUNT(*)` → `COUNT(*)::int`  PG COUNT bigint döner, postgres.js bunu metin olarak verir.
//   sql<number>`...SUM(...)...` → .mapWith(Number)  PG SUM numeric döner (metin).
// Kullanım: node scripts/pg-migration/convert-misc.mjs
import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("git ls-files server scripts", { encoding: "utf8" }).split("\n").filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
let total = 0;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  let out = src;
  if (/\blike\(/.test(out)) {
    out = out.replace(/\blike\(/g, "ilike(").replace(/(import \{[^}]*)\blike\b([^}]*\} from "drizzle-orm";)/, "$1ilike$2");
  }
  out = out.replace(/sql<number>`(COUNT|count)\(\*\)`/g, "sql<number>`$1(*)::int`");
  out = out.replace(/(sql<number>`[^`]*\b(?:SUM|sum)\([^`]*`)(?!\.mapWith)/g, "$1.mapWith(Number)");
  if (out !== src) { fs.writeFileSync(file, out); total++; console.log(file); }
}
console.log(`${total} dosya`);
