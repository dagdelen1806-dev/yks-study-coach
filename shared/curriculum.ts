// YKS müfredatı (ÖSYM/MEB konu listesi esas alınarak): ders → ünite → konu.
//
// Tek kaynak `yks_topics` tablosudur; bu dosya yalnızca oraya idempotent
// olarak yüklenen tohum veridir (bkz. server/db.ts ensureCurriculumSeeded).
// Paralel bir konu sistemi değildir:
//  - Her konunun kalıcı bir `slug`'ı var; ID'ler slug üzerinden bulunur.
//  - Eskiden var olan eşdeğer konular (`legacySlug`) yeniden kullanılır —
//    aynı konu ikinci kez oluşturulmaz, mevcut ilerleme kayıtları korunur.
//  - `aliases`: kitap içindekilerinde / deneme belgelerinde aynı konu için
//    sık görülen başka adlar. Eşleştirme (server/bookContent/curriculumMatcher.ts)
//    bunları "alias match" adımında kullanır; yeni konu ASLA otomatik oluşmaz.

export type CurriculumExam = "TYT" | "AYT";

export type CurriculumTopicDef = {
  slug: string;
  exam: CurriculumExam;
  subject: string;
  unit: string;
  topic: string;
  aliases: string[];
};

type TopicEntry = string | { topic: string; aliases?: string[]; legacySlug?: string };
type SubjectTree = Record<string, TopicEntry[]>;

