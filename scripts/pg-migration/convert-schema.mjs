// Tek seferlik: drizzle/schema.ts (mysql-core) → PostgreSQL (pg-core).
// Kullanım: node scripts/pg-migration/convert-schema.mjs
// Kurallar:
//   int(...).autoincrement()      → integer(...).generatedByDefaultAsIdentity()  (veri taşırken eski id'ler korunur)
//   int / mediumtext / mysqlTable → integer / text / pgTable
//   mysqlEnum("c", [...])         → text("c", { enum: [...] })  (TS tipi aynı kalır; PG'de ayrı ENUM tipi açılmaz)
//   timestamp("c")                → timestamp("c", { withTimezone: true })  (MySQL TIMESTAMP gibi UTC anı saklar)
//   .onUpdateNow()                → .$onUpdate(() => new Date())
//   mediumblob customType         → bytea
import fs from "node:fs";

const file = "drizzle/schema.ts";
let src = fs.readFileSync(file, "utf8");
const before = src;

const replaceAll = (pattern, replacement, label, { min = 1 } = {}) => {
  const count = (src.match(pattern) || []).length;
  if (count < min) { console.error(`eşleşme yok: ${label}`); process.exit(1); }
  src = src.replace(pattern, replacement);
  console.log(`${label}: ${count}`);
};

replaceAll(
  /^import \{[^}]*\} from "drizzle-orm\/mysql-core";/m,
  'import { customType, decimal, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";',
  "import",
);
replaceAll(/\bint\(("[^"]+")\)\.autoincrement\(\)\.primaryKey\(\)/g, "integer($1).primaryKey().generatedByDefaultAsIdentity()", "id kolonları");
replaceAll(/\bint\(/g, "integer(", "int");
replaceAll(/\bmediumtext\(/g, "text(", "mediumtext");
replaceAll(/\bmysqlTable\(/g, "pgTable(", "tablo");
replaceAll(/\bmysqlEnum\(("[^"]+"),\s*(\[[^\]]*\])\)/g, "text($1, { enum: $2 })", "enum");
replaceAll(/\btimestamp\(("[^"]+")\)/g, "timestamp($1, { withTimezone: true })", "timestamp");
replaceAll(/\.onUpdateNow\(\)/g, ".$onUpdate(() => new Date())", "onUpdateNow");
replaceAll(/dataType: \(\) => "mediumblob"/g, 'dataType: () => "bytea"', "blob");

for (const leftover of ["mysql", "autoincrement", "mediumtext", "onUpdateNow"]) {
  if (new RegExp(`\\b${leftover}`, "i").test(src.replace(/\/\/.*$/gm, ""))) { console.error(`dönüşmemiş ifade kaldı: ${leftover}`); process.exit(1); }
}
if (src === before) { console.error("değişiklik yok"); process.exit(1); }
fs.writeFileSync(file, src);
console.log("tamam");
