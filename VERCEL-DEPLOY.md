# Vercel'e yayına alma

Bu proje (kalıcı çalışan Express sunucusu + arka planda sürekli çalışan bir
zamanlayıcı) Vercel'in sunucusuz (serverless) modeline birebir uymuyordu; bu
yüzden `vercel.json`, `server/_core/app.ts` ve `server/_core/vercelHandler.ts`
eklenerek Vercel için uyarlandı. Yerel geliştirme (`npm run dev`) ve
geleneksel/kalıcı sunucu barındırma (Railway/Render/bir VPS, `npm run build
&& npm start`) hâlâ eskisi gibi çalışıyor — hiçbir şey bozulmadı.

**Önemli mimari not**: `api/index.js` (Vercel'in çalıştırdığı gerçek
fonksiyon) repoda YOK — `npm run build:vercel` (`vercel.json`'daki
`buildCommand`) `server/_core/vercelHandler.ts`'i esbuild ile TEK bir
dosyaya paketleyip build sırasında üretir. Bunun nedeni: Vercel'in kendi
zero-config TypeScript derleyicisi, `/api` klasörü dışındaki (`../server/...`)
relative import'ları ayrı dosyalar olarak bırakıyor ve Node'un native ESM
loader'ı bunları çözemeyip `ERR_MODULE_NOT_FOUND` ile çöküyor — canlıda
tam olarak bu yaşandı ve `Logs` sekmesinden doğrulandı. Kendi bundle'ımız
(node_modules paketleri hariç her şeyi tek dosyaya gömer) bu sorunu ortadan
kaldırır. `server/_core/vercelHandler.ts`'i düzenlemen gerekirse orası
kaynak dosya; `api/index.js`'i asla elle düzenleme, o üretilen bir çıktı.

## 0) Deployment Protection'ı kapat (beyaz ekran sorununun asıl nedeni)

Vercel, projenin `.vercel.app` alan adına gelen HER isteği (hem `/` hem
`/api/*`) varsayılan olarak **Vercel Authentication** (Deployment
Protection / SSO) ile korur — ziyaretçi Vercel hesabına giriş yapmadıysa
istek `vercel.com/sso-api` üzerinden `vercel.com/login`'e yönlendirilir ve
uygulamanın kendi HTML/JS'i tarayıcıya hiç ulaşmaz. Bu, "beyaz ekran"
şikayetinin klasik nedenidir — kod hatası değildir.

Kapatmak için: Vercel Dashboard → proje → **Settings → Deployment
Protection** → **Vercel Authentication**'ı Production için kapat (ya da
"Standard Protection"tan "Disabled"a al). Kaydettikten sonra `/` adresini
tekrar aç; artık gerçek uygulamayı görmelisin.

## 1) Vercel'de projeyi oluştur

1. [vercel.com](https://vercel.com) → GitHub hesabınla giriş yap.
2. **Add New → Project** → GitHub'daki `yks-study-coach` deposunu seç → **Import**.
3. Vercel "Vite" framework'ünü otomatik algılayabilir; sorun değil, `vercel.json` build ayarlarını zaten override ediyor (`buildCommand: npm run build:vercel`, `outputDirectory: dist/public`). Bu ekranda ekstra bir şey değiştirmene gerek yok.
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
| `ADMIN_LOGINS` | Admin olacak e-posta/telefon (virgülle birden fazla yazılabilir, ör. `ben@ornek.com`). E-posta hesabı, adresini **doğruladığı anda** admin + onaylı olur (doğrulanmadan asla). Telefon için doğrulama yok — telefonla admin tanımlarsan deploy'dan hemen sonra o numarayla kayıt ol. |
| `APP_URL` | **Zorunlu.** Doğrulama linklerinin kök adresi, `https://` ile: ör. `https://yks-study-coach.vercel.app` (kendi alan adın varsa o). Sona `/` koyma. |
| `BREVO_API_KEY` | **Mail için bu ya da `RESEND_API_KEY` zorunlu** (ikisi birden varsa Brevo kullanılır). Kendi alan adın yoksa Brevo: [brevo.com](https://www.brevo.com) → SMTP & API → API Keys. Ayrıca **Senders** bölümünde `MAIL_FROM` adresini doğrula. Hiçbir sağlayıcı yoksa kayıt olur ama kullanıcı "E-postanı doğrula" ekranında kalır. |
| `RESEND_API_KEY` | Resend kullanacaksan. Dikkat: alan adı doğrulamadan (`onboarding@resend.dev`) **yalnızca Resend hesabının kendi adresine** gönderir, öğrencilere gitmez. |
| `MAIL_FROM` | Gönderen, `Ad <adres>` biçiminde, ör. `Pusula YKS <ben@gmail.com>`. Brevo'da doğrulanmış gönderen adresi; Resend'de doğrulanmış alan adından bir adres olmalı. |
| `LLM_API_KEY` (veya `OPENAI_API_KEY`) | **Fotoğraf okuma (OCR), AI Planım, not AI ve ses → metin için gerekli.** OpenAI uyumlu herhangi bir sağlayıcının anahtarı. Yoksa bu özellikler "servis açılmamış" der, uygulamanın geri kalanı çalışır. |
| `LLM_API_URL` | İsteğe bağlı. Varsayılan `https://api.openai.com/v1`. Gemini için `https://generativelanguage.googleapis.com/v1beta/openai`. |
| `LLM_MODEL` | İsteğe bağlı; görsel okuyabilen bir model. Varsayılan `gpt-4o-mini` (Gemini için ör. `gemini-2.5-flash`). |
| `TRANSCRIBE_MODEL` | İsteğe bağlı; ses → metin modeli, varsayılan `whisper-1` (OpenAI). Gemini'de bu uç nokta yok — sesli notta tarayıcı diktesine düşülür. |
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

> **E-posta doğrulaması eklendiğinde (migration `0014_email_verification`):**
> yeni kodu deploy etmeden ÖNCE bu migration'ı bulut veritabanına uygula
> (yukarıdaki `drizzle-kit migrate` komutu, yalnızca iki nullable sütun ekler,
> mevcut veriye dokunmaz). Sütunlar yokken yeni kod `users` sorgularında hata verir.

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
