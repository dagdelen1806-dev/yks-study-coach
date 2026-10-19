/**
 * Abonelik planlarını (fiyat, kademe, deneme) veritabanına yazar — server/subscriptions/seedPlans.ts.
 * Sunucu her açılışta zaten çalıştırır; bu betik, açılıştaki yazma başarısız olduğunda (ör. Vercel
 * soğuk başlangıcında veritabanı bağlantısı zaman aşımına uğradıysa) elle tekrar etmek içindir.
 * Tekrar çalıştırılabilir: var olan planları günceller, çoğaltmaz.
 *
 * Kullanım: DATABASE_URL="<bağlantı>" npx tsx scripts/seed-plans.ts
 */
import { listActivePlans } from "../server/subscriptions/subscriptionDb";
import { seedSubscriptionPlans } from "../server/subscriptions/seedPlans";

await seedSubscriptionPlans();
for (const plan of await listActivePlans()) console.log(plan.code.padEnd(16), plan.tier.padEnd(13), plan.billingPeriod.padEnd(8), plan.price / 100, plan.trialDays);
process.exit(0);
