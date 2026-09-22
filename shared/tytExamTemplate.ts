import type { ExamTopicResult } from "./yksData";

/**
 * TYT dershane denemesi konu şablonu.
 *
 * Kaynak: öğrencinin kendi dershanesinin "Derslere Göre Başarı Analizi"
 * raporundan paylaştığı 4 görsel (Türkçe/Matematik/Fen/Sosyal). Rapordaki S
 * (soru sayısı) sütunu buraya BİREBİR aktarıldı — uydurma bir ÖSYM dağılımı
 * DEĞİL, kullanıcının kendi kaynağından gelen gerçek veri. D/Y/Boş her zaman
 * öğrencinin o denemedeki kendi girişinden gelir, burada yer almaz.
 *
 * Toplamlar kaynakla birebir doğrulandı: Türkçe 40/40, Matematik-1 40/40,
 * Sosyal (Tarih-1+Coğrafya-1+Felsefe+Din Kül. ve Ahl. Bil.+Felsefe Seçmeli)
 * 25/25. Fen'de yalnızca Fizik (7) ve Kimya (7) vardı — paylaşılan görsel
 * Biyoloji bölümünü içermiyordu (TYT Fen 20 soru üzerinden 14'ü burada);
 * bkz. TYT_TEMPLATE_MISSING_NOTE. Biyoloji verisi paylaşılırsa buraya
 * eklenir; o zamana kadar uydurma konu/soru sayısı YAZILMADI.
 */
type TytTemplateRow = { subject: string; category: string; topic: string; questionCount: number };

