/**
 * Yeni bir yayından sonra açık kalmış eski sekme, artık sunucuda olmayan bir sayfa parçasını (lazy chunk) yüklemeye
 * çalışınca "Failed to fetch dynamically imported module" hatası alır. Vite bunu `vite:preloadError` olayıyla bildirir:
 * sayfa yeni sürümle bir kez yenilenir. Döngüye girmesin diye 30 sn içinde ikinci kez yenilenmez (hata o zaman
 * normal yoldan, ErrorBoundary ve hata kaydına düşer).
 */
const KEY = "stale-chunk-reload-at";

window.addEventListener("vite:preloadError", (event) => {
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* depolama kapalı */ }
  if (Date.now() - last < 30_000) return;
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* depolama kapalı */ }
  event.preventDefault();
  window.location.reload();
});