const TYT: Record<string, SubjectTree> = {
  Türkçe: {
    "Sözcük ve Cümle Anlamı": [
      { topic: "Sözcükte Anlam", aliases: ["sözcük anlamı", "söz öbeklerinde anlam", "deyim ve atasözleri"] },
      { topic: "Cümlede Anlam", aliases: ["cümle anlamı", "cümle yorumu"] },
    ],
    Paragraf: [
      { topic: "Paragrafta Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları", aliases: ["paragrafta anlatım", "parçada anlatım", "anlatım biçimleri", "anlatım teknikleri", "düşünceyi geliştirme yolları"] },
      { topic: "Paragrafta Konu ve Ana Düşünce", aliases: ["paragrafta konu", "paragrafta ana düşünce", "ana düşünce", "ana fikir", "parçada konu", "konu başlık soru"] },
      { topic: "Paragrafta Yardımcı Düşünce", aliases: ["yardımcı düşünce", "yardımcı fikir", "parçada yardımcı düşünce"] },
      { topic: "Paragrafın Yapısı", aliases: ["paragrafta yapı", "paragrafın akışı", "akışı bozan cümle", "paragraf oluşturma", "cümle yerleştirme", "giriş gelişme sonuç"] },
      { topic: "Paragrafta Anlam ve Yorum", legacySlug: "tyt-tr-paragraf", aliases: ["paragrafta anlam", "parçada anlam", "kişi özellikleri", "paragrafı parçalara bölerek anlama", "parçalara bölerek anlama", "yeni nesil anlam", "metin yorumlama", "paragraftan çıkarım"] },
    ],
    "Dil Bilgisi": [
      "Ses Bilgisi",
      { topic: "Yazım Kuralları", aliases: ["imla kuralları"] },
      { topic: "Noktalama İşaretleri", aliases: ["noktalama"] },
      { topic: "Sözcükte Yapı", aliases: ["kök ve ekler", "yapım ekleri", "çekim ekleri"] },
      { topic: "İsimler", aliases: ["adlar", "isim tamlamaları"] },
      { topic: "Sıfatlar", aliases: ["önadlar", "sıfat tamlamaları"] },
      { topic: "Zamirler", aliases: ["adıllar"] },
      { topic: "Zarflar", aliases: ["belirteçler"] },
      { topic: "Edat, Bağlaç ve Ünlem", aliases: ["edatlar", "bağlaçlar", "ünlemler"] },
      { topic: "Fiiller", aliases: ["fiilde anlam", "fiil kip ve kişi", "kip ve kişi ekleri"] },
      { topic: "Ek Fiil", aliases: ["ek eylem"] },
      { topic: "Fiilimsiler", aliases: ["eylemsiler", "fiilimsi"] },
      { topic: "Fiilde Çatı", aliases: ["eylemde çatı", "çatı"] },
      { topic: "Cümlenin Ögeleri", aliases: ["cümle ögeleri", "öğeler"] },
      { topic: "Cümle Türleri", aliases: ["cümle çeşitleri"] },
      { topic: "Anlatım Bozuklukları", aliases: ["anlatım bozukluğu"] },
    ],
  },
  Matematik: {
    "Sayılar": [
      // Başlangıç kitapları konuları daha ince böler ("Toplama ve Çıkarma İşlemi", "Ondalık Gösterim"…); takma adlar onları doğru üst konuya bağlar.
      { topic: "Temel Kavramlar", aliases: ["toplama ve çıkarma işlemi", "çarpma ve bölme işlemi", "dört işlem", "işlem önceliği", "sayı kümeleri", "sayılar"] }, "Sayı Basamakları", { topic: "Bölme ve Bölünebilme", aliases: ["bölünebilme kuralları"] }, { topic: "EBOB - EKOK", aliases: ["ebob ekok", "obeb okek"] },
      { topic: "Rasyonel Sayılar", aliases: ["ondalık gösterim", "ondalık sayılar", "kesirler", "kesirli sayılar"] }, "Basit Eşitsizlikler", "Mutlak Değer", { topic: "Üslü Sayılar", aliases: ["üslü ifadeler"] }, { topic: "Köklü Sayılar", aliases: ["köklü ifadeler"] }, "Çarpanlara Ayırma", { topic: "Oran - Orantı", aliases: ["oran orantı", "oran ve orantı"] },
      { topic: "Denklem Çözme", aliases: ["basit denklem çözümü", "birinci dereceden denklemler", "rasyonel denklemlerin çözümü", "iki bilinmeyenli denklemler", "harfli ifadeler", "cebirsel ifadeler"] },
    ],
    Problemler: [
      "Sayı Problemleri", "Kesir Problemleri", "Yaş Problemleri", "Yüzde Problemleri", { topic: "Kâr - Zarar Problemleri", aliases: ["kar zarar problemleri"] }, "Karışım Problemleri",
      "Hareket Problemleri", "İşçi Problemleri", { topic: "Tablo ve Grafik Problemleri", aliases: ["grafik problemleri"] }, { topic: "Rutin Olmayan Problemler", aliases: ["yeni nesil problemler", "mantıksal akıl yürütme"] },
    ],
    "Cebir ve Veri": [
      "Kümeler", "Mantık", { topic: "Fonksiyonlar (TYT)", aliases: ["fonksiyon"] }, "Polinomlar", { topic: "İkinci Dereceden Denklemler", aliases: ["2. dereceden denklemler"] },
      "Permütasyon", "Kombinasyon", "Olasılık", { topic: "Veri ve İstatistik", aliases: ["istatistik", "veri analizi"] },
    ],
  },
  Geometri: {
    "Üçgenler": [
      { topic: "Doğruda ve Üçgende Açılar", aliases: ["üçgende açılar", "doğruda açılar"] }, "Dik Üçgen", "İkizkenar ve Eşkenar Üçgen", "Üçgende Alan", "Üçgende Benzerlik", "Açıortay", "Kenarortay",
    ],
    "Çokgenler ve Dörtgenler": ["Çokgenler", "Dörtgenler", "Yamuk", "Paralelkenar", "Eşkenar Dörtgen", "Dikdörtgen", "Kare"],
    "Çember ve Analitik": ["Çember ve Daire", { topic: "Noktanın ve Doğrunun Analitiği", aliases: ["analitik geometri"] }, "Katı Cisimler"],
  },
  Fizik: {
    "Fizik": [
      "Fizik Bilimine Giriş", "Madde ve Özellikleri", "Hareket ve Kuvvet", "İş, Güç ve Enerji", { topic: "Isı, Sıcaklık ve Genleşme", aliases: ["ısı ve sıcaklık"] },
      "Elektrostatik", { topic: "Elektrik Akımı ve Devreler", aliases: ["elektrik devreleri", "elektrik akımı"] }, "Manyetizma", { topic: "Basınç ve Kaldırma Kuvveti", aliases: ["basınç", "kaldırma kuvveti"] }, "Dalgalar", "Optik",
    ],
  },
  Kimya: {
    "Kimya": [
      "Kimya Bilimi", { topic: "Atom ve Periyodik Sistem", aliases: ["periyodik sistem", "atom modelleri"] }, "Kimyasal Türler Arası Etkileşimler", "Maddenin Halleri", "Doğa ve Kimya",
      "Kimyanın Temel Kanunları", "Mol Kavramı", "Kimyasal Tepkimeler", "Karışımlar", { topic: "Asitler, Bazlar ve Tuzlar", aliases: ["asit baz tuz"] }, "Kimya Her Yerde",
    ],
  },
  Biyoloji: {
    "Biyoloji": [
      "Canlıların Ortak Özellikleri", "Canlıların Temel Bileşenleri", { topic: "Hücre ve Organeller", aliases: ["hücre"] }, "Hücre Zarından Madde Geçişi", "Canlıların Sınıflandırılması",
      { topic: "Hücre Bölünmeleri", aliases: ["mitoz", "mayoz", "mitoz ve mayoz"] }, { topic: "Kalıtım", aliases: ["kalıtımın genel ilkeleri"] }, "Ekosistem Ekolojisi", "Güncel Çevre Sorunları",
    ],
  },
  Tarih: {
    "Tarih": [
      "Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "İlk Türk-İslam Devletleri",
      "Selçuklu Türkiyesi", "Beylikten Devlete Osmanlı", "Dünya Gücü Osmanlı", "Değişen Dünya Dengeleri Karşısında Osmanlı", "Uluslararası İlişkilerde Denge Stratejisi (1774-1914)",
      "XX. Yüzyıl Başlarında Osmanlı ve Dünya", { topic: "Milli Mücadele", aliases: ["kurtuluş savaşı"] }, { topic: "Atatürkçülük ve Türk İnkılabı", aliases: ["atatürk ilke ve inkılapları", "inkılap tarihi"] },
    ],
  },
  Coğrafya: {
    "Coğrafya": [
      "Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum", "Harita Bilgisi", { topic: "Atmosfer ve İklim", aliases: ["iklim bilgisi"] }, "İç ve Dış Kuvvetler",
      "Su, Toprak ve Bitkiler", "Nüfus", "Göç", "Yerleşme", "Ekonomik Faaliyetler", "Bölgeler", "Uluslararası Ulaşım Hatları", "Doğal Afetler", "Çevre ve Toplum",
    ],
  },
  Felsefe: {
    "Felsefe": [
      "Felsefeye Giriş", "Bilgi Felsefesi", "Varlık Felsefesi", "Ahlak Felsefesi", "Sanat Felsefesi", "Din Felsefesi", "Siyaset Felsefesi", "Bilim Felsefesi",
      { topic: "Felsefe Tarihi", aliases: ["mö 6 yüzyıl ms 2 yüzyıl felsefesi", "ms 2 yüzyıl ms 15 yüzyıl felsefesi", "15 17 yüzyıl felsefesi", "18 19 yüzyıl felsefesi", "20 yüzyıl felsefesi"] },
    ],
  },
  "Din Kültürü": {
    "Din Kültürü": ["Bilgi ve İnanç", "Din ve İslam", "İslam ve İbadet", "Gençlik ve Değerler", "Allah İnsan İlişkisi", "Hz. Muhammed", "Vahiy ve Akıl", "İslam Düşüncesinde Yorumlar"],
  },
};

