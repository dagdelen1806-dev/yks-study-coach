import { describe, expect, it } from "vitest";
import { applyScanFilter } from "../shared/imaging/scanFilter";

// Defter sorusu fotoğrafı: sağa doğru koyulaşan gölge, siyah yazı satırları ve kırmızı bir işaret.
function shadowedPage(width = 240, height = 240) {
  const data = new Uint8ClampedArray(width * height * 4);
  const kind = (x: number, y: number) => (x >= 20 && x < 60 && y >= 200 && y < 210 ? "red" : y % 20 < 2 && x > 10 && x < width - 10 ? "text" : "paper");
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const shade = 1 - 0.65 * (x / width); // sağ kenarda kâğıt %35 aydınlıkta: "siyah katman"
    const [r, g, b] = { paper: [232, 228, 218], text: [28, 28, 30], red: [210, 40, 40] }[kind(x, y)];
    const offset = (y * width + x) * 4;
    data[offset] = r * shade; data[offset + 1] = g * shade; data[offset + 2] = b * shade; data[offset + 3] = 255;
  }
  return { width, height, data, kind };
}

describe("tarayıcı filtresi (defter soruları)", () => {
  it("gölgeli kâğıdı beyaza çeker, yazıyı koyu tutar, renkli işareti korur", () => {
    const page = shadowedPage();
    const pixel = (x: number, y: number) => Array.from(page.data.slice((y * page.width + x) * 4, (y * page.width + x) * 4 + 3));
    const before = pixel(225, 50);
    expect(before[0]).toBeLessThan(110); // filtre öncesi gölgedeki kâğıt koyu gri
    applyScanFilter(page);
    for (const x of [15, 120, 225]) {
      expect(Math.min(...pixel(x, 50))).toBeGreaterThan(235); // kâğıt her yerde beyaz
      expect(Math.max(...pixel(x, 40))).toBeLessThan(90); // yazı satırı koyu kalır
    }
    const [r, g, b] = pixel(40, 205);
    expect(r - g).toBeGreaterThan(80); // kırmızı işaret kırmızı kalır
    expect(r - b).toBeGreaterThan(80);
  });

  it("zaten temiz, düz bir taramayı bozmaz", () => {
    const width = 120, height = 120;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let x = 10; x < 110; x++) for (const y of [30, 31, 60, 61]) data.fill(20, (y * width + x) * 4, (y * width + x) * 4 + 3);
    applyScanFilter({ width, height, data });
    expect(data[(10 * width + 10) * 4]).toBe(255);
    expect(data[(30 * width + 50) * 4]).toBeLessThan(40);
  });
});
