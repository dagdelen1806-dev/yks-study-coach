// Server-side dosya doğrulaması (spec §1/§33: "Client-side validation'a
// güvenme. Server-side validation zorunlu."). Zod şeması yalnızca string
// UZUNLUĞUNU ve İDDİA EDİLEN mimeType'ı kontrol eder — bu modül, gönderilen
// baytların GERÇEKTEN o türe ait olup olmadığını (magic bytes) ve gerçek
// (decode edilmiş) boyutunu doğrular.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — istemcideki sınırla aynı, ama artık gerçekten uygulanıyor.

const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF" — WEBP kontrolü ayrıca byte 8-11 "WEBP" olmalı
};

export type FileValidationResult = { valid: true; buffer: Buffer } | { valid: false; reason: string };

export function validateDataUrl(dataUrl: string, declaredMimeType: string): FileValidationResult {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return { valid: false, reason: "Geçersiz data URL formatı." };
  const [, encodedMime, base64] = match;

  if (encodedMime !== declaredMimeType) {
    return { valid: false, reason: "data URL'deki MIME türü, bildirilen mimeType ile uyuşmuyor." };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { valid: false, reason: "Base64 çözülemedi." };
  }

  if (buffer.byteLength === 0) return { valid: false, reason: "Boş dosya." };
  if (buffer.byteLength > MAX_UPLOAD_BYTES) return { valid: false, reason: `Dosya ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB sınırını aşıyor.` };

  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return { valid: false, reason: "Desteklenmeyen dosya türü." };
  const matchesSignature = signatures.some((signature) => signature.every((byte, index) => buffer[index] === byte));
  if (!matchesSignature) return { valid: false, reason: "Dosya içeriği, bildirilen türle eşleşmiyor (magic bytes doğrulaması başarısız)." };

  if (declaredMimeType === "image/webp") {
    const webpMarker = buffer.subarray(8, 12).toString("ascii");
    if (webpMarker !== "WEBP") return { valid: false, reason: "Geçerli bir WEBP dosyası değil." };
  }

  return { valid: true, buffer };
}
