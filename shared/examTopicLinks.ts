import { CURRICULUM, type CurriculumExam, type CurriculumTopicDef } from "./curriculum";

// Deneme sonucundaki konu satırı → müfredat konusu köprüsü.
//
// Deneme sonuç belgeleri konuları kazanım düzeyinde ve çoğu zaman birleşik
// yazar ("Parçada Anlam (Ana Düşünce-Yardımcı Düşünce)"), ders olarak da
// "Fen"/"Sosyal" gibi grup adları kullanır. Deneme girişi ve Konu Haritası bu
// ham adlarla aynen çalışmaya devam eder; bu tablo yalnızca "bu deneme
// konusu hangi müfredat konusunun zayıflığına işaret ediyor?" sorusunu
// cevaplar (kitap içeriği önerileri müfredat konusuna bağlı olduğu için).
//
// Buradaki bağlantılar elle, dershane şablonundaki (shared/tytExamTemplate.ts)
// konular için hazırlandı. Karşılığından emin olunmayan satırlar bilerek
// bağlanmadı (EXAM_TOPICS_WITHOUT_LINK) — yanlış bağlantı yanlış zayıflık
// sinyali demektir. Tabloda olmayan ham adlar için sunucu, müfredat
// eşleştiricisini yalnızca yüksek güvenle kullanır (bkz. server/bookContent/examTopicResolver.ts).

export type CurriculumRef = { exam: CurriculumExam; subject: string; topic: string };

/** Karşılaştırma anahtarı: küçük harf, Türkçe karakterler katlanmış, noktalama yok. */
export const examTopicKey = (value: string) =>
  value
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[çğıöşüâîû]/g, (char) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[char] ?? char)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const TR = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Türkçe", topic }));
const MAT = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Matematik", topic }));
const GEO = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Geometri", topic }));
const FIZ = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Fizik", topic }));
const KIM = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Kimya", topic }));
const TAR = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Tarih", topic }));
const COG = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Coğrafya", topic }));
const FEL = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Felsefe", topic }));
const DIN = (...topics: string[]) => topics.map((topic) => ({ exam: "TYT" as const, subject: "Din Kültürü", topic }));