const TYT_TEMPLATE_ROWS: TytTemplateRow[] = [
  // Türkçe — TYT Türkçe, S=40
  { subject: "Türkçe", category: "Türkçe", topic: "Cümlede Yorum", questionCount: 4 },
  { subject: "Türkçe", category: "Türkçe", topic: "Anlamına Göre Sözcükler", questionCount: 5 },
  { subject: "Türkçe", category: "Türkçe", topic: "Anlam İlişkisine Göre Sözcükler", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "İsim Tamlamaları, Cümlenin Ögeleri (Tamlayıcılar), Fiilimsi Bulma, Sözcük Türleri", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Sıfat Tamlamaları", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Yazım Kuralları", questionCount: 2 },
  { subject: "Türkçe", category: "Türkçe", topic: "Noktalama İşaretleri", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Cümlenin Ögeleri (Tamlayıcılar)", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Ses Bilgisi", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Cümlenin Ögeleri (Temel Ögeler), Cümlenin Ögeleri (Tamlayıcılar), İsim Tamlamaları, Sıfat Tamlamaları", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Parçada Anlam (Ana Düşünce-Yardımcı Düşünce)", questionCount: 14 },
  { subject: "Türkçe", category: "Türkçe", topic: "Parçada Konu-Başlık-Soru", questionCount: 3 },
  { subject: "Türkçe", category: "Türkçe", topic: "Ek Fiil - Fiilde Yapı, Cümle Türleri (Yapısına Göre Cümleler), Sözcük Türleri, Çekim Ekleri", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Cümlenin Ögeleri (Temel Ögeler), Cümlenin Ögeleri (Nesne), Cümlenin Ögeleri (Tamlayıcılar)", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Ek Fiil - Fiilde Yapı, İsim Tamlamaları, Sözcük Türleri", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Parçada Anlatım", questionCount: 1 },
  { subject: "Türkçe", category: "Türkçe", topic: "Paragrafta Yapı", questionCount: 1 },

  // Matematik — TYT Matematik-1, S=40
  { subject: "Matematik", category: "Matematik-1", topic: "Fonksiyonda Dört İşlem", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Bir Bilinmeyenli Eşitsizlikler", questionCount: 2 },
  { subject: "Matematik", category: "Matematik-1", topic: "Mutlak Değerli Eşitsizlikler", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Üslü İfadeler", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Faktöriyel", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Sayı Basamakları", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Ondalıklı Sayılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Tek-Çift Sayılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Doğal Sayılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Güncel Yüzde Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Kar Zarar Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Polinomlarda Dört İşlem", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Merkezi Eğilim Ölçüleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Bileşik Önermeler", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Ardışık Sayılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Bölünebilme Kuralları", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Periyodik Tekrar Eden Durumlar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "İki Bilinmeyenli Denklemler", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Kombinasyon Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Paralel İki Doğrunun Kesenle Yaptığı Açılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Basit Olayların Olasılığı", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Güncel Hareket Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Güncel Karışım Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Orantı Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Güncel Sayı Problemleri", questionCount: 3 },
  { subject: "Matematik", category: "Matematik-1", topic: "Küme Tanımı ve Gösterimi", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Tablo Grafik Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Güncel Yaş Problemleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Küpün Alanı", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Doğruda Açılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Düzgün Çokgende Açı", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Dörtgen Özellikleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Karede Uzunluk Özellikleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Dik Üçgende Trigonometrik Oranlar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Yamukta Alan Özellikleri", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Üçgende Açılar", questionCount: 1 },
  { subject: "Matematik", category: "Matematik-1", topic: "Açılarına Göre Özel Üçgenler", questionCount: 1 },

  // Fen — Fizik (7) + Kimya (7) = 14; Biyoloji (6) kaynak görselde yoktu, eklenmedi.
  { subject: "Fen", category: "Fizik", topic: "Ortam Derinliği ile Su Dalgalarının Yayılma Hızı İlişkisi", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Elektroskop", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Cisimlerin Sıvı İçindeki Denge Durumları", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Işık Şiddeti, Işık Akısı ve Aydınlanma Şiddeti", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Özkütle, Suyun Genleşmesi", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Verim", questionCount: 1 },
  { subject: "Fen", category: "Fizik", topic: "Temel ve Türetilmiş Büyüklükler", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Derişik Seyreltik", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Asitlerin ve Bazların Metallerle Tepkimeleri", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Güvenlik İşaretleri", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Element, Bileşik", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Güçlü Etkileşimler Türleri (Kovalent Bağ), Lewis Formülleri", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Periyodik Özelliklerin Değişimleri", questionCount: 1 },
  { subject: "Fen", category: "Kimya", topic: "Tepkimeli Miktar Geçiş Problemleri", questionCount: 1 },

  // Sosyal — Tarih-1 + Coğrafya-1 + Felsefe + Din Kül. ve Ahl. Bil. + Felsefe (Seçmeli) = 25
  { subject: "Sosyal", category: "Tarih-1", topic: "Toplumsal Alanda Yapılan İnkılaplar", questionCount: 1 },
  { subject: "Sosyal", category: "Tarih-1", topic: "Osmanlıda Sanayileşme Çabaları", questionCount: 1 },
  { subject: "Sosyal", category: "Tarih-1", topic: "Eğitim ve Kültür Alanında Yapılan İnkılaplar", questionCount: 1 },
  { subject: "Sosyal", category: "Tarih-1", topic: "Büyük Selçuklu Devleti", questionCount: 1 },
  { subject: "Sosyal", category: "Tarih-1", topic: "Avrasya'da İlk Türk İzleri", questionCount: 1 },
  { subject: "Sosyal", category: "Coğrafya-1", topic: "Afetlerin Dağılışları", questionCount: 1 },
  { subject: "Sosyal", category: "Coğrafya-1", topic: "Yıllık Hareket (Grafikler)", questionCount: 1 },
  { subject: "Sosyal", category: "Coğrafya-1", topic: "Türkiye İklimi (Türkiye'de Sıcaklık)", questionCount: 1 },
  { subject: "Sosyal", category: "Coğrafya-1", topic: "Türkiye'deki Göçlerin Sebep ve Sonuçları", questionCount: 1 },
  { subject: "Sosyal", category: "Coğrafya-1", topic: "Bölge Kavramı ve Türlerinin Sınıflandırılması", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe", topic: "20. Yüzyıl Felsefesinin Temel Problemleri ve Bazı Ana Akımları", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe", topic: "Sanat Nedir?", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe", topic: "Bilimin Değeri Nedir?", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe", topic: "Örnek Felsefi Metinlerinden Hareketle 18-19. Yüzyıl Filozoflarının Görüşlerini Analiz Eder", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe", topic: "Varlık Felsefesi Nedir?", questionCount: 1 },
  { subject: "Sosyal", category: "Din Kül. ve Ahl. Bil.", topic: "Hz. Muhammed'in Şahsiyeti", questionCount: 1 },
  { subject: "Sosyal", category: "Din Kül. ve Ahl. Bil.", topic: "Varoluşun ve Hayatın Anlamı", questionCount: 1 },
  { subject: "Sosyal", category: "Din Kül. ve Ahl. Bil.", topic: "Allah'ın Varlığı ve Birliği Konusunda Akli ve Nakli Delilleri Analiz Eder", questionCount: 1 },
  { subject: "Sosyal", category: "Din Kül. ve Ahl. Bil.", topic: "İnanç", questionCount: 1 },
  { subject: "Sosyal", category: "Din Kül. ve Ahl. Bil.", topic: "İnsanın Doğası ve Din", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe (Seçmeli)", topic: "Dogmatizm", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe (Seçmeli)", topic: "Güzel Nedir?", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe (Seçmeli)", topic: "Örnek Felsefi Metinlerinden Hareketle 18-19. Yüzyıl Filozoflarının Görüşlerini Analiz Eder", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe (Seçmeli)", topic: "MÖ 6. Yüzyıl - MS 2. Yüzyıl Felsefesinin Karakteristik Özelliklerini Açıklar", questionCount: 1 },
  { subject: "Sosyal", category: "Felsefe (Seçmeli)", topic: "Varlığın Mahiyeti Nedir?", questionCount: 1 },
];

export const TYT_TEMPLATE_MISSING_NOTE =
  "Fen bölümünde yalnızca Fizik (7 soru) ve Kimya (7 soru) gerçek dağılımı var; paylaşılan kaynak görselde Biyoloji (6 soru) bölümü yer almıyordu. Uydurma bir sayı eklenmedi — Biyoloji konularını \"Konu satırı ekle\" ile elle girebilir ya da eksik tabloyu paylaşırsan kalıcı olarak ekleriz.";

/** TYT dershane denemesi formu açılırken kullanılan sabit konu şablonu; D/Y/Boş her zaman 0'dan başlar, S gerçek kaynaktan gelir. */
export function buildTytTemplateTopicDetails(): ExamTopicResult[] {
  return TYT_TEMPLATE_ROWS.map((row) => ({
    subject: row.subject,
    topic: row.topic,
    category: row.category,
    questionCount: row.questionCount,
    correct: 0,
    wrong: 0,
    blank: 0,
    accuracy: 0,
    net: 0,
  }));
}

export type GroupedExamTotals = { questionCount: number; correct: number; wrong: number; blank: number; accuracy: number; net: number };
export type GroupedExamCategory = { category: string; rows: Array<{ row: ExamTopicResult; index: number }>; totals: GroupedExamTotals };
export type GroupedExamSubject = { subject: string; categories: GroupedExamCategory[]; totals: GroupedExamTotals };

function sumTotals(rows: ExamTopicResult[]): GroupedExamTotals {
  const questionCount = rows.reduce((sum, row) => sum + row.questionCount, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  const wrong = rows.reduce((sum, row) => sum + row.wrong, 0);
  const blank = rows.reduce((sum, row) => sum + row.blank, 0);
  const net = Number((correct - wrong / 4).toFixed(2));
  const accuracy = questionCount ? Math.round((correct / questionCount) * 100) : 0;
  return { questionCount, correct, wrong, blank, accuracy, net };
}

/**
 * Konu satırlarını (ders > kategori > konu) gruplar ve her seviyede S/D/Y/Boş/B%/Net
 * toplamlarını hesaplar — referans görsellerdeki "TYT Fen / Fizik / Kimya" hiyerarşisiyle
 * aynı yapı. Orijinal dizideki index'ler korunur ki tablo satırları form state'iyle eşleşsin.
 */
export function groupTopicDetailsBySubject(rows: ExamTopicResult[]): GroupedExamSubject[] {
  const subjectKeys: string[] = [];
  const bySubject = new Map<string, Array<{ row: ExamTopicResult; index: number }>>();
  rows.forEach((row, index) => {
    const key = row.subject || "Diğer";
    if (!bySubject.has(key)) { bySubject.set(key, []); subjectKeys.push(key); }
    bySubject.get(key)!.push({ row, index });
  });
  return subjectKeys.map((subject) => {
    const subjectEntries = bySubject.get(subject)!;
    const categoryKeys: string[] = [];
    const byCategory = new Map<string, Array<{ row: ExamTopicResult; index: number }>>();
    subjectEntries.forEach((entry) => {
      const key = entry.row.category || subject;
      if (!byCategory.has(key)) { byCategory.set(key, []); categoryKeys.push(key); }
      byCategory.get(key)!.push(entry);
    });
    const categories = categoryKeys.map((category) => {
      const entries = byCategory.get(category)!;
      return { category, rows: entries, totals: sumTotals(entries.map((entry) => entry.row)) };
    });
    return { subject, categories, totals: sumTotals(subjectEntries.map((entry) => entry.row)) };
  });
}
