// Kurum Paneli KVKK metinleri: öğrenci kuruma katılırken okur ve onaylar.
// Hazır şablon 6698 sayılı KVKK'nın 10. maddesindeki aydınlatma başlıklarını izler;
// hukuki görüş değildir, kurum kendi hukuk danışmanıyla gözden geçirip Ayarlar'dan düzenleyebilir.
// {{...}} alanları kurumun Ayarlar → Kurum bilgileri'ndeki değerlerle doldurulur.

export const KVKK_PLACEHOLDERS = ["KURUM_ADI", "KURUM_ADRESI", "KURUM_EPOSTA", "KURUM_TELEFON"] as const;

export const DEFAULT_KVKK_NOTICE = `KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ

1. Veri sorumlusu
Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla {{KURUM_ADI}} ("Kurum") tarafından hazırlanmıştır. Pusula uygulaması, Kurum adına veri işleyen olarak hizmet verir.

2. İşlenen kişisel veriler
Kuruma katılmanla birlikte Pusula uygulamasındaki şu verilerin Kurum'un yetkili personeli (yönetici, koordinatör ve sana atanan öğretmen) tarafından görüntülenebilir:
- Kimlik: uygulamadaki adın
- Eğitim: sınıf seviyen, puan türün, hedef üniversite ve bölümün, sınav yılın
- Akademik performans: deneme sonuçların (netler, konu bazında doğru/yanlış/boş), konu ilerlemen
- Çalışma düzeni: takvimdeki planın, tamamladığın görevler, çalışma süren ve son etkinlik zamanın
- Kurum içi kayıtlar: öğretmenlerinin sana atadığı görevler ve hakkında yazdığı görüşme notları
Notların, soru defterin, fotoğrafların, ses kayıtların, e-posta adresin ve telefon numaran Kurum ile paylaşılmaz.

3. İşleme amaçları
Verilerin; eğitim ve koçluk hizmetinin yürütülmesi, çalışma planının takibi, akademik gelişiminin izlenmesi, sana uygun görev ve geri bildirim verilmesi ve Kurum içi rehberlik faaliyetlerinin planlanması amaçlarıyla işlenir.

4. Hukuki sebep ve toplama yöntemi
Verilerin, Pusula uygulamasında kendi girdiğin ve uygulamanın ürettiği kayıtlardan elektronik ortamda toplanır. KVKK m.5/2-c (sözleşmenin kurulması ve ifası) ve m.5/2-f (veri sorumlusunun meşru menfaati) ile ayrıca vereceğin açık rızaya dayanılarak işlenir.

5. Aktarım
Verilerin üçüncü kişilere satılmaz ve pazarlama amacıyla kullanılmaz. Hizmetin sunulması için gereken barındırma ve altyapı hizmet sağlayıcılarına, yalnızca bu amaçla sınırlı olarak aktarılabilir; bu sağlayıcıların bir kısmının sunucuları yurt dışında bulunabilir. Yasal zorunluluk hâlinde yetkili kamu kurumlarıyla paylaşılabilir.

6. Saklama süresi
Kurum ile paylaşım, Kurum'dan ayrıldığın anda sona erer; ayrıldıktan sonra Kurum personeli verilerini göremez. Kurum içi işlem kayıtları yasal yükümlülükler için gerekli süre boyunca saklanır.

7. Hakların
KVKK m.11 uyarınca; verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını öğrenme, aktarıldığı kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, itiraz etme ve zarara uğraman hâlinde giderilmesini talep etme haklarına sahipsin. Başvurularını {{KURUM_EPOSTA}} adresine ya da {{KURUM_ADRESI}} adresine yazılı olarak iletebilirsin. Telefon: {{KURUM_TELEFON}}.

18 yaşından küçüksen bu metni velinle birlikte okumanı öneririz.`;

export const DEFAULT_KVKK_CONSENT = `AÇIK RIZA METNİ

{{KURUM_ADI}} tarafından hazırlanan Aydınlatma Metni'ni okudum. Pusula uygulamasındaki deneme sonuçlarımın, konu ilerlememin, çalışma planımın ve hedef bilgilerimin, eğitim ve koçluk hizmeti amacıyla Kurum'un yetkili personeli tarafından görüntülenmesine ve işlenmesine açık rıza veriyorum. Bu rızamı istediğim zaman uygulamadaki "Kurumum" bölümünden kurumdan ayrılarak geri alabileceğimi biliyorum.`;

export type KvkkOrgFields = { name: string; address: string | null; contactEmail: string | null; phone: string | null; city?: string | null; district?: string | null };

/** Şablondaki {{...}} alanlarını kurum bilgileriyle doldurur; boş alanlar okunur bir yer tutucuyla kalır. */
export function renderKvkk(template: string, org: KvkkOrgFields): string {
  const address = [org.address, org.district, org.city].filter(Boolean).join(", ");
  const values: Record<(typeof KVKK_PLACEHOLDERS)[number], string> = {
    KURUM_ADI: org.name,
    KURUM_ADRESI: address || "kurumun adresi",
    KURUM_EPOSTA: org.contactEmail || "kurumun iletişim e-postası",
    KURUM_TELEFON: org.phone || "belirtilmedi",
  };
  return template.replace(/\{\{(KURUM_[A-Z]+)\}\}/g, (match, key: string) => (key in values ? values[key as keyof typeof values] : match));
}

/** Kurumun geçerli metinleri: kendi metni yoksa platform şablonu. */
export function effectiveKvkk(org: KvkkOrgFields & { kvkkNotice: string | null; kvkkConsent: string | null; kvkkVersion: number }) {
  return {
    version: org.kvkkVersion,
    isCustom: Boolean(org.kvkkNotice || org.kvkkConsent),
    notice: renderKvkk(org.kvkkNotice || DEFAULT_KVKK_NOTICE, org),
    consent: renderKvkk(org.kvkkConsent || DEFAULT_KVKK_CONSENT, org),
  };
}