const LINKS: Array<[string, CurriculumRef[]]> = [
  // Türkçe
  ["Cümlede Yorum", TR("Cümlede Anlam")],
  ["Anlamına Göre Sözcükler", TR("Sözcükte Anlam")],
  ["Anlam İlişkisine Göre Sözcükler", TR("Sözcükte Anlam")],
  ["İsim Tamlamaları, Cümlenin Ögeleri (Tamlayıcılar), Fiilimsi Bulma, Sözcük Türleri", TR("İsimler", "Cümlenin Ögeleri", "Fiilimsiler")],
  ["Sıfat Tamlamaları", TR("Sıfatlar")],
  ["Yazım Kuralları", TR("Yazım Kuralları")],
  ["Noktalama İşaretleri", TR("Noktalama İşaretleri")],
  ["Cümlenin Ögeleri (Tamlayıcılar)", TR("Cümlenin Ögeleri")],
  ["Ses Bilgisi", TR("Ses Bilgisi")],
  ["Cümlenin Ögeleri (Temel Ögeler), Cümlenin Ögeleri (Tamlayıcılar), İsim Tamlamaları, Sıfat Tamlamaları", TR("Cümlenin Ögeleri", "İsimler", "Sıfatlar")],
  ["Parçada Anlam (Ana Düşünce-Yardımcı Düşünce)", TR("Paragrafta Konu ve Ana Düşünce", "Paragrafta Yardımcı Düşünce")],
  ["Parçada Konu-Başlık-Soru", TR("Paragrafta Konu ve Ana Düşünce")],
  ["Ek Fiil - Fiilde Yapı, Cümle Türleri (Yapısına Göre Cümleler), Sözcük Türleri, Çekim Ekleri", TR("Ek Fiil", "Cümle Türleri", "Sözcükte Yapı")],
  ["Cümlenin Ögeleri (Temel Ögeler), Cümlenin Ögeleri (Nesne), Cümlenin Ögeleri (Tamlayıcılar)", TR("Cümlenin Ögeleri")],
  ["Ek Fiil - Fiilde Yapı, İsim Tamlamaları, Sözcük Türleri", TR("Ek Fiil", "İsimler")],
  ["Parçada Anlatım", TR("Paragrafta Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları")],
  ["Paragrafta Yapı", TR("Paragrafın Yapısı")],

  // Matematik-1 (sayı/cebir/problem → Matematik; açı/şekil → Geometri)
  ["Fonksiyonda Dört İşlem", MAT("Fonksiyonlar (TYT)")],
  ["Bir Bilinmeyenli Eşitsizlikler", MAT("Basit Eşitsizlikler")],
  ["Mutlak Değerli Eşitsizlikler", MAT("Mutlak Değer")],
  ["Üslü İfadeler", MAT("Üslü Sayılar")],
  ["Faktöriyel", MAT("Permütasyon")],
  ["Sayı Basamakları", MAT("Sayı Basamakları")],
  ["Ondalıklı Sayılar", MAT("Rasyonel Sayılar")],
  ["Tek-Çift Sayılar", MAT("Temel Kavramlar")],
  ["Doğal Sayılar", MAT("Temel Kavramlar")],
  ["Güncel Yüzde Problemleri", MAT("Yüzde Problemleri")],
  ["Kar Zarar Problemleri", MAT("Kâr - Zarar Problemleri")],
  ["Polinomlarda Dört İşlem", MAT("Polinomlar")],
  ["Merkezi Eğilim Ölçüleri", MAT("Veri ve İstatistik")],
  ["Bileşik Önermeler", MAT("Mantık")],
  ["Ardışık Sayılar", MAT("Temel Kavramlar")],
  ["Bölünebilme Kuralları", MAT("Bölme ve Bölünebilme")],
  ["Periyodik Tekrar Eden Durumlar", MAT("Rutin Olmayan Problemler")],
  ["İki Bilinmeyenli Denklemler", MAT("Denklem Çözme")],
  ["Kombinasyon Problemleri", MAT("Kombinasyon")],
  ["Basit Olayların Olasılığı", MAT("Olasılık")],
  ["Güncel Hareket Problemleri", MAT("Hareket Problemleri")],
  ["Güncel Karışım Problemleri", MAT("Karışım Problemleri")],
  ["Orantı Problemleri", MAT("Oran - Orantı")],
  ["Güncel Sayı Problemleri", MAT("Sayı Problemleri")],
  ["Küme Tanımı ve Gösterimi", MAT("Kümeler")],
  ["Tablo Grafik Problemleri", MAT("Tablo ve Grafik Problemleri")],
  ["Güncel Yaş Problemleri", MAT("Yaş Problemleri")],
  ["Paralel İki Doğrunun Kesenle Yaptığı Açılar", GEO("Doğruda ve Üçgende Açılar")],
  ["Doğruda Açılar", GEO("Doğruda ve Üçgende Açılar")],
  ["Üçgende Açılar", GEO("Doğruda ve Üçgende Açılar")],
  ["Küpün Alanı", GEO("Katı Cisimler")],
  ["Düzgün Çokgende Açı", GEO("Çokgenler")],
  ["Dörtgen Özellikleri", GEO("Dörtgenler")],
  ["Karede Uzunluk Özellikleri", GEO("Kare")],
  ["Dik Üçgende Trigonometrik Oranlar", GEO("Dik Üçgen")],
  ["Yamukta Alan Özellikleri", GEO("Yamuk")],
  ["Açılarına Göre Özel Üçgenler", GEO("Dik Üçgen", "İkizkenar ve Eşkenar Üçgen")],

  // Fen — Fizik / Kimya
  ["Ortam Derinliği ile Su Dalgalarının Yayılma Hızı İlişkisi", FIZ("Dalgalar")],
  ["Elektroskop", FIZ("Elektrostatik")],
  ["Cisimlerin Sıvı İçindeki Denge Durumları", FIZ("Basınç ve Kaldırma Kuvveti")],
  ["Işık Şiddeti, Işık Akısı ve Aydınlanma Şiddeti", FIZ("Optik")],
  ["Özkütle, Suyun Genleşmesi", FIZ("Madde ve Özellikleri", "Isı, Sıcaklık ve Genleşme")],
  ["Verim", FIZ("İş, Güç ve Enerji")],
  ["Temel ve Türetilmiş Büyüklükler", FIZ("Fizik Bilimine Giriş")],
  ["Derişik Seyreltik", KIM("Karışımlar")],
  ["Asitlerin ve Bazların Metallerle Tepkimeleri", KIM("Asitler, Bazlar ve Tuzlar")],
  ["Güvenlik İşaretleri", KIM("Kimya Bilimi")],
  ["Element, Bileşik", KIM("Kimya Bilimi")],
  ["Güçlü Etkileşimler Türleri (Kovalent Bağ), Lewis Formülleri", KIM("Kimyasal Türler Arası Etkileşimler")],
  ["Periyodik Özelliklerin Değişimleri", KIM("Atom ve Periyodik Sistem")],
  ["Tepkimeli Miktar Geçiş Problemleri", KIM("Kimyasal Tepkimeler")],

  // Sosyal — Tarih / Coğrafya / Felsefe / Din Kültürü
  ["Toplumsal Alanda Yapılan İnkılaplar", TAR("Atatürkçülük ve Türk İnkılabı")],
  ["Eğitim ve Kültür Alanında Yapılan İnkılaplar", TAR("Atatürkçülük ve Türk İnkılabı")],
  ["Osmanlıda Sanayileşme Çabaları", TAR("Uluslararası İlişkilerde Denge Stratejisi (1774-1914)")],
  ["Büyük Selçuklu Devleti", TAR("İlk Türk-İslam Devletleri")],
  ["Avrasya'da İlk Türk İzleri", TAR("İlk ve Orta Çağlarda Türk Dünyası")],
  ["Afetlerin Dağılışları", COG("Doğal Afetler")],
  ["Yıllık Hareket (Grafikler)", COG("Dünya'nın Şekli ve Hareketleri")],
  ["Türkiye İklimi (Türkiye'de Sıcaklık)", COG("Atmosfer ve İklim")],
  ["Türkiye'deki Göçlerin Sebep ve Sonuçları", COG("Göç")],
  ["Bölge Kavramı ve Türlerinin Sınıflandırılması", COG("Bölgeler")],
  ["20. Yüzyıl Felsefesinin Temel Problemleri ve Bazı Ana Akımları", FEL("Felsefe Tarihi")],
  ["Sanat Nedir?", FEL("Sanat Felsefesi")],
  ["Güzel Nedir?", FEL("Sanat Felsefesi")],
  ["Bilimin Değeri Nedir?", FEL("Bilim Felsefesi")],
  ["Örnek Felsefi Metinlerinden Hareketle 18-19. Yüzyıl Filozoflarının Görüşlerini Analiz Eder", FEL("Felsefe Tarihi")],
  ["MÖ 6. Yüzyıl - MS 2. Yüzyıl Felsefesinin Karakteristik Özelliklerini Açıklar", FEL("Felsefe Tarihi")],
  ["Varlık Felsefesi Nedir?", FEL("Varlık Felsefesi")],
  ["Varlığın Mahiyeti Nedir?", FEL("Varlık Felsefesi")],
  ["Dogmatizm", FEL("Bilgi Felsefesi")],
  ["Hz. Muhammed'in Şahsiyeti", DIN("Hz. Muhammed")],
  ["Allah'ın Varlığı ve Birliği Konusunda Akli ve Nakli Delilleri Analiz Eder", DIN("Allah İnsan İlişkisi")],
  ["İnanç", DIN("Bilgi ve İnanç")],
];

