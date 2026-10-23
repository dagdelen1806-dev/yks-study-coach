/**
 * Sunucunun saat dilimi. Tarih hesapları (görev saati, "bugün", haftalık özet penceresi, ders
 * programı çakışması) sunucunun yerel saatiyle yapılıyor; Vercel ise varsayılan olarak UTC'de
 * çalışır ve öğretmenin 17:00'ye koyduğu görev 20:00'ye kayardı. Bu modül sunucu açılırken
 * İLK yüklenir ve saat dilimini sabitler: `APP_TIMEZONE` (ör. "Europe/Istanbul") geçerliyse o,
 * değilse Türkiye saati. Tarayıcı tarafı her zaman kullanıcının kendi cihaz saatini kullanır.
 */
export const DEFAULT_TIMEZONE = "Europe/Istanbul";

export function resolveTimezone(requested: string | undefined): string {
  const value = requested?.trim();
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    console.warn(`[timezone] APP_TIMEZONE="${value}" geçersiz; ${DEFAULT_TIMEZONE} kullanılıyor.`);
    return DEFAULT_TIMEZONE;
  }
}

// Node, process.env.TZ değiştiğinde saat dilimi önbelleğini yeniler.
process.env.TZ = resolveTimezone(process.env.APP_TIMEZONE);
