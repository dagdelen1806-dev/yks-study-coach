/**
 * Haftalık özet e-postasını GÖNDERMEDEN üretir ve HTML'ini dosyaya yazar (yerel kontrol için).
 * Alıcı koşullarını (doğrulanmış e-posta, son 30 günde giriş, abonelik açık…) aynen uygular.
 *
 * Kullanım (repo kökünden): npx tsx --env-file=.env scripts/preview-weekly-digest.ts <userId> [çıktı.html]
 */
import { writeFileSync } from "node:fs";
import { runWeeklyDigest } from "../server/digest/weeklyDigest";

const [userIdArg, out = "weekly-digest-preview.html"] = process.argv.slice(2);
const userId = Number(userIdArg);
if (!Number.isInteger(userId)) throw new Error("Kullanım: preview-weekly-digest.ts <userId> [çıktı.html]");

const result = await runWeeklyDigest({ appUrl: "http://localhost:3456", dryRun: true, onlyUserIds: [userId], maxPerRun: 100_000 });
const mail = result.previews?.[0];
if (!mail) {
  console.log("Bu kullanıcı şu an alıcı koşullarını karşılamıyor (ya da bu hafta zaten gönderildi).");
  process.exit(0);
}
writeFileSync(out, mail.html);
console.log(`Konu: ${mail.subject}\nHTML: ${out}\n\n${mail.text}`);
process.exit(0);