/**
 * Şablonda olup bilerek BAĞLANMAYAN satırlar: müfredattaki karşılığı tek ve
 * net değil. Tahminle bağlamak, öğrenciye yanlış konudan çalışma önerisi
 * üretir; bunlar için kitap önerisi çıkmaz (deneme/Konu Haritası etkilenmez).
 */
export const EXAM_TOPICS_WITHOUT_LINK = ["Varoluşun ve Hayatın Anlamı", "İnsanın Doğası ve Din"];

const bySlugKey = new Map<string, CurriculumTopicDef>(CURRICULUM.map((def) => [`${def.exam}|${def.subject}|${def.topic}`, def]));

export const EXAM_TOPIC_LINKS: Map<string, CurriculumTopicDef[]> = new Map(
  LINKS.map(([raw, refs]) => [
    examTopicKey(raw),
    refs.map((ref) => {
      const def = bySlugKey.get(`${ref.exam}|${ref.subject}|${ref.topic}`);
      if (!def) throw new Error(`examTopicLinks: müfredatta olmayan konu: ${ref.exam} ${ref.subject} ${ref.topic}`);
      return def;
    }),
  ])
);

/**
 * Deneme sonuçlarındaki grup dersini (ve varsa kategoriyi) müfredat derslerine
 * çevirir: "Fen" → Fizik/Kimya/Biyoloji, "Matematik" → Matematik/Geometri.
 */
export function curriculumSubjectsFor(subject: string, category?: string | null): string[] {
  const key = examTopicKey(category || subject);
  if (key.startsWith("fizik")) return ["Fizik"];
  if (key.startsWith("kimya")) return ["Kimya"];
  if (key.startsWith("biyoloji")) return ["Biyoloji"];
  if (key.startsWith("tarih")) return ["Tarih"];
  if (key.startsWith("cografya")) return ["Coğrafya"];
  if (key.startsWith("felsefe") || key.startsWith("mantik") || key.startsWith("psikoloji") || key.startsWith("sosyoloji")) return ["Felsefe"];
  if (key.startsWith("din")) return ["Din Kültürü"];
  if (key.startsWith("geometri")) return ["Geometri"];
  if (key.startsWith("matematik")) return ["Matematik", "Geometri"];
  if (key.startsWith("turkce")) return ["Türkçe"];
  if (key.startsWith("edebiyat") || key.startsWith("turk dili")) return ["Edebiyat"];
  if (key === "fen" || key.startsWith("fen ")) return ["Fizik", "Kimya", "Biyoloji"];
  if (key === "sosyal" || key.startsWith("sosyal ")) return ["Tarih", "Coğrafya", "Felsefe", "Din Kültürü"];
  return [subject];
}
