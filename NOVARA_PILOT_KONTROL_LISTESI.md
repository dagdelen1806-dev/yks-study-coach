# Akademik Takip — Pilot Dershane Kontrol Listesi

**Kapsam:** Novara Rehber akademik takip döngüsü (G0–G3) ve onu besleyen öğrenci, öğretmen ve kurum ekranları.
**Pilot biçimi:** tek kurum, özellik yalnızca o kurumda açık (`Ayarlar → Kurum bilgileri → Akademik takip`).
**Durum (23.10.2026):** kod `lgs-support` dalında, push edilmedi; canlı ortam hâlâ eski sürüm.

Her madde ya ✅ (yapıldı ve doğrulandı) ya da ☐ (pilottan önce yapılmalı) ile işaretlidir. "Kim" sütunu sorumluyu gösterir.

---

## 1. Pilottan önce kapanması gereken kapılar

| # | Madde | Kim | Durum |
|---|---|---|---|
| 1.1 | **Supabase geçişi** (23.10.2026): proje `pusulastudy` (eu-west-1), 61 tablo, tümünde RLS; Vercel `DATABASE_URL` = havuzlayıcı 6543, fonksiyonlar `dub1`; canlıda giriş ve veri doğrulandı | Kurucu + Claude | ✅ |
| 1.2 | **Supabase Storage:** Vercel'de `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; canlıda fotoğraf yüklendi, `pusula-media` özel bucket'ından imzalı bağlantıyla sunuldu | Kurucu + Claude | ✅ |
| 1.3 | **Saat dilimi:** sunucu Türkiye saatine sabit (`server/_core/timezone.ts`); canlıda öğretmen görevi 18:40 → öğrencide 18:40 (UTC 15:40), bildirimde de 18:40 | Claude | ✅ |
| 1.4 | **Hukuk:** KVKK aydınlatma ve veli rıza metinleri (taslak: `shared/parent.ts`, kurum KVKK şablonu). Akademik takip ve **mahrem not kuralı** aydınlatma metnine eklenmeli: "Öğretmen notlarını yalnızca yazan ve öğrencinin sorumlu öğretmenleri görür; kurum yöneticisi ve veli görmez." | Kurucu + hukuk | ☐ |
| 1.5 | **E-posta sağlayıcısı:** `BREVO_API_KEY` (ya da `RESEND_API_KEY`) ve doğrulanmış `MAIL_FROM`; öğretmen özetinin pazar gönderimi için şart | Kurucu | ☐ |
| 1.6 | **Marka:** uygulama ve e-postalar hâlâ "Pusula YKS". Pilotta hangi ad görünecek? | Kurucu | ☐ |
| 1.7 | **Fiyat:** pilot kurum için paket ve süre (Kurum Paneli → Ayarlar → Üyelik) | Kurucu | ☐ |

## 2. Yazılımın hazır olan kısmı

| # | Madde | Doğrulama | Durum |
|---|---|---|---|
| 2.1 | İnceleme önerisi: aynı sınav türü, aynı dönem, 75 gün, son 3 tam deneme, her adım düşüş + toplam ≥ 5 net (LGS 3); veri yetersizse öneri yok, nedeni yazılır | `server/academicCase.test.ts` | ✅ |
| 2.2 | Takip dosyası: aynı risk ikinci dosya açmaz; kanıt anlık görüntüsü; eylemler tekrar yazılmaz | `server/academicCases.test.ts` | ✅ |
| 2.3 | Eldeki kitaplardan öneri; katalog önerisi yalnızca rafta karşılığı olmayan konu için, en fazla 3 | `server/academicCases.test.ts` | ✅ |
| 2.4 | Plan ve tek görev: okul, dershane ders programı ve öğrencinin planlı saatlerine yazılmaz; uygun ilk saat önerilir | `academicCase.test.ts`, `orgIsolation.test.ts` (10) | ✅ |
| 2.5 | Mahrem notlar: kurum yöneticisi ve veli göremez, yönetici başkasının notunu silemez | `orgIsolation.test.ts` (8), `academicCases.test.ts`, e2e | ✅ |
| 2.6 | Öğrenciye görev bildirimi (zil + varsa telefon bildirimi); bildirimde dosya ya da risk dili yok | `academicCases.test.ts` | ✅ |
| 2.7 | Öğretmenin haftalık özeti: yeni inceleme önerileri, açık ve 7 günden uzun işlemsiz dosya sayısı; özellik kapalı kurumda bölüm yok | `teacherDigest.test.ts`, `academicCases.test.ts` | ✅ |
| 2.8 | Ekranlar: Akademik takip sayfası, öğrenci detayında Takip dosyası, öğrencide "Bu haftaki çalışmalar", Ayarlar anahtarı; telefonda (390 px) taşma yok | e2e + ekran kontrolü | ✅ |
| 2.9 | Kurumlar arası izolasyon, yanlış rol, denetim kaydı | `orgIsolation.test.ts`, `academicCases.test.ts` | ✅ |
| 2.10 | Tüm testler | birim 680+, e2e 23 | ✅ |