const AYT: Record<string, SubjectTree> = {
  Matematik: {
    "Cebir": [
      { topic: "Fonksiyonlar", legacySlug: "ayt-mat-fonksiyon", aliases: ["fonksiyon"] }, "Polinomlar", { topic: "İkinci Dereceden Denklemler ve Eşitsizlikler", aliases: ["eşitsizlikler"] }, "Parabol",
      "Karmaşık Sayılar", "Logaritma", "Diziler", { topic: "Permütasyon, Kombinasyon ve Binom", aliases: ["binom"] }, "Olasılık",
    ],
    "Trigonometri": ["Trigonometri"],
    "Analiz": [{ topic: "Limit ve Süreklilik", aliases: ["limit"] }, "Türev", { topic: "İntegral", legacySlug: "ayt-mat-integral" }],
  },
  Geometri: {
    "Geometri": ["Dönüşüm Geometrisi", { topic: "Doğrunun Analitik İncelenmesi", aliases: ["analitik geometri"] }, "Çemberin Analitik İncelenmesi", "Çember ve Daire", "Katı Cisimler"],
  },
  Fizik: {
    "Mekanik": [
      "Vektörler", "Bağıl Hareket", "Newton'un Hareket Yasaları", "Bir Boyutta Sabit İvmeli Hareket", "Atışlar", { topic: "İş, Enerji ve Momentum", aliases: ["itme ve momentum"] },
      "Tork ve Denge", "Kütle Merkezi", "Basit Makineler", { topic: "Çembersel Hareket", aliases: ["düzgün çembersel hareket"] }, "Basit Harmonik Hareket",
    ],
    "Elektrik ve Manyetizma": [
      "Elektrik Alan ve Potansiyel", { topic: "Paralel Levhalar ve Sığa", aliases: ["sığaçlar"] }, { topic: "Manyetizma ve Elektromanyetik İndüksiyon", aliases: ["indüksiyon"] }, "Alternatif Akım ve Transformatörler",
    ],
    "Dalgalar ve Modern Fizik": ["Dalga Mekaniği", "Atom Fiziği ve Radyoaktivite", "Modern Fizik"],
  },
  Kimya: {
    "Kimya": [
      "Modern Atom Teorisi", "Gazlar", { topic: "Sıvı Çözeltiler ve Çözünürlük", aliases: ["çözeltiler"] }, "Kimyasal Tepkimelerde Enerji", "Kimyasal Tepkimelerde Hız", "Kimyasal Denge",
      "Asit-Baz Dengesi", "Çözünürlük Dengesi", { topic: "Kimya ve Elektrik", aliases: ["elektrokimya"] }, "Karbon Kimyasına Giriş", "Organik Bileşikler", "Enerji Kaynakları ve Bilimsel Gelişmeler",
    ],
  },
  Biyoloji: {
    "İnsan Fizyolojisi": [
      "Sinir Sistemi", { topic: "Endokrin Sistem", aliases: ["hormonlar"] }, "Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım ve Bağışıklık Sistemi",
      "Solunum Sistemi", "Boşaltım Sistemi", "Üreme Sistemi ve Embriyonik Gelişim",
    ],
    "Genetik ve Enerji": [
      "Nükleik Asitler ve Genetik Şifre", "Protein Sentezi", { topic: "Canlılık ve Enerji", aliases: ["fotosentez", "hücresel solunum", "kemosentez"] }, "Bitki Biyolojisi",
    ],
    "Ekoloji": ["Komünite ve Popülasyon Ekolojisi", "Canlılar ve Çevre"],
  },
  Edebiyat: {
    "Edebiyat Bilgisi": ["Güzel Sanatlar ve Edebiyat", "Metinlerin Sınıflandırılması", { topic: "Şiir Bilgisi", aliases: ["nazım birimi", "ölçü", "uyak", "redif"] }, "Edebi Sanatlar", "Edebi Akımlar"],
    "Türk Edebiyatı Dönemleri": [
      "İslamiyet Öncesi Türk Edebiyatı", "Geçiş Dönemi Türk Edebiyatı", { topic: "Divan Edebiyatı", aliases: ["klasik türk edebiyatı"] }, "Halk Edebiyatı", "Tanzimat Edebiyatı",
      "Servet-i Fünun Edebiyatı", "Fecr-i Ati Edebiyatı", "Milli Edebiyat", "Cumhuriyet Dönemi Türk Edebiyatı", "Dünya Edebiyatı",
    ],
  },
  Tarih: {
    "Tarih": [
      "Osmanlı Kültür ve Medeniyeti", "XX. Yüzyılda Dünya", "İkinci Dünya Savaşı", "Soğuk Savaş Dönemi", "Yumuşama Dönemi ve Sonrası", "Küreselleşen Dünya", "Türk Dış Politikası",
    ],
  },
  Coğrafya: {
    "Coğrafya": ["Ekosistem", "Nüfus Politikaları", "Türkiye'de Ekonomi", "Türkiye'nin İşlevsel Bölgeleri", "Küresel Ticaret", "Ülkeler ve Bölgeler", "Çevre Sorunları"],
  },
  Felsefe: {
    "Felsefe Grubu": ["Mantık", "Psikoloji", "Sosyoloji"],
  },
};

