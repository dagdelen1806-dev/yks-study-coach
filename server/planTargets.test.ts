import { describe, expect, it } from "vitest";
import { resolveBookTarget } from "../shared/planTargets";

describe("resolveBookTarget", () => {
  it("eşleştirme yoksa sayfa/test aralığını uydurmaz, null döner", () => {
    const result = resolveBookTarget([], "book-1", "Problemler");
    expect(result).toEqual({ targetPages: null, targetTests: null });
  });

  it("başka bir kitaba veya konuya ait eşleştirmeyi kullanmaz", () => {
    const mappings = [{ bookId: "book-2", topic: "Problemler", pageStart: 10, pageEnd: 20 }];
    expect(resolveBookTarget(mappings, "book-1", "Problemler")).toEqual({ targetPages: null, targetTests: null });
    const wrongTopic = [{ bookId: "book-1", topic: "İntegral", pageStart: 10, pageEnd: 20 }];
    expect(resolveBookTarget(wrongTopic, "book-1", "Problemler")).toEqual({ targetPages: null, targetTests: null });
  });

  it("gerçek eşleştirme varsa sayfa ve test aralığını döner", () => {
    const mappings = [{ bookId: "book-1", topic: "Problemler", pageStart: 40, pageEnd: 66, testStart: 3, testEnd: 5 }];
    expect(resolveBookTarget(mappings, "book-1", "Problemler")).toEqual({ targetPages: "40–66", targetTests: "3–5" });
  });

  it("konu adı eşleşmesini büyük/küçük harf ve boşluktan bağımsız yapar", () => {
    const mappings = [{ bookId: "book-1", topic: "  Problemler  ", pageStart: 1, pageEnd: 9 }];
    expect(resolveBookTarget(mappings, "book-1", "problemler")).toEqual({ targetPages: "1–9", targetTests: null });
  });
});
