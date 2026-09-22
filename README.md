# YKS Çalışma Koçu

YKS öğrencilerinin konu ilerlemesini, deneme sonuçlarını, kaynak kullanımını, çalışma takvimini ve plan uyumunu takip eden React + Express + tRPC uygulaması.

## Gereksinimler

- Node.js 20 veya üzeri
- pnpm 9 veya üzeri
- MySQL/TiDB veritabanı (kalıcı hesap, deneme, kaynak ve takvim verileri için)
- AI özellikleri kullanılacaksa Manus built-in LLM ortam değişkenleri

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
- `VITE_APP_ID`: OAuth uygulama kimliği.
- `OAUTH_SERVER_URL`: OAuth sunucu adresi.
- `OWNER_OPEN_ID`: Geliştirme sahibi kimliği.
- `BUILT_IN_FORGE_API_URL`: AI ve Manus built-in API adresi.
- `BUILT_IN_FORGE_API_KEY`: Sunucu tarafı built-in API anahtarı.

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
- Manus OAuth ve built-in API değişkenleri olmadan uygulama demo/localStorage akışıyla açılabilir, ancak kalıcı hesap ve AI özellikleri çalışmaz.
- `node_modules`, `dist`, `.env`, Manus günlükleri ve Git geçmişi paylaşım ZIP’ine dahil edilmemiştir.
