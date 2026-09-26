import { invokeLLM } from "../_core/llm";
import type { TocRawItem, TocRawPage } from "./tocParser";

/**
 * OCR sağlayıcı soyutlaması. Sağlayıcı yalnızca görseli OKUR; yapı çıkarma,
 * müfredat eşleştirme ve doğrulama sağlayıcıdan bağımsız, deterministik
 * kodda yapılır (tocParser.ts, curriculumMatcher.ts). Başka bir OCR servisine
 * geçmek yalnızca bu arayüzün yeni bir uygulamasını yazmayı gerektirir.
 */
export interface OcrProvider {
  readonly name: string;
  /** `hint`: ilk okumada bulunan tutarsızlıklar — verilirse sağlayıcı sayfayı bunlara dikkat ederek yeniden okur. */
  extractTableOfContentsPage(imageDataUrl: string, hint?: { previous: TocRawPage; issues: string[] }): Promise<TocRawPage>;
}

const tocItemSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["unit", "section", "entry"] },
    unitNumber: { type: ["integer", "null"] },
    title: { type: "string" },
    label: { type: ["string", "null"] },
    page: { type: ["integer", "null"] },
  },
  required: ["type", "unitNumber", "title", "label", "page"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  "Sen bir Türkçe YKS kaynak kitabının İÇİNDEKİLER sayfasını satır satır okuyan bir OCR asistanısın.",
  "Görseldeki her satırı yukarıdan aşağıya, sayfadaki sırasıyla döndür. Yorum yapma, özetleme, eksik satırı tahminle doldurma.",
  "type: numaralı ünite başlığı (ör. '1. ÜNİTE') için 'unit' (unitNumber dolu); ünite adı ayrı satırdaysa veya numarasız grup başlığıysa (ör. 'SİMÜLASYON DENEMELERİ') 'section'; sayfa numarası olan her satır için 'entry'.",
  "entry satırlarında: label = satır başındaki etiket ('Test 1', 'ÖSYM Tipi', 'Sarmal Test – 2', 'Simülasyon 3', 'ÖSYM Tipi - Eğitim Kontrol Testi - 1'); title = etiketten sonraki konu adı (yoksa boş string); page = satırın sağındaki sayfa numarası.",
  "Fotoğraf eğik çekilmiş olabilir: sayfa numarası, noktalı çizginin (.....) bağladığı satıra aittir, hizası yarım satır kaymış görünse bile. Bir ünite başlığına sayfa numarası atama; numaralar test satırlarına aittir.",
  "Okuyamadığın sayfa numarasını null bırak, uydurma. Metni kitaptaki gibi, Türkçe karakterleriyle yaz.",
  "pageKind: görsel gerçekten bir içindekiler sayfasıysa 'table_of_contents'; kitap kapağıysa 'cover'; başka bir şeyse 'other' (bu iki durumda items boş olabilir).",
].join(" ");

export const llmVisionOcrProvider: OcrProvider = {
  name: "llm-vision",
  async extractTableOfContentsPage(imageDataUrl, hint) {
    // Düzeltme okuması: önceki okuma ve bulunan tutarsızlıklar verilir; sağlayıcı
    // görsele yeniden bakıp yalnızca gerçekten gördüğünü yazar (tahmin etmez).
    const instruction = hint
      ? `Bu içindekiler sayfasını yeniden, dikkatle oku. İlk okumada şu tutarsızlıklar bulundu: ${hint.issues.join(" | ")}. İlk okuma: ${JSON.stringify(hint.previous.items).slice(0, 6000)}. Görselde noktalı çizgileri takip ederek her sayfa numarasını doğru satıra eşle; görselde olmayan bir şeyi ekleme.`
      : "Bu içindekiler sayfasını oku.";
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text" as const, text: instruction }, { type: "image_url" as const, image_url: { url: imageDataUrl, detail: "high" as const } }] },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "yks_book_toc_page", strict: true, schema: { type: "object", properties: { pageKind: { type: "string", enum: ["table_of_contents", "cover", "other"] }, items: { type: "array", items: tocItemSchema } }, required: ["pageKind", "items"], additionalProperties: false } },
      },
    });
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
    if (!jsonText) throw new Error("OCR yanıtı boş döndü");
    const parsed = JSON.parse(jsonText) as { items?: TocRawItem[]; pageKind?: TocRawPage["pageKind"] };
    // Şemaya rağmen sağlayıcı çıktısına körü körüne güvenilmez: tipler süzülür.
    const items = (parsed.items ?? []).filter((item): item is TocRawItem =>
      Boolean(item) && ["unit", "section", "entry"].includes(item.type) && typeof item.title === "string"
    ).map((item) => ({
      type: item.type,
      unitNumber: Number.isInteger(item.unitNumber) ? item.unitNumber : null,
      title: item.title.slice(0, 300),
      label: typeof item.label === "string" ? item.label.slice(0, 120) : null,
      page: Number.isInteger(item.page) && item.page! > 0 && item.page! < 5000 ? item.page : null,
    }));
    const pageKind = parsed.pageKind === "cover" || parsed.pageKind === "other" ? parsed.pageKind : "table_of_contents";
    return { items, pageKind };
  },
};

export const getOcrProvider = (): OcrProvider => llmVisionOcrProvider;