// Slug'lar sabit olmalı (ID eşlemesi buna dayanıyor) — Türkçe karakterler
// katlanır, ardışık ayraçlar tekilleşir.
const slugPart = (value: string) =>
  value
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[çğıöşüâîû]/g, (char) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function flatten(exam: CurriculumExam, tree: Record<string, SubjectTree>): CurriculumTopicDef[] {
  return Object.entries(tree).flatMap(([subject, units]) =>
    Object.entries(units).flatMap(([unit, entries]) =>
      entries.map((entry) => {
        const def = typeof entry === "string" ? { topic: entry } : entry;
        return {
          slug: def.legacySlug ?? `cur-${exam.toLowerCase()}-${slugPart(subject)}-${slugPart(def.topic)}`.slice(0, 120),
          exam,
          subject,
          unit,
          topic: def.topic,
          aliases: def.aliases ?? [],
        };
      })
    )
  );
}

export const CURRICULUM: CurriculumTopicDef[] = [...flatten("TYT", TYT), ...flatten("AYT", AYT)];

/** Müfredattan gelip öğrenci henüz hiç çalışmadığı için konu listelerinde
 * gösterilmeyecek konuları ayırt etmek için (bkz. server/db.ts getUserTopicProgress). */
export const isCurriculumOnlySlug = (slug: string) => slug.startsWith("cur-");
