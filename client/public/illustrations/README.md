# İllüstrasyonlar

Arayüz bu dosyaları kullanır; bir dosya yoksa o alan görselsiz çizilir (hata vermez).
Kaynak (büyük, düzenlenmemiş) görseller `docs/design/illustrations/` altında durur;
buraya yalnızca küçültülmüş sürümler konur, çünkü bu klasör sitede yayınlanır.

| Dosya | Nerede |
|---|---|
| `avatar-girl.webp`, `avatar-boy.webp` | Öğrencinin seçtiği avatar: karşılama alanı ve üst çubuk (512×512) |
| `hero-girl.jpg` | Kız avatarlı karşılama alanının arka planı (geniş manzara) |
| `summit.png` | Bayraklı zirve: kenar çubuğu, erkek/nötr karşılama alanı, motivasyon kartı |

İleride erkek avatar için de geniş bir manzara gelirse `hero-boy.jpg` adıyla eklenip
`client/src/components/app/Illustration.tsx` içindeki listeye yazılabilir.
