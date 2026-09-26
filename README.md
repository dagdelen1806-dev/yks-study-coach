# YKS Çalışma Koçu

YKS öğrencilerinin konu ilerlemesini, deneme sonuçlarını, kaynak kullanımını, çalışma takvimini ve plan uyumunu takip eden React + Express + tRPC uygulaması.

## Gereksinimler

- Node.js 20 veya üzeri
- pnpm 9 veya üzeri
- MySQL/TiDB veritabanı (kalıcı hesap, deneme, kaynak ve takvim verileri için)
- Yapay zekâ özellikleri (fotoğraf okuma, AI plan, not AI, ses → metin) için OpenAI uyumlu bir sağlayıcı anahtarı (`LLM_API_KEY`)

## VS Code ile açma

1. ZIP dosyasını çıkarın.
2. Çıkan klasörü VS Code ile açın.
3. VS Code terminalinde şu komutları çalıştırın:

```bash
pnpm install
cp env.template .env
```

Windows PowerShell kullanıyorsanız:

```powershell
pnpm install
Copy-Item env.template .env
```

4. `.env` dosyasını kendi ortam bilgilerinizle doldurun.
5. Veritabanı bağlantısını doğruladıktan sonra migration’ları uygulayın:

```bash
pnpm db:push
```

6. Geliştirme sunucusunu başlatın:

```bash
pnpm dev
```

7. Tarayıcıda `http://localhost:3000` adresini açın.

## Faydalı komutlar

```bash
pnpm check    # TypeScript kontrolü
pnpm test     # Vitest testleri
pnpm build    # Production build
pnpm start    # Production build’i çalıştırır
pnpm resource-catalog --source=fixture --dry-run   # Kaynak kataloğu senkronizasyonu (bkz. docs/resource-catalog/)
```

## Ortam değişkenleri

`env.template` yalnızca değişken adlarını ve örnek değerleri içerir. Gerçek anahtarları veya veritabanı parolalarını ZIP içine koymayın.

- `DATABASE_URL`: MySQL/TiDB bağlantı adresi.
- `JWT_SECRET`: Oturum çerezlerini imzalamak için rastgele uzun gizli değer.
- `ADMIN_LOGINS`: Admin olacak e-posta/telefon listesi.
- `APP_URL`, `BREVO_API_KEY` / `RESEND_API_KEY`, `MAIL_FROM`: E-posta doğrulaması.
- `LLM_API_KEY` (+ isteğe bağlı `LLM_API_URL`, `LLM_MODEL`, `TRANSCRIBE_MODEL`): Yapay zekâ sağlayıcısı.

Giriş, uygulamanın kendi e-posta/telefon + şifre sistemiyle yapılır; dış bir kimlik sağlayıcısı gerekmez.

## Özellikler

- TYT/AYT konu haritası ve konu durumu takibi
- Deneme sonucu, süre ve konu bazlı net analizi
- PDF/görsel sonuç belgesi içe aktarma altyapısı
- AI haftalık çalışma planı
- Öğrenci kaynak rafı, kaynak çözüm ritmi ve kitap önerileri
- Yayıncı bağımsız kaynak kataloğu, zorluk motoru (kural + AI hibrit) ve kişisel kaynak önerileri (bkz. `docs/resource-catalog/`)
- Günlük/haftalık/aylık çalışma takvimi
- Odak modu, sayaç, nefes egzersizi ve mola bildirimleri
- Plan Uyum Merkezi
- Oturum, süre, soru ve zamanında çalışma skorları
- AI koç karar motoru ve kalıcı koç uyarıları

## Notlar

- Uçak modu tarayıcı güvenlik kısıtları nedeniyle otomatik açılamaz; uygulama yalnızca hatırlatma gösterir.
- `LLM_API_KEY` olmadan uygulama çalışır; yalnızca yapay zekâ özellikleri "servis açılmamış" der.
- `node_modules`, `dist`, `.env` ve Git geçmişi paylaşım ZIP’ine dahil edilmemiştir.
