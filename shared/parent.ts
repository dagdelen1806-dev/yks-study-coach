// Veli erişimi: öğrenci kod üretir → veli kodu girer (ve rıza metnini onaylar) → öğrenci isteği
// onaylar → veli öğrencinin ÖZETİNİ salt okunur görür. Saf kurallar (sunucu, istemci ve test).
//
// Veli şunları görür: çalışma süresi, takvim ve plan uyumu (yarım kalan oturumlar dahil),
// denemeler ve netler (LGS'de tahmini puan), zayıf konular, hedef bilgisi.
// Hiçbir zaman görmez: notlar, soru defteri, fotoğraflar, ses kayıtları, öğretmen notları,
// öğrencinin iletişim bilgileri.

export const PARENT_LINK_STATUSES = ["invited", "pending", "active", "revoked"] as const;
export type ParentLinkStatus = (typeof PARENT_LINK_STATUSES)[number];

/** Bir öğrenciye aynı anda en fazla bu kadar veli bağlanabilir (bekleyen + aktif). */
export const MAX_PARENTS_PER_STUDENT = 3;
/** Kullanılmamış veli kodunun ömrü. */
export const PARENT_INVITE_DAYS = 7;

export type ParentLinkState = { status: ParentLinkStatus; expiresAt: Date | string; parentUserId: number | null };

/** Veli bu kodu kullanabilir mi? Kullanamıyorsa nedeni (Türkçe), kullanabiliyorsa null. */
export function parentInviteProblem(link: ParentLinkState | null | undefined, now = new Date()): string | null {
  if (!link) return "Bu kod geçerli değil. Öğrencinin verdiği kodu kontrol eder misin?";
  if (link.status === "revoked") return "Bu kod iptal edilmiş. Öğrenciden yeni bir kod isteyebilirsin.";
  if (link.status !== "invited" || link.parentUserId !== null) return "Bu kod daha önce kullanılmış. Öğrenciden yeni bir kod isteyebilirsin.";
  if (new Date(link.expiresAt).getTime() <= now.getTime()) return "Bu kodun süresi dolmuş. Öğrenciden yeni bir kod isteyebilirsin.";
  return null;
}

/** Veli bu öğrencinin verisini görebilir mi? Yalnızca öğrencinin onayladığı (aktif) bağlantıda. */
export const parentCanView = (link: { status: ParentLinkStatus } | null | undefined) => link?.status === "active";

/** Veli bağlantısı açık rıza metni. TASLAK: hukuk kontrolünden geçmedi; yayından önce gözden geçirilmeli. */
export const PARENT_CONSENT_VERSION = 1;
export const PARENT_CONSENT_TEXT = `VELİ ERİŞİMİ AÇIK RIZA METNİ (TASLAK)

Bu kodu girerek, kodu bana veren öğrencinin velisi ya da yasal temsilcisi olduğumu beyan ederim.

Öğrenci isteğimi onayladığında Pusula uygulamasında şu bilgileri salt okunur olarak görebileceğimi biliyorum: sınavı ve hedefi, sınıfı, çalışma süresi, takvimdeki planı ve plan uyumu, deneme sonuçları ve konu ilerlemesi. Öğrencinin notlarını, soru defterini, fotoğraflarını, ses kayıtlarını ve iletişim bilgilerini göremem.

Bu bilgilerin yalnızca öğrencinin eğitimini desteklemek amacıyla kullanılacağını, üçüncü kişilerle paylaşılmayacağını ve öğrencinin ya da benim bu erişimi istediğimiz an sonlandırabileceğimizi kabul ediyorum. Haftalık özet e-postasını istediğim an kapatabilirim.

6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki haklarım (bilgi talep etme, düzeltme, silme vb.) için Pusula ile iletişime geçebilirim.`;
