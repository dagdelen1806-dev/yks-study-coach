import type { RawExternalProduct, ValidationIssue } from "../types";

/** Spec §28 — a malformed item must be skippable without stopping the whole import. */
export function validateRawProduct(product: RawExternalProduct): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!product.rawName || product.rawName.trim().length < 2) {
    issues.push({ field: "rawName", message: "Ürün adı eksik veya çok kısa" });
  }
  if (product.rawName && product.rawName.length > 300) {
    issues.push({ field: "rawName", message: "Ürün adı 300 karakteri aşıyor" });
  }
  if (!product.sourceProductId || product.sourceProductId.trim().length === 0) {
    issues.push({ field: "sourceProductId", message: "Kaynak ürün kimliği eksik" });
  }
  if (product.rawPrice !== undefined && (Number.isNaN(product.rawPrice) || product.rawPrice < 0)) {
    issues.push({ field: "rawPrice", message: "Geçersiz fiyat" });
  }
  return issues;
}
