// Telefon fotoğrafları 5–10 MB olabilir; Vercel'de bir isteğin gövdesi ~4.5 MB
// ile sınırlı ve OCR için bu çözünürlüğe gerek yok. Fotoğraf tarayıcıda
// küçültülüp JPEG'e çevrilir (sunucu yine de boyut + magic bytes doğrular).

export type CompressedImage = { dataUrl: string; mimeType: "image/jpeg"; bytes: number };

const dataUrlBytes = (dataUrl: string) => Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode"));
      image.src = url;
    });
  } finally {
    // onload tetiklendiyse görsel belleğe alınmıştır; URL'yi hemen bırakmak güvenli.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function compressImage(file: File, options: { maxDimension?: number; maxBytes?: number } = {}): Promise<CompressedImage> {
  const maxBytes = options.maxBytes ?? 1.5 * 1024 * 1024;
  let maxDimension = options.maxDimension ?? 2000;
  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error("Bu fotoğraf açılamadı. JPG veya PNG formatında bir fotoğraf dener misin?");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tarayıcın fotoğraf işlemeyi desteklemiyor.");

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const bytes = dataUrlBytes(dataUrl);
      if (bytes <= maxBytes) return { dataUrl, mimeType: "image/jpeg", bytes };
    }
    maxDimension = Math.round(maxDimension * 0.8);
  }
  throw new Error("Fotoğraf küçültülemedi. Daha düşük çözünürlüklü bir fotoğraf dener misin?");
}