## 3. Pilot kurumun kurulumu (sırayla)

| # | Adım | Nerede |
|---|---|---|
| 3.1 | Platform yöneticisi kurumu ve kurum yöneticisi hesabını oluşturur, paketini tanımlar | Yönetim → Kurumlar |
| 3.2 | Kurum yöneticisi öğretmenleri **branşlarıyla** davet eder | Kurum Paneli → Ayarlar → Öğretmenler |
| 3.3 | Sınıfları açar ve her sınıfa **sorumlu öğretmen** atar (takip dosyalarının sahibi ve mahrem notların okuyucusu budur) | Ayarlar → Sınıflar |
| 3.4 | Öğrenci davet kodlarını dağıtır; öğrenciler KVKK onayıyla katılır ve sınıflarına eklenir | Davetler, Sınıflar |
| 3.5 | Haftalık ders saatlerini ve öğretmenleri girip programı **otomatik dağıtır**, kaydeder | Ders programı → Otomatik dağıt |
| 3.6 | **Akademik takibi açar** | Ayarlar → Kurum bilgileri |
| 3.7 | Öğretmenlere ve öğrencilere kullanıcı sunumu gösterilir | Sunum: "Pusula ve Kurum Paneli: Kullanıcı Rehberi" |

**Veri notu:** Kurum deneme sonuçlarını aktarma (Connect) henüz yok; öneriler öğrencilerin kendi girdiği denemelere dayanır ve **"orta güven"** gösterilir. Pilotta öğrencilerden denemelerini düzenli girmeleri istenmeli; en az 3 deneme olmadan öneri çıkmaz.

## 4. Pilot süresince ölçülecekler (4–6 hafta)

Hepsi veritabanından sayılabilir; yapay zekâ kullanılmaz.

| Ölçü | Neden | Kaynak |
|---|---|---|
| Önerilerden açılan dosya oranı | Önerinin öğretmene anlamlı gelip gelmediği | `academic_cases.openedByUserId` + öneri listesi |
| Açılmayan öneriler (öğretmenin "gerek yok" dediği) | Yanlış alarm oranı | öneri listesi − açılan dosyalar |
| Dosya başına ortalama süre ve eylem sayısı | Döngünün işleyip işlemediği | `case_actions`, `case_evaluations` |
| 7 günden uzun işlemsiz dosya sayısı | Takipte tıkanma | haftalık özet / `caseSummary` |
| Görevlere öğrenci geri bildirim oranı ("Tamamladım / Zorlandım / Tekrar etmeliyim") | Öğrencinin döngüye katılımı | `study_plan_sessions.studentFeedback` |
| "Plan için uygun saat yok" sayısı | Plan yerleşiminin yeterliliği | önizleme sonuçları (gerekirse olay kaydı eklenir) |
| Sonraki denemede net değişimi (yalnızca bilgi) | Sonuç **otomatik ilan edilmez**; öğretmenin kararıyla birlikte okunur | `case_evaluations.netChange`, `teacherOutcome` |

Haftalık 15 dakikalık bir görüşmede pilot kurumun sorumlu öğretmenlerinden geri bildirim alınması önerilir: öneri dili, plan önizlemesi, notların mahremiyeti.

## 5. Geri alma

- **Özellik kapatma:** Ayarlar'daki anahtar kapatılınca Akademik takip menüsü boş durum gösterir, öğrenci detayından sekme kalkar, özet e-postasından bölüm çıkar. Veri silinmez; yeniden açılınca kaldığı yerden devam eder.
- **Kod geri alma:** migration yalnızca ekleme yaptığı için yeni tablolar kalsa da eski sürüm çalışır.
- **Mahrem not kuralı** geri alınmamalı (hukuki taahhüt); değiştirilecekse aydınlatma metni de değişir.

## 6. Pilot sonrası (sıradaki geliştirmeler)

1. **Connect:** kurum deneme sonuçlarının ve öğrenci listesinin CSV/Excel ile aktarılması (güveni "yüksek"e taşır).
2. Pusula Aşama 2a: çalışma kayıtlarında konu kimliği ve tek kayıt noktası ("tekrarlanan konu yanlışı" kuralı için).
3. Veli gelişim merkezi: öğretmenin veliyle paylaşmayı seçtiği öneriler.
4. Ölçümlere göre eşiklerin (5 net / 3 net, 75 gün) kurum ayarına açılması.
