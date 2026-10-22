import type { DashboardSection } from "@shared/yksData";

/**
 * Her bölümün kendi adresi: sayfa yenilenince aynı bölümde kalınır, bağlantı paylaşılabilir,
 * tarayıcının geri/ileri düğmeleri çalışır. Bölüm anahtarları (DashboardSection) değişmedi.
 */
export const SECTION_PATHS: Record<DashboardSection, string> = {
  overview: "/",
  topics: "/konu-haritasi",
  exams: "/denemeler",
  resources: "/kaynaklar",
  catalog: "/kaynak-katalogu",
  plan: "/ai-planim",
  calendar: "/takvim",
  notebook: "/defter",
  wall: "/duvarim",
  premium: "/premium",
  admin: "/yonetim",
};

const BY_PATH = new Map(Object.entries(SECTION_PATHS).map(([section, path]) => [path, section as DashboardSection]));

/** Bilinmeyen adres Genel Bakış'a düşer; sondaki "/" ve büyük/küçük harf önemsizdir. */
export function sectionFromPath(pathname: string): DashboardSection {
  const normalized = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  return BY_PATH.get(normalized) ?? "overview";
}
