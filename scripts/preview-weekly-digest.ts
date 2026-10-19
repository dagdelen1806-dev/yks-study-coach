/**
 * Haftalık özet e-postasını GÖNDERMEDEN üretir ve HTML'ini dosyaya yazar (yerel kontrol için).
 * Alıcı koşullarını (doğrulanmış e-posta, abonelik açık, bu hafta gönderilmemiş…) aynen uygular.
 *
 * Kullanım (repo kökünden):
 *   npx tsx --env-file=.env scripts/preview-weekly-digest.ts <userId> [çıktı.html]          öğrenci özeti
 *   npx tsx --env-file=.env scripts/preview-weekly-digest.ts --staff <üyelikId> [çıktı.html] personel (sınıf) özeti
 */
import { writeFileSync } from "node:fs";
import { runTeacherDigest } from "../server/digest/teacherDigest";
import { runWeeklyDigest } from "../server/digest/weeklyDigest";

const args = process.argv.slice(2);
const staff = args[0] === "--staff";
const [idArg, out = "weekly-digest-preview.html"] = staff ? args.slice(1) : args;
const id = Number(idArg);
if (!Number.isInteger(id)) throw new Error("Kullanım: preview-weekly-digest.ts [--staff] <id> [çıktı.html]");

const appUrl = "http://localhost:3456";
const result = staff
  ? await runTeacherDigest({ appUrl, dryRun: true, onlyMemberIds: [id], maxPerRun: 100_000 })
  : await runWeeklyDigest({ appUrl, dryRun: true, onlyUserIds: [id], maxPerRun: 100_000 });
const mail = result.previews?.[0];
if (!mail) {
  console.log("Bu alıcı şu an koşulları karşılamıyor (ya da bu hafta zaten gönderildi / görebildiği öğrenci yok).");
  process.exit(0);
}
writeFileSync(out, mail.html);
console.log(`Konu: ${mail.subject}\nHTML: ${out}\n\n${mail.text}`);
process.exit(0);
