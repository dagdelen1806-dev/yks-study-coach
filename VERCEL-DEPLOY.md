# Vercel'e yayına alma

Bu proje (kalıcı çalışan Express sunucusu + arka planda sürekli çalışan bir
zamanlayıcı) Vercel'in sunucusuz (serverless) modeline birebir uymuyordu; bu
yüzden `api/index.ts`, `vercel.json` ve `server/_core/app.ts` eklenerek
Vercel için uyarlandı. Yerel geliştirme (`npm run dev`) ve geleneksel/kalıcı
sunucu barındırma (Railway/Render/bir VPS, `npm run build && npm start`)
hâlâ eskisi gibi çalışıyor — hiçbir şey bozulmadı.

## 1) Vercel'de projeyi oluştur

1. [vercel.com](https://vercel.com) → GitHub hesabınla giriş yap.
2. **Add New → Project** → GitHub'daki `yks-study-coach` deposunu seç → **Import**.
3. Vercel "Vite" framework'ünü otomatik algılayabilir; sorun değil, `vercel.json` build ayarlarını zaten override ediyor (`buildCommand: vite build`, `outputDirectory: dist/public`). Bu ekranda ekstra bir şey değiştirmene gerek yok.
4. **Henüz Deploy'a basma** — önce ortam değişkenlerini ekle (aşağıda), yoksa ilk deploy veritabanına bağlanamaz.

## 2) Ortam değişkenlerini nereye eklersin

Vercel Dashboard → projenin sayfası → **Settings → Environment Variables**.
Her değişkeni **Name** + **Value** olarak tek tek ekle, **Environment**
kutusunda en az **Production** işaretli olsun (Preview/Development'ı da
işaretlemek istersen sorun değil — aynı değerleri kullanabilirsin ya da
ayrı bir test veritabanı bağlayabilirsin).

Kendi `.env` dosyandaki (`env.template`'teki) isimlerle birebir aynı isimleri kullan:

| Değişken | Not |
|---|---|
| `DATABASE_URL` | **Bulutta çalışan** bir MySQL bağlantı string'i olmalı — bkz. aşağıdaki 3. adım. Yerel Laragon MySQL'e Vercel'den erişilemez. |
| `JWT_SECRET` | Uzun, rastgele bir string. |
| `VITE_APP_ID` | Manus OAuth bu projede zaten pasif (yerel dev-login kullanılıyor); boş bırakabilirsin. |
| `OAUTH_SERVER_URL` | `.env`'deki değerle aynı. |
| `OWNER_OPEN_ID` | `.env`'deki değerle aynı (boşsa boş kalabilir). |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | LLM çağrıları (AI Planım, OCR) için gerekli. |
| `PAYMENT_PROVIDER` | `mock` bırakabilirsin (sandbox); gerçek bir sağlayıcı bağlamadıysan `apple`/`google` değişkenlerini boş bırak. |
| `CRON_SECRET` | Yeni: rastgele bir string üret (ör. `openssl rand -hex 32` ya da herhangi bir şifre üreticisi) ve buraya ekle. Kaynak kataloğu senkron uç noktasını (`/api/cron/resource-catalog-sync`) korur — Vercel Cron bunu otomatik `Authorization: Bearer $CRON_SECRET` başlığıyla gönderir. |

`NODE_ENV`'i elle eklemene gerek yok — Vercel bunu production'da otomatik `production` yapar.

**Önemli:** Bu değerleri asla `.env` dosyasından kopyalayıp repoya commit etme — `.gitignore` zaten `.env*` dosyalarını hariç tutuyor, sadece Vercel'in env var ekranını kullan.

## 3) Bulutta MySQL

Yerel bilgisayarındaki Laragon MySQL'e internetten erişilemez; Vercel'in
sunucularının bağlanabileceği, herkese açık bir MySQL lazım. Seçenekler:

- **PlanetScale** (MySQL uyumlu, ücretsiz katmanı var) — en kolay yol.
- **Railway MySQL** ya da **Aiven MySQL**.
- Kendi VPS'inde MySQL (güvenlik grubunda Vercel'in çıkış IP'lerine izin vermen gerekir — daha zahmetli, önerilmez).

Bağlantı string'ini aldıktan sonra:

1. `DATABASE_URL` olarak Vercel'e ekle (2. adım).
2. Migration'ları bir kereliğine o veritabanına uygula — kendi bilgisayarından:
   ```bash
   DATABASE_URL="<bulut-mysql-baglanti-stringi>" npx drizzle-kit migrate
   ```

## 4) Deploy et

Env değişkenlerini ekledikten sonra Vercel Dashboard'dan **Deploy**'a bas
(ya da **Deployments** sekmesinden "Redeploy"). Build logunu izle; `vite
build` hata verirse sebep doğrudan logda görünür.

## 5) Cron Job'u doğrula

`vercel.json` içinde zaten tanımlı: her gün 03:00'te (UTC)
`/api/cron/resource-catalog-sync` tetiklenip kitapisler.com senkronu bir
kez çalışır. Deploy sonrası **Settings → Cron Jobs**'tan bunun göründüğünü
ve aktif olduğunu doğrulayabilirsin. Devre dışı bırakmak istersen Vercel'e
`RESOURCE_CATALOG_SCHEDULER_ENABLED=false` env değişkenini ekle.

## 6) Bilinen sınırlamalar (mimari farkı nedeniyle)

- **Rate limiting** bellek-içi (in-memory) tutuluyor; sunucusuz ortamda her
  instance kendi sayacını tutabildiği için limit teorik olarak biraz daha
  gevşek uygulanabilir. Kritik bir güvenlik açığı değil, sadece bilmen iyi.
- Webhook uç noktası (`/api/webhooks/:provider`) ham body okuyacak şekilde
  zaten en başta kayıtlı; Vercel'de de aynı şekilde çalışır, ekstra ayar
  gerekmez.

## 7) Kendi alan adını bağlama (opsiyonel)

Settings → Domains → alan adını ekle, Vercel'in verdiği DNS kayıtlarını
(genelde bir `CNAME` veya `A` kaydı) alan adı sağlayıcında tanımla.
