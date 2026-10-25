import { describe, expect, it } from "vitest";
import { parseHiddenCell, parseTopicSheet } from "../shared/topicSheet";

describe("konu Excel'i okuma", () => {
  it("başlıkları Türkçe/İngilizce, büyük-küçük harf ve boşluktan bağımsız tanır; satır numarası Excel'deki gibidir", () => {
    const parsed = parseTopicSheet([
      { "KİMLİK": "12", "Sınav": "LGS", "ders": "Matematik", "ÜNİTE ADI": "Çarpanlar", "Konu Adı": "EBOB", "Gizli": "Evet", "Kaynak": "Müfredat" },
      { "KİMLİK": "", "Sınav": "", "ders": " Matematik ", "ÜNİTE ADI": "Kareköklü", "Konu Adı": " Yeni konu ", "Gizli": "", "Kaynak": "" },
      { "KİMLİK": "", "Sınav": "", "ders": "", "ÜNİTE ADI": "", "Konu Adı": "", "Gizli": "", "Kaynak": "" },
      { "KİMLİK": "", "Sınav": "TYT", "ders": "Türkçe", "ÜNİTE ADI": "X", "Konu Adı": "Y", "Gizli": "", "Kaynak": "" },
    ], "LGS");
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.rows).toEqual([
      { line: 2, id: 12, subject: "Matematik", unit: "Çarpanlar", topic: "EBOB", hidden: true },
      { line: 3, id: null, subject: "Matematik", unit: "Kareköklü", topic: "Yeni konu", hidden: null },
    ]);
    expect(parsed.otherExamLines).toEqual([5]);
  });

  it("zorunlu sütun eksikse adını söyler; sınav etiketiyle (KPSS GY-GK) eşleşir", () => {
    expect(parseTopicSheet([{ Ders: "Türkçe", Konu: "Paragraf" }], "TYT").missingColumns).toEqual(["Ünite"]);
    expect(parseTopicSheet([{ Sınav: "KPSS GY-GK", Ders: "Türkçe", Ünite: "A", Konu: "B" }], "KPSS_GYGK").rows).toHaveLength(1);
  });

  it("gizli hücresi: evet/hayır/1/0/boş", () => {
    expect([parseHiddenCell("EVET"), parseHiddenCell("hayır"), parseHiddenCell(1), parseHiddenCell("0"), parseHiddenCell(""), parseHiddenCell("belki")]).toEqual([true, false, true, false, null, null]);
  });
});
