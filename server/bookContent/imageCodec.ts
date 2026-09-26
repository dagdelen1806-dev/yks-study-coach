import jpeg from "jpeg-js";
import { grayToRgba, toGray, type GrayImage } from "../../shared/imaging/image";

/**
 * OCR ön işlemesi için JPEG çözme/kodlama (saf JS — Vercel'de yerel ikili
 * bağımlılık yok). İstemci her fotoğrafı JPEG'e çevirip gönderir; PNG/WebP
 * gelirse ön işleme atlanır ve görsel olduğu gibi okunur.
 */

export const ocrCodecLimits = { maxResolutionInMP: 16, maxMemoryUsageInMB: 512 };

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}

export function decodeJpegToGray(buffer: Buffer): GrayImage {
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: ocrCodecLimits.maxResolutionInMP, maxMemoryUsageInMB: ocrCodecLimits.maxMemoryUsageInMB });
  return toGray({ width: decoded.width, height: decoded.height, data: decoded.data });
}

export function encodeGrayToJpegDataUrl(image: GrayImage, quality = 85): string {
  const encoded = jpeg.encode({ width: image.width, height: image.height, data: Buffer.from(grayToRgba(image).buffer) }, quality);
  return `data:image/jpeg;base64,${Buffer.from(encoded.data).toString("base64")}`;
}
