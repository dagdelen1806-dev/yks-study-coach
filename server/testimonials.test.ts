import { describe, expect, it } from "vitest";
import { SAMPLE_TESTIMONIALS, suggestedDisplayName } from "../shared/testimonials";

describe("öğrenci yorumları", () => {
  it("görünecek ad önerisinde soyadın yalnızca baş harfi kalır", () => {
    expect(suggestedDisplayName("Ece Yılmaz")).toBe("Ece Y.");
    expect(suggestedDisplayName("Ayşe Nur İnce")).toBe("Ayşe Nur İ.");
    expect(suggestedDisplayName("Kerem")).toBe("Kerem");
    expect(suggestedDisplayName("  ")).toBe("");
    expect(suggestedDisplayName(null)).toBe("");
  });

  it("örnek yorumlar gerçek bir kişi adı taşımaz", () => {
    expect(SAMPLE_TESTIMONIALS.every((item) => item.displayName === "Örnek öğrenci")).toBe(true);
  });
});
