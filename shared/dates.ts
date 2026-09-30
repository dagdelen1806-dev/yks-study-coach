// Takvim günü yardımcıları — istemci ve sunucu ortak kullanır.

/** Yerel takvim günü anahtarı (YYYY-AA-GG).
 *
 * `toISOString().slice(0, 10)` UTC gününü verir. Türkiye (UTC+3) için bu,
 * gece yarısı–03:00 arasında "bugün"ü dün yapıyor ve yerel gece yarısına
 * ayarlanmış tarihleri bir önceki güne kaydırıyordu. MySQL DATE sütunları
 * sürücüde yerel gece yarısı olarak, tarih dizeleri ("2026-09-30") ise UTC
 * gece yarısı olarak okunur; ikisi de yerel saatte doğru güne düşer. */
export const toLocalDateKey = (value: Date | string | number = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** "24–30 Eylül" / "28 Eylül – 4 Ekim" */
export const formatDayRange = (start: Date, end: Date) => {
  const month = (date: Date) => new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date);
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${month(end)}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`;
};
