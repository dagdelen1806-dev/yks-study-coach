// Tek seferlik: MySQL'in `result[0].insertId` kalıbını PostgreSQL'in `.returning({ id })` kalıbına çevirir.
//   const result = await db.insert(t).values(...);   →  const result = await db.insert(t).values(...).returning({ id: t.id });
//   Number(result[0].insertId)                       →  Number(result[0].id)
// Kullanım: node scripts/pg-migration/convert-insert-id.mjs <dosya>...
import fs from "node:fs";

let failed = false;
for (const file of process.argv.slice(2)) {
  let src = fs.readFileSync(file, "utf8");
  const vars = [...new Set([...src.matchAll(/(\w+)\[0\]\.insertId/g)].map((m) => m[1]))];
  for (const name of vars) {
    // Bu değişkeni üreten insert ifadeleri (aynı ad dosyada birden çok kez kullanılabilir).
    const decl = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*await\\s+(\\w+)\\.insert\\((\\w+)\\)`, "g");
    const inserts = [...src.matchAll(decl)];
    if (!inserts.length) { console.error(`${file}: '${name}' için insert bulunamadı`); failed = true; continue; }
    // Sondan başa düzenle ki önceki indeksler kaymasın.
    for (const match of inserts.reverse()) {
      const table = match[2];
      let depth = 0, end = -1;
      for (let i = match.index; i < src.length; i++) {
        const ch = src[i];
        if (ch === "(" || ch === "{" || ch === "[") depth++;
        else if (ch === ")" || ch === "}" || ch === "]") depth--;
        else if (ch === ";" && depth === 0) { end = i; break; }
      }
      if (end < 0) { console.error(`${file}: '${name}' ifadesinin sonu bulunamadı`); failed = true; continue; }
      const statement = src.slice(match.index, end);
      if (statement.includes(".returning(")) continue;
      src = src.slice(0, end) + `.returning({ id: ${table}.id })` + src.slice(end);
    }
    src = src.replace(new RegExp(`\\b${name}\\[0\\]\\.insertId`, "g"), `${name}[0].id`);
    console.log(`${file}: ${name} (${inserts.length} insert)`);
  }
  fs.writeFileSync(file, src);
}
if (failed) process.exit(1);
