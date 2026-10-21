// YKS (ÖSYM/MEB) ve LGS (MEB 8. sınıf) müfredatı: sınav → ders → ünite → konu.
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

import type { ExamKind } from "./exams";

export type CurriculumExam = ExamKind;

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

// LGS: MEB 8. sınıf öğretim programı ünite/konu başlıkları (ders adları shared/exams.ts ile aynı).
const LGS: Record<string, SubjectTree> = {
  Türkçe: {
    "Sözcük ve Cümle Anlamı": [
      { topic: "Sözcükte Anlam", aliases: ["sözcük anlamı", "deyimler ve atasözleri", "deyim ve atasözleri"] },
      { topic: "Cümlede Anlam", aliases: ["cümle anlamı", "cümle yorumu", "neden sonuç amaç sonuç koşul"] },
      { topic: "Söz Sanatları", aliases: ["söz sanatı", "benzetme", "kişileştirme", "abartma"] },
    ],
    Paragraf: [
      { topic: "Paragrafta Konu ve Ana Düşünce", aliases: ["paragrafta konu", "ana düşünce", "ana fikir"] },
      { topic: "Paragrafta Yardımcı Düşünce", aliases: ["yardımcı düşünce", "yardımcı fikir"] },
      { topic: "Paragrafın Yapısı", aliases: ["paragrafta yapı", "akışı bozan cümle", "paragraf oluşturma"] },
      { topic: "Metin Türleri ve Anlatım Biçimleri", aliases: ["metin türleri", "anlatım biçimleri", "düşünceyi geliştirme yolları"] },
      { topic: "Görsel ve Grafik Okuma", aliases: ["görsel okuma", "grafik yorumlama", "tablo okuma"] },
      { topic: "Sözel Mantık", aliases: ["sözel mantık soruları", "mantık muhakeme"] },
    ],
    "Dil Bilgisi": [
      { topic: "Fiilimsiler", aliases: ["eylemsiler", "isim fiil", "sıfat fiil", "zarf fiil"] },
      { topic: "Cümlenin Ögeleri", aliases: ["cümle ögeleri", "öğeler"] },
      { topic: "Fiilde Çatı", aliases: ["fiillerde çatı", "eylemde çatı"] },
      { topic: "Cümle Türleri", aliases: ["cümle çeşitleri", "anlamına göre cümleler", "yapısına göre cümleler"] },
      { topic: "Yazım Kuralları", aliases: ["imla kuralları"] },
      { topic: "Noktalama İşaretleri", aliases: ["noktalama"] },
      { topic: "Anlatım Bozuklukları", aliases: ["anlatım bozukluğu"] },
    ],
  },
  Matematik: {
    "Sayılar ve İşlemler": [
      { topic: "Çarpanlar ve Katlar", aliases: ["ebob ekok", "asal çarpanlar", "aralarında asal"] },
      { topic: "Üslü İfadeler", aliases: ["üslü sayılar", "bilimsel gösterim"] },
      { topic: "Kareköklü İfadeler", aliases: ["karekök", "köklü ifadeler", "köklü sayılar"] },
    ],
    "Veri ve Olasılık": [
      { topic: "Veri Analizi", aliases: ["grafikler", "çizgi grafiği", "sütun grafiği"] },
      { topic: "Basit Olayların Olma Olasılığı", aliases: ["olasılık"] },
    ],
    "Cebir": [
      { topic: "Cebirsel İfadeler ve Özdeşlikler", aliases: ["özdeşlikler", "çarpanlara ayırma", "cebirsel ifadeler"] },
      { topic: "Doğrusal Denklemler", aliases: ["denklemler", "eğim", "doğru grafiği"] },
      { topic: "Eşitsizlikler", aliases: ["doğrusal eşitsizlikler"] },
    ],
    "Geometri ve Ölçme": [
      { topic: "Üçgenler", aliases: ["pisagor bağıntısı", "üçgen eşitsizliği", "kenarortay açıortay yükseklik"] },
      { topic: "Eşlik ve Benzerlik", aliases: ["benzerlik", "eşlik"] },
      { topic: "Dönüşüm Geometrisi", aliases: ["öteleme", "yansıma", "öteleme ve yansıma"] },
      { topic: "Geometrik Cisimler", aliases: ["prizmalar", "silindir", "piramit", "koni"] },
    ],
  },
  "Fen Bilimleri": {
    "Fen Bilimleri": [
      { topic: "Mevsimler ve İklim", aliases: ["mevsimlerin oluşumu", "iklim ve hava hareketleri"] },
      { topic: "DNA ve Genetik Kod", aliases: ["dna", "kalıtım", "mutasyon ve modifikasyon", "adaptasyon", "biyoteknoloji"] },
      { topic: "Basınç", aliases: ["katı basıncı", "sıvı basıncı", "gaz basıncı"] },
      { topic: "Madde ve Endüstri", aliases: ["periyodik sistem", "kimyasal tepkimeler", "asitler ve bazlar", "fiziksel ve kimyasal değişimler"] },
      { topic: "Basit Makineler", aliases: ["kaldıraç", "makara", "eğik düzlem"] },
      { topic: "Enerji Dönüşümleri ve Çevre Bilimi", aliases: ["besin zinciri", "fotosentez", "solunum", "madde döngüleri"] },
      { topic: "Elektrik Yükleri ve Elektrik Enerjisi", aliases: ["elektriklenme", "elektrik enerjisi"] },
    ],
  },
  "İnkılap Tarihi": {
    "T.C. İnkılap Tarihi ve Atatürkçülük": [
      { topic: "Bir Kahraman Doğuyor", aliases: ["avrupa'daki gelişmeler", "mustafa kemal'in çocukluğu"] },
      { topic: "Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar", aliases: ["milli uyanış", "birinci dünya savaşı", "mondros", "kongreler"] },
      { topic: "Millî Bir Destan: Ya İstiklal Ya Ölüm!", aliases: ["milli bir destan", "kurtuluş savaşı", "milli mücadele", "cepheler"] },
      { topic: "Atatürkçülük ve Çağdaşlaşan Türkiye", aliases: ["atatürk ilkeleri", "inkılaplar", "çağdaşlaşan türkiye"] },
      { topic: "Demokratikleşme Çabaları", aliases: ["çok partili hayat", "demokratikleşme"] },
      { topic: "Atatürk Dönemi Türk Dış Politikası", aliases: ["dış politika"] },
      { topic: "Atatürk'ün Ölümü ve Sonrası", aliases: ["atatürk'ün ölümü", "ikinci dünya savaşı"] },
    ],
  },
  "Din Kültürü": {
    "Din Kültürü ve Ahlak Bilgisi": [
      { topic: "Kader İnancı", aliases: ["kader ve kaza"] },
      { topic: "Zekât ve Sadaka", aliases: ["zekat", "sadaka", "infak"] },
      { topic: "Din ve Hayat", aliases: ["din ve aile", "din ve çevre"] },
      { topic: "Hz. Muhammed'in Örnekliği", aliases: ["peygamberimizin örnekliği"] },
      { topic: "Kur'an-ı Kerim ve Özellikleri", aliases: ["kuran'ın ana konuları"] },
    ],
  },
  İngilizce: {
    "English": [
      "Friendship", "Teen Life", "In the Kitchen", "On the Phone", "The Internet", "Adventures", "Tourism", "Chores", "Science", "Natural Forces",
    ],
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

// KPSS Genel Yetenek–Genel Kültür: ÖSYM kapsamındaki yaygın konu başlıkları (ders adları shared/exams.ts ile aynı).
const KPSS_GYGK: Record<string, SubjectTree> = {
  Türkçe: {
    "Sözcük ve Cümle Anlamı": [
      { topic: "Sözcükte Anlam", aliases: ["sözcük anlamı", "deyim ve atasözleri"] },
      { topic: "Cümlede Anlam", aliases: ["cümle anlamı", "cümle yorumu"] },
    ],
    Paragraf: [
      { topic: "Paragrafta Anlam", aliases: ["paragraf", "paragrafta ana düşünce", "paragrafta yardımcı düşünce", "paragrafın yapısı", "anlatım biçimleri"] },
    ],
    "Dil Bilgisi": [
      "Ses Bilgisi",
      { topic: "Yapı Bilgisi", aliases: ["sözcükte yapı", "kök ve ekler"] },
      { topic: "Sözcük Türleri", aliases: ["isimler", "sıfatlar", "zamirler", "zarflar", "edat bağlaç ünlem", "fiiller", "fiilimsiler"] },
      { topic: "Cümle Bilgisi", aliases: ["cümlenin ögeleri", "cümle türleri", "cümle çeşitleri"] },
      { topic: "Yazım Kuralları", aliases: ["imla kuralları"] },
      { topic: "Noktalama İşaretleri", aliases: ["noktalama"] },
      { topic: "Anlatım Bozuklukları", aliases: ["anlatım bozukluğu"] },
    ],
    "Sözel Mantık": [{ topic: "Sözel Mantık", aliases: ["sözel akıl yürütme"] }],
  },
  Matematik: {
    "Temel Matematik": [
      { topic: "Temel Kavramlar", aliases: ["sayılar", "dört işlem"] }, "Sayı Basamakları", { topic: "Bölme ve Bölünebilme", aliases: ["bölünebilme kuralları"] },
      { topic: "EBOB - EKOK", aliases: ["ebob ekok", "obeb okek"] }, { topic: "Rasyonel ve Ondalık Sayılar", aliases: ["rasyonel sayılar", "ondalık sayılar", "kesirler"] },
      "Basit Eşitsizlikler", "Mutlak Değer", { topic: "Üslü Sayılar", aliases: ["üslü ifadeler"] }, { topic: "Köklü Sayılar", aliases: ["köklü ifadeler"] },
      "Çarpanlara Ayırma", { topic: "Oran - Orantı", aliases: ["oran orantı"] }, { topic: "Denklem Çözme", aliases: ["birinci dereceden denklemler"] },
    ],
    Problemler: [
      "Sayı Problemleri", "Kesir Problemleri", "Yaş Problemleri", "İşçi Problemleri", "Hareket Problemleri",
      { topic: "Yüzde, Kâr - Zarar Problemleri", aliases: ["yüzde problemleri", "kar zarar problemleri"] }, "Karışım Problemleri",
      { topic: "Tablo ve Grafik Yorumlama", aliases: ["grafik problemleri", "tablo grafik"] },
    ],
    "Cebir ve Sayma": ["Kümeler", "Fonksiyonlar", { topic: "Permütasyon, Kombinasyon ve Olasılık", aliases: ["permütasyon", "kombinasyon", "olasılık"] }],
    "Sayısal Mantık": [{ topic: "Sayısal Mantık", aliases: ["sayısal akıl yürütme", "mantık muhakeme"] }],
    Geometri: [
      { topic: "Açılar ve Üçgenler", aliases: ["üçgenler", "açılar", "üçgende alan"] }, { topic: "Dörtgenler ve Çokgenler", aliases: ["dörtgenler", "çokgenler"] },
      { topic: "Çember ve Daire", aliases: ["çember", "daire"] }, { topic: "Analitik Geometri", aliases: ["noktanın analitiği", "doğrunun analitiği"] }, "Katı Cisimler",
    ],
  },
  Tarih: {
    "Türk Tarihi": [
      { topic: "İslamiyet Öncesi Türk Tarihi", aliases: ["ilk türk devletleri"] }, { topic: "İlk Türk-İslam Devletleri", aliases: ["türk islam devletleri"] },
      { topic: "Osmanlı Devleti Kuruluş ve Yükselme", aliases: ["osmanlı kuruluş", "osmanlı yükselme"] }, { topic: "Osmanlı Kültür ve Medeniyeti", aliases: ["osmanlı kültür"] },
      { topic: "Osmanlı Duraklama, Gerileme ve Dağılma", aliases: ["osmanlı duraklama", "osmanlı gerileme", "osmanlı dağılma"] }, "XX. Yüzyıl Başlarında Osmanlı",
    ],
    "İnkılap Tarihi": [
      { topic: "Kurtuluş Savaşı Hazırlık Dönemi", aliases: ["milli mücadele hazırlık", "kongreler"] }, { topic: "Kurtuluş Savaşı Cepheleri", aliases: ["cepheler", "milli mücadele"] },
      { topic: "Atatürk İlke ve İnkılapları", aliases: ["inkılaplar", "atatürk ilkeleri"] }, { topic: "Atatürk Dönemi İç ve Dış Politika", aliases: ["atatürk dönemi dış politika"] },
      { topic: "Çağdaş Türk ve Dünya Tarihi", aliases: ["çağdaş türk tarihi", "yakın dönem"] },
    ],
  },
  Coğrafya: {
    "Türkiye Coğrafyası": [
      { topic: "Türkiye'nin Coğrafi Konumu", aliases: ["coğrafi konum"] }, { topic: "Türkiye'nin Yer Şekilleri", aliases: ["yer şekilleri"] },
      { topic: "İklim ve Bitki Örtüsü", aliases: ["iklim", "bitki örtüsü"] }, { topic: "Nüfus ve Yerleşme", aliases: ["nüfus", "yerleşme"] },
      { topic: "Tarım, Hayvancılık ve Ormancılık", aliases: ["tarım", "hayvancılık"] }, { topic: "Madenler ve Enerji Kaynakları", aliases: ["madenler", "enerji kaynakları"] },
      "Sanayi", { topic: "Ulaşım, Ticaret ve Turizm", aliases: ["ulaşım", "ticaret", "turizm"] }, { topic: "Türkiye'nin Bölgeleri", aliases: ["bölgeler", "bölgesel kalkınma projeleri"] },
    ],
  },
  Vatandaşlık: {
    "Hukuk ve Anayasa": [
      { topic: "Temel Hukuk Kavramları", aliases: ["hukukun temel kavramları"] }, { topic: "Anayasa Hukuku ve 1982 Anayasası", aliases: ["1982 anayasası", "anayasa hukuku"] },
      { topic: "Temel Hak ve Özgürlükler", aliases: ["temel haklar"] }, { topic: "Yasama", aliases: ["tbmm"] }, { topic: "Yürütme", aliases: ["cumhurbaşkanı"] }, "Yargı",
      { topic: "İdare Hukuku", aliases: ["idari teşkilat"] }, { topic: "Uluslararası Kuruluşlar", aliases: ["uluslararası örgütler"] },
    ],
  },
  "Güncel Bilgiler": {
    "Güncel Bilgiler": [{ topic: "Güncel Bilgiler", aliases: ["güncel olaylar", "kültürel ve bilimsel gelişmeler"] }],
  },
};

// DGS: sayısal ve sözel bölüm (ders adları shared/exams.ts ile aynı: "Sayısal", "Sözel").
const DGS: Record<string, SubjectTree> = {
  Sayısal: {
    "Temel Matematik": [
      { topic: "Temel Kavramlar ve Sayılar", aliases: ["temel kavramlar", "sayılar"] }, { topic: "Bölünebilme, EBOB - EKOK", aliases: ["bölünebilme", "ebob ekok"] },
      { topic: "Rasyonel ve Ondalık Sayılar", aliases: ["rasyonel sayılar", "ondalık sayılar"] }, { topic: "Üslü ve Köklü Sayılar", aliases: ["üslü sayılar", "köklü sayılar"] },
      { topic: "Eşitsizlik ve Mutlak Değer", aliases: ["eşitsizlikler", "mutlak değer"] }, { topic: "Çarpanlara Ayırma ve Oran - Orantı", aliases: ["çarpanlara ayırma", "oran orantı"] },
    ],
    Problemler: [{ topic: "Sayı, Kesir ve Yaş Problemleri", aliases: ["sayı problemleri", "yaş problemleri"] }, { topic: "Yüzde, Kâr - Zarar ve Karışım Problemleri", aliases: ["yüzde problemleri", "kar zarar"] }, { topic: "Hareket ve İşçi Problemleri", aliases: ["hareket problemleri", "işçi problemleri"] }, { topic: "Tablo ve Grafik Problemleri", aliases: ["grafik problemleri"] }],
    "Cebir ve Sayma": ["Kümeler", "Fonksiyonlar", { topic: "Permütasyon, Kombinasyon ve Olasılık", aliases: ["olasılık"] }],
    "Sayısal Mantık": [{ topic: "Sayısal Mantık", aliases: ["sayısal akıl yürütme"] }],
    Geometri: [{ topic: "Açılar ve Üçgenler", aliases: ["üçgenler"] }, { topic: "Dörtgenler ve Çokgenler", aliases: ["dörtgenler"] }, { topic: "Çember ve Daire", aliases: ["çember"] }, { topic: "Analitik Geometri", aliases: ["analitik"] }, "Katı Cisimler"],
  },
  Sözel: {
    "Sözcük ve Cümle Anlamı": [{ topic: "Sözcükte Anlam", aliases: ["sözcük anlamı"] }, { topic: "Cümlede Anlam", aliases: ["cümle anlamı"] }],
    Paragraf: [{ topic: "Paragrafta Anlam", aliases: ["paragraf", "ana düşünce", "paragrafın yapısı"] }],
    "Dil Bilgisi": [{ topic: "Dil Bilgisi", aliases: ["sözcük türleri", "cümle bilgisi", "yazım kuralları", "noktalama"] }, { topic: "Anlatım Bozuklukları", aliases: ["anlatım bozukluğu"] }],
    "Sözel Mantık": [{ topic: "Sözel Mantık", aliases: ["sözel akıl yürütme"] }],
  },
};

// MEB-AGS: 6 alt test (ders adları shared/exams.ts ile aynı).
const MEB_AGS: Record<string, SubjectTree> = {
  "Eğitim Bilimleri": {
    "Eğitim Bilimleri ve Türk Millî Eğitim Sistemi": [
      { topic: "Gelişim Psikolojisi", aliases: ["gelişim"] }, { topic: "Öğrenme Psikolojisi", aliases: ["öğrenme kuramları"] },
      { topic: "Öğretim İlke ve Yöntemleri", aliases: ["öğretim yöntem ve teknikleri", "öğretim stratejileri"] }, { topic: "Program Geliştirme", aliases: ["eğitimde program geliştirme"] },
      { topic: "Ölçme ve Değerlendirme", aliases: ["ölçme değerlendirme"] }, { topic: "Rehberlik ve Özel Eğitim", aliases: ["rehberlik", "özel eğitim"] },
      { topic: "Sınıf Yönetimi", aliases: ["sınıf yönetimi"] }, { topic: "Türk Millî Eğitim Sistemi", aliases: ["türk eğitim sistemi", "eğitim tarihi"] },
    ],
  },
  "Sözel Yetenek": {
    "Sözel Yetenek": [{ topic: "Sözcük ve Cümlede Anlam", aliases: ["sözcükte anlam", "cümlede anlam"] }, { topic: "Paragraf", aliases: ["paragrafta anlam"] }, { topic: "Sözel Mantık", aliases: ["sözel akıl yürütme"] }],
  },
  "Sayısal Yetenek": {
    "Sayısal Yetenek": [{ topic: "Temel Matematik", aliases: ["sayılar", "temel kavramlar"] }, { topic: "Problemler", aliases: ["sayı problemleri", "yüzde problemleri"] }, { topic: "Tablo ve Grafik Yorumlama", aliases: ["grafik"] }, { topic: "Sayısal Mantık", aliases: ["mantıksal muhakeme"] }],
  },
  Mevzuat: {
    Mevzuat: [
      { topic: "Anayasa'nın Eğitimle İlgili Hükümleri", aliases: ["anayasa"] }, { topic: "1739 Sayılı Millî Eğitim Temel Kanunu", aliases: ["milli eğitim temel kanunu", "1739"] },
      { topic: "222 Sayılı İlköğretim ve Eğitim Kanunu", aliases: ["ilköğretim ve eğitim kanunu", "222"] }, { topic: "7528 Sayılı Öğretmenlik Mesleği Kanunu", aliases: ["öğretmenlik mesleği kanunu", "7528"] },
    ],
  },
  Tarih: {
    Tarih: [{ topic: "Osmanlı ve Türk Tarihi", aliases: ["osmanlı tarihi", "türk tarihi"] }, { topic: "Kurtuluş Savaşı ve Atatürk İlkeleri", aliases: ["milli mücadele", "atatürk ilke ve inkılapları"] }],
  },
  "Türkiye Coğrafyası": {
    "Türkiye Coğrafyası": [{ topic: "Fiziki Coğrafya", aliases: ["yer şekilleri", "iklim"] }, { topic: "Beşeri ve Ekonomik Coğrafya", aliases: ["nüfus", "ekonomik faaliyetler"] }],
  },
};

// KPSS A grubu: 9 alan testi (ders adları shared/exams.ts ile aynı); ana konu başlıkları.
const KPSS_A: Record<string, SubjectTree> = {
  Hukuk: { Hukuk: ["Anayasa Hukuku", "İdare Hukuku", "Ceza Hukuku", "Medeni Hukuk", "Borçlar Hukuku", "Ticaret Hukuku", "İcra ve İflas Hukuku"] },
  İktisat: { İktisat: [{ topic: "Mikro İktisat", aliases: ["mikroekonomi"] }, { topic: "Makro İktisat", aliases: ["makroekonomi"] }, "Para, Banka ve Kredi", "Uluslararası İktisat", "Büyüme ve Kalkınma", "İktisadi Düşünceler Tarihi", "Türkiye Ekonomisi"] },
  Maliye: { Maliye: ["Maliye Teorisi", "Kamu Harcamaları", "Kamu Gelirleri", { topic: "Bütçe", aliases: ["5018 sayılı kanun"] }, "Maliye Politikası", "Vergi Hukuku", "Türk Vergi Sistemi"] },
  Muhasebe: { Muhasebe: ["Genel Muhasebe", "Bilanço Analizi", { topic: "Mali Tablolar Analizi", aliases: ["mali analiz"] }, "Maliyet Muhasebesi", "Muhasebe Denetimi", "Şirketler Muhasebesi"] },
  İşletme: { İşletme: ["İşletme Yönetimi", "Üretim Yönetimi", "Pazarlama", "Finansal Yönetim", "İnsan Kaynakları Yönetimi", "Örgütsel Davranış"] },
  "Çalışma Ekonomisi": { "Çalışma Ekonomisi": ["Çalışma Ekonomisi", "Endüstri İlişkileri", "İş Hukuku", "Sosyal Güvenlik Hukuku"] },
  İstatistik: { İstatistik: ["Tanımlayıcı İstatistik", "Olasılık", "Olasılık Dağılımları", "Tahmin ve Hipotez Testleri", "Regresyon ve Korelasyon"] },
  "Kamu Yönetimi": { "Kamu Yönetimi": ["Siyaset Bilimi", "Yönetim Bilimleri", "Türk Yönetim Tarihi", "Yönetim Hukuku", "Kentleşme ve Çevre Sorunları", "Türk Siyasal Hayatı"] },
  "Uluslararası İlişkiler": { "Uluslararası İlişkiler": ["Uluslararası İlişkiler Teorisi", "Siyasi Tarih", "Uluslararası Hukuk", "Uluslararası Örgütler", "Türk Dış Politikası", "Güncel Uluslararası Sorunlar"] },
};

/** Her oturumun konu ağacı; yeni sınav oturumu buraya eklenir (Record olduğu için TypeScript hatırlatır). */
const TREES: Record<CurriculumExam, Record<string, SubjectTree>> = { TYT, AYT, LGS, KPSS_GYGK, DGS, MEB_AGS, KPSS_A };

export const CURRICULUM: CurriculumTopicDef[] = (Object.keys(TREES) as CurriculumExam[]).flatMap((exam) => flatten(exam, TREES[exam]));

/** Müfredattan gelip öğrenci henüz hiç çalışmadığı için konu listelerinde
 * gösterilmeyecek konuları ayırt etmek için (bkz. server/db.ts getUserTopicProgress). */
export const isCurriculumOnlySlug = (slug: string) => slug.startsWith("cur-");
