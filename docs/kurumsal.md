<!-- Durum: BEKLEMEDE — kullanıcı kararları (§10) gelene kadar uygulanmayacak. Kaydedildi: 2026-10-18. -->

# Focus KocSENLE — Mevcut Sistem Denetimi, MVP Kapsamı ve Kurumsal Ürün Raporu

> Salt okunur denetim, 2026-10-18. Bu çalışmada kod, şema, migration ya da yayın değişikliği yapılmadı. Rapor yalnızca bu dosyaya yazıldı.
>
> Etiketler:
> - **[Kodda doğrulandı]**: bu denetimde kodda görüldü.
> - **[Canlı testte doğrulandı]**: bu oturumda canlı sistemde ölçüldü.
> - **[Doğrulanamadı]**: kanıtlanamadı.
> - **[Öneri]**: yeni fikir, henüz yok.
> - **[Hukuki görüş gerekli]**: hukukçu değerlendirmeli.
> - **[Kullanıcı kararı bekleniyor]**: senin vermen gereken karar.

---

## 1. Yönetici özeti

- **Teknoloji yığını brifingdeki gibi değil.** Projede Laravel ve Flutter yok. Gerçek yapı şu **[Kodda doğrulandı]**:
  - Arka uç: Node.js + Express + tRPC (`server/`).
  - Ön yüz: React 19 + Vite web uygulaması (`client/`).
  - Veritabanı: MySQL (Railway) + drizzle-orm, 23 migration (`drizzle/`).
  - Yayın: Vercel (`vercel.json`, `api/index.js`).
  - Mobil uygulama yok. `docs/releases/PHASE-4A-COMPLETION.md:8-12` bu karışıklığı daha önce de kaydetmiş.

  Bu yüzden "Laravel policy / middleware" önerilerinin hepsi aşağıda tRPC middleware ve servis katmanı karşılıklarıyla verildi.
- **Öğrenci ürünü olgun.** Deneme → yanlış/boş → eksik konu → görev → tekrar döngüsünün büyük kısmı kodda var (§2). Eksik olan halka, tamamlanan görevin bir sonraki denemeyle otomatik karşılaştırılması.
- **Kurum katmanı sıfırdan kurulacak.** 41 tablonun hiçbiri kurum, sınıf ya da öğretmenle ilgili değil. Roller sadece `user` / `admin`. Tüm veri erişimi tek kullanıcı (`userId`) üzerinden kapsamlanıyor; çok kurumlu yetkiye geçiş en büyük ve en riskli iş.
- **Hazır temeller:** abonelik + deneme süresi + kota altyapısı, admin paneli, admin denetim kaydı, koç uyarıları ve plan uyumu. Kurumsal katman bunların üzerine kurulabilir.
- **En kritik üç karar:** (1) marka ve renk, (2) ilk müşteri bireysel mi kurum mu, (3) kurum öğrencisinin Premium'unu kimin ödeyeceği (§10).
- **En kritik iki risk:**
  - Kurumlar arası veri sızıntısı. Şu an tüm sorgular `ctx.user.id` ile kapsamlı; başka birinin verisini görmek diye bir kavram yok. Öğretmen erişimi bu modeli kökten değiştirir.
  - Reşit olmayan öğrencilerin verisi ve Gemini'ye giden fotoğraflar (§7).

---

## 2. Kodla doğrulanmış mevcut durum

| Alan | Durum | Kanıt |
|---|---|---|
| Kimlik doğrulama | Yerel e-posta/telefon + şifre (scrypt), oturum çerezi `app_session_id`, e-posta doğrulama, manuel admin onayı | `server/_core/localAuth.ts`, `shared/const.ts:1`, `users.approvalStatus` (`drizzle/schema.ts:3`) |
| Yetki katmanı | `publicProcedure`, `protectedProcedure` (giriş + e-posta + onay), `adminProcedure` (`role==='admin'`), `entitlementProcedure`, `metredFeatureProcedure` | `server/_core/trpc.ts:14,49,51,96` |
| Roller | Yalnızca `user` ve `admin` | `drizzle/schema.ts` `users.role` |
| Veri izolasyonu | Her uç `ctx.user.id` ile kapsamlı; `server/dataIsolation.test.ts` içinde 2 test | `server/dataIsolation.test.ts:34-64` |
| Öğrenci profili | Hedef, günlük süre, ders programı, avatar | `student_profiles` (`schema.ts:468`), `server/routers/onboarding.ts` |
| Çalışma planı ve görevler | Haftalık plan, oturumlar, tamamlama, gecikeni yeniden planlama, ders programına göre boş zaman | `study_plans`, `study_plan_sessions`, `shared/calendarLogic.ts`, `shared/classSchedule.ts` |
| Denemeler | TYT/AYT, ders netleri, konu bazında doğru/yanlış/boş, belgeden aktarma | `user_mock_exams`, `client/src/pages/exams/ExamsDashboard.tsx`, `examDocument.extract` |
| Konu analizi | Konu ilerlemesi ve durumu (`deriveTopicStatus`), veri yetersizliği bayrağı | `topic_progress`, `shared/topicStatus.ts` |
| Soru defteri | Soru kartları, aralıklı tekrar, AI çözüm, benzer soru, hata haritası | `notebook_questions`, `question_attempts`, `server/routers/questions.ts` |
| Koç uyarıları ve plan uyumu | Kural tabanlı uyum skoru ve uyarılar | `coach_alerts` (`schema.ts:688`), `plan_adherence_reports` (`schema.ts:433`) |
| AI | Gemini (OpenAI uyumlu uç), 3 model kademesi, kademe yükseltme ve yedek model | `server/_core/llm.ts`, `shared/solveRouting.ts` |
| Kota | 30 günlük kayan pencerede kullanım sayısı, sadece başarılı çağrı sayılır | `shared/entitlements.ts:48,58`, `server/subscriptions/entitlementService.ts:134`, `feature_usage_logs` (`schema.ts:820`) |
| AI önbelleği | Kitap OCR sayfa önbelleği; AI çözümü karta kaydedilir (tekrar açmak ücretsiz) | `ocr_page_cache` (`schema.ts:337`), `saveAiSolution` |
| AI maliyet takibi | **Yok.** Sağlayıcının döndüğü token sayısı tipte var ama hiçbir yerde saklanmıyor; kullanım kaydında model ya da token bilgisi yok | `server/_core/llm.ts:99-100`; `feature_usage_logs` sütunları `id, userId, featureKey, usedAt` |
| Abonelik | Planlar (`free / premium / premium_plus`), deneme süresi, dönem, ek süre (grace), iptal, durumlar (`trialing…expired`) | `subscription_plans` (`schema.ts:710`), `subscriptions` (`schema.ts:733`) |
| Ödeme | Sağlayıcı soyutlaması: `mock` (varsayılan), `apple`, `google`. Web için gerçek sağlayıcı (iyzico/Stripe) **yok**; `web` seçeneği mock'a düşüyor | `server/subscriptions/paymentProviders/factory.ts:15-25` |
| Admin | Kullanıcılar, abonelikler, ödemeler, kullanım, analitik, denetim kaydı, sistem (AI sağlık testi) | `server/routers/admin/*.ts` |
| Dosyalar | Fotoğraf ve ses kayıtları MySQL içinde `mediumblob` olarak saklanıyor | `note_attachments` (`schema.ts:262`) |
| Arka plan görevleri | Tek cron: kaynak kataloğu senkronu (platform seviyesinde, kullanıcı verisi değil) | `vercel.json` `crons` |
| Testler | 52 dosya, 508 test, hepsi geçiyor (veritabanı ve AI mock'lu) | `npx vitest run` |

### Güvenlik ve teknik borç bulguları **[Kodda doğrulandı]**
1. **Zayıf şifre kuralı:** en az 4 karakter (`server/_core/localAuth.ts:70`). Kurumsal kullanımda en az 8 karakter ve kırık şifre listesi kontrolü önerilir.
2. **Dosyalar veritabanında:** yedekler öğrenci fotoğraflarını ve seslerini de içeriyor. Saklama ve silme politikası olmadan KVKK riski yaratır.
3. **Hesap silme ve veri dışa aktarma:** öğrencinin kendi hesabını silmesi ya da verisini indirmesi için uç bulunamadı. Admin tarafında `accountStatus = deleted` var (yumuşak silme). Öğrenci tarafı **[Doğrulanamadı]**.
4. **AI çağrılarının kayıt yetersizliği:** model, token ve maliyet yok. Kataloğun zorluk sınıflandırması (`resourceCatalog/difficulty/aiClassifier.ts`) ve konu eşleştirme (`bookContent/aiMapper.ts`) kotasız; bunlar platform maliyeti.
5. **AI onayı sadece tarayıcıda:** soru çözme onayı `localStorage` içinde tutuluyor (`SOLVE_CONSENT_KEY`); sunucuda onay kaydı yok.
6. **Tek büyük dosya:** `client/src/pages/Home.tsx` hâlâ yaklaşık 1.200 satır. Takvim, Kaynaklar ve AI Planım burada; kurumsal ekranlar ayrı dosyalarda yazılmalı.

### Marka envanteri **[Kodda doğrulandı]**
- "Pusula" adı 20 dosyada 55 kez geçiyor:
  - Sekme başlığı: `client/index.html`
  - Arayüz: `Home.tsx` (logo, "Pusula Odak"), `OnboardingFlow.tsx`, `VerifyEmailScreen.tsx`, `PremiumGate.tsx`
  - E-postalar: `server/_core/emails/verifyEmail.ts`, `server/_core/mailer.ts`
  - Sabit metinler: `shared/yksData.ts` (alt bilgi uyarısı), `shared/focusPlan.ts`, `shared/onboarding.ts`, `shared/palette.ts`, `index.css`
  - Testler (`mailer.test.ts` vb.) ve bir HTTP kimliği (`kitapIslerSource.ts`).
- "YKS-SenKoç" kodda **yok**; sadece tasarım referans görsellerinde geçiyor.
- **Teknik adlar:** `localStorage` anahtarları `pusula-yks-*`, çerez `app_session_id`, repo adı `yks-study-coach`. Bunlar kullanıcıya görünmüyor ve **değiştirilmemeli**. Değiştirmek, kullanıcıların tarayıcıdaki önbelleğini sıfırlar.
- **Tasarım sistemi:** teal `#17625f`, sarı `#f2b934`, Plus Jakarta Sans; bileşenler `client/src/components/app/kit.tsx`.
- **Logo:** lacivert yuvarlak kare içinde camgöbeği hedef tahtası ve ok. Mevcut paletle uyuşmuyor (§10, karar 3).

---

## 3. Envanter tablosu

| Modül | Mevcut durum | Kanıtlanan dosya | Veritabanı/API | Eksikler | Önerilen işlem |
|---|---|---|---|---|---|
| Kimlik ve onay | Doğrulandı | `localAuth.ts`, `trpc.ts` | `users`, `auth.*` | Şifre politikası, kurum daveti ile kayıt | Şifre kuralını güçlendir; davet bağlantısıyla kayıt |
| Rol ve yetki | Sadece user/admin | `trpc.ts:49-60` | `users.role` | Kurum rolleri, kurum kapsamı | Kurum üyeliği tablosu ve kurum kapsamlı middleware **[Öneri]** |
| Öğrenci profili | Doğrulandı | `routers/onboarding.ts` | `student_profiles` | Kurum ve sınıf bağlantısı | Ayrı üyelik tablosu (profil şeması değişmeden) |
| Plan ve görev | Doğrulandı | `calendarLogic.ts`, `routers.ts:295` | `study_plans`, `study_plan_sessions` | Öğretmenin görev ataması, atayan bilgisi | Oturuma `assignedByUserId` / kaynak alanı **[Öneri]** |
| Deneme analizi | Doğrulandı | `ExamsDashboard.tsx` | `user_mock_exams`, `exams.*` | Kurum geneli toplama, deneme düzenleme ucu | Toplama sorguları; ayrı düzenleme ucu |
| Konu hâkimiyeti | Doğrulandı | `topicStatus.ts` | `topic_progress`, `topics.progress` | Sınıf bazında toplama | Toplama sorgusu |
| Soru defteri ve AI çözüm | Doğrulandı | `routers/questions.ts` | `notebook_questions` | Öğretmen görünürlüğü kararı | Varsayılan: öğretmen görmez (karar 9) |
| Koç uyarıları | Kural tabanlı, kısmi | `planAdherence.ts`, `coach_alerts` | `calendar.refreshCoach` | Zamanlanmış üretim, öğretmene yönlendirme | Cron + risk kuralları (Aşama 3) |
| AI ve kota | Doğrulandı | `llm.ts`, `entitlements.ts` | `feature_usage_logs` | Token/maliyet kaydı, kurum havuzu | `ai_usage_events` tablosu **[Öneri]** |
| Abonelik ve ödeme | Bireysel; mock/Apple/Google | `paymentProviders/factory.ts` | `subscriptions`, `payments` | Kurum aboneliği, koltuk, web ödeme sağlayıcısı | Kurum aboneliği + koltuk tablosu |
| Admin ve denetim | Abonelik denetim kaydı var | `routers/admin/audit.ts` | `subscription_audit_logs` | Kurum işlemleri denetim kaydı | Genel `audit_logs` tablosu **[Öneri]** |
| Dosyalar | Veritabanında blob | `attachmentStorage.ts` | `note_attachments` | Saklama süresi, silme | Saklama politikası ve silme işi |
| Veli | Yok | — | — | Tamamı | Aşama 3 sonrası ve hukuki görüşle |

---

## 4. MVP ve sonraki aşamalar matrisi (büyüklükler tahmindir; S ≤ 2, M 3–6, L 7–15 kişi-gün)

| Özellik | Aşama | Öncelik | Mevcut altyapı | Bağımlılık | Büyüklük |
|---|---|---|---|---|---|
| Kurum oluşturma (platform admini) | MVP | P0 | Admin paneli | Kurum tablosu | S |
| Kurum üyeliği ve rolleri (yönetici/koordinatör/öğretmen/öğrenci) | MVP | P0 | Yok | Kurum tablosu | M |
| Kurum kapsamlı yetki katmanı (`orgProcedure`) + izolasyon testleri | MVP | P0 | `trpc.ts` middleware deseni | Üyelik | L |
| Davet akışı (e-posta/kod, kabul, iptal, süre) | MVP | P0 | Mailer, doğrulama akışı | Üyelik | M |
| Öğrenci–öğretmen ataması | MVP | P0 | Yok | Üyelik | S |
| Kurum paneli (özet kartlar, öğrenci listesi) | MVP | P0 | Kit bileşenleri, mevcut sorgular | Yetki katmanı | M |
| Öğrenci detayı (salt okunur) | MVP | P0 | Genel Bakış ve Denemeler hesaplamaları | Yetki katmanı | M |
| Kritik işlemlerin denetim kaydı | MVP | P0 | `subscription_audit_logs` deseni | Üyelik | S |
| Kurumdan ayrılma ve üyelik sonlandırma | MVP | P0 | Yok | Üyelik | S |
| Sınıflar | MVP (basit) / A2 | P1 | Yok | Üyelik | S |
| Öğretmen görev ataması | Aşama 2 | P1 | `calendar.savePlan` | Atama | M |
| Görüşme notları (öğrenciye kapalı) | Aşama 2 | P1 | Yok | Atama + KVKK kararı | M |
| Haftalık koçluk raporu | Aşama 2 | P1 | Plan uyumu | Panel | M |
| Sınıf karşılaştırma ve gelişmiş analiz | Aşama 2 | P2 | Toplama sorguları | Sınıflar | M |
| Risk uyarıları (zamanlanmış) | Aşama 2–3 | P1 | `coach_alerts` | Cron | M |
| Kurumsal abonelik ve koltuk | Aşama 3 (pilot ücretsiz) | P1 | `subscriptions` | Üyelik | L |
| AI maliyet takibi | Aşama 3 (MVP'de kayıt başlasın) | P1 | `llm.ts` | Yeni tablo | M |
| Çok şube | Aşama 3 | P2 | Yok | Kurum hiyerarşisi | L |
| Web ödeme sağlayıcısı | Aşama 3 | P1 | Sağlayıcı soyutlaması | Sağlayıcı seçimi | L |

**Bilinçli olarak MVP dışında:** yeni OCR özellikleri, mobil uygulama, veli erişimi, entegrasyonlar.

**Önemli not:** pilot kurum Aşama 3 olmadan, manuel ya da ücretsiz Premium tanımlamasıyla başlayabilir. Bunun için `subscriptions.isManualOverride` alanı kodda var.

---

## 5. Çok kurumlu mimari ve yetkilendirme **[Öneri]** (tablo adları kesin değil)

**Varlıklar (drizzle/MySQL):**
- `organizations`: id, ad, slug, durum
- `organization_members`: orgId, userId, rol (`owner | admin | coordinator | teacher | student`), durum (`invited | active | left | removed`), katılma ve ayrılma tarihleri, `invitedBy`
- `organization_invitations`: orgId, e-posta/telefon, rol, belirteç özeti (token hash), son geçerlilik, kabul ve iptal tarihi
- `teacher_assignments`: orgId, teacherUserId, studentUserId, aktif mi
- `organization_classes` ve `class_students`: basit sınıf ve üyelikleri
- `audit_logs`: orgId, aktör, işlem, hedef, eski ve yeni değer, ip

**Mevcut profile bağlantı:** öğrenci verisi (`userId` ile kapsamlı tüm tablolar) **değişmez**. Kurum erişimi yalnızca `organization_members` üzerinden kurulur, böylece öğrenci kurumdan ayrıldığında verisi kendisinde kalır.

**Birden fazla kurum:** şema desteklesin. Ürün kuralı olarak aynı anda tek aktif kurum önerilir (karar 6).

**Yetki katmanı (tRPC karşılığı; Laravel policy yerine):**
- `orgProcedure(minRole)`: girişteki kurum için üyeliği ve rolü veritabanından taze okur, `ctx.org` ve `ctx.membership` üretir.
- Öğrenci verisi okuyan her kurum ucu `assertCanViewStudent(ctx, studentUserId)` çağırır:
  - admin ve koordinatör: öğrenci aynı kurumda ve üyeliği aktif;
  - öğretmen: ek olarak aktif bir `teacher_assignments` kaydı;
  - aksi halde `NOT_FOUND` (kaydın var olup olmadığı sızdırılmaz).
- Kurum uçları öğrenci verisini mevcut servislere **açıkça `studentUserId` geçerek** okur. Mevcut öğrenci uçları (`ctx.user.id`) hiç değişmez.

**ID değiştirme saldırısı:** mevcut öğrenci uçları güvenli, çünkü tamamı `ctx.user.id` kullanıyor. Asıl risk yeni kurum uçlarında; parametre olarak gelen `studentUserId` mutlaka `assertCanViewStudent` kontrolünden geçmeli. Bunu her uç için tek tek denetlemek yerine, ortak bir yardımcıyla zorunlu kılmak önerilir.

**Arka plan görevleri, dosyalar ve AI:**
- Ekler (`/api/attachments/...`) şu an sahibine kapsamlı. Öğretmenin öğrenci fotoğrafını görmesi gerekirse ayrı ve yetki kontrollü bir uç gerekir.
- AI istekleri öğrenci adına yapılıyor. Kurum adına AI raporu (Aşama 2) kurumun kotasından düşmeli.
- Tek cron platform verisiyle çalışıyor; kurum verisine dokunmuyor **[Kodda doğrulandı]**.

**İzolasyon testleri (kabul kriteri):**
1. A kurumunun öğretmeni, B kurumundaki öğrencinin ID'siyle detay, deneme ve görev isteğinde `NOT_FOUND` alır.
2. Öğretmen, aynı kurumda ama kendisine atanmamış öğrenciyi göremez.
3. Kurumdan ayrılan öğrencinin verisi, ayrıldığı andan itibaren kurum uçlarından görünmez.
4. Daveti iptal edilmiş ya da süresi geçmiş belirteç kabul edilmez; aynı belirteç ikinci kez kullanılamaz.
5. Öğrenci, kendi ID'si dışındaki hiçbir kurum ucunu çağıramaz.
6. Kurum admini başka kurumun üyelik ya da rolünü değiştiremez; rol yükseltme (öğretmenin kendini admin yapması) engellenir.
7. Toplama sorguları (kurum paneli) yalnızca aktif üyeleri sayar.
8. Görüşme notları öğrenci uçlarından ve atanmamış öğretmenden görünmez.
9. Her kritik işlem `audit_logs` kaydı üretir.

---

## 6. Kurumsal panel modülleri ve veri kaynakları

Etiketler: **1** mevcut veriden hemen hesaplanır, **2** veri var ama ek sorgu/API gerekir, **3** yeni alan ya da tablo gerekir, **4** güvenilir hesap için yeterli veri yok.

| Modül / gösterge | Etiket | Kaynak |
|---|---|---|
| **Kurum ana paneli** | | |
| Aktif öğrenci sayısı | 3 | Üyelik tablosu + `users.lastSignedIn` |
| Plan tamamlama oranı | 2 | `study_plan_sessions.status` (kurum toplamı) |
| Son deneme netleri | 2 | `user_mock_exams` |
| Takip gerektiren öğrenciler | 2 / 4 | Plan uyumu + `coach_alerts`. Kural tanımı yeni; veri azsa güvenilir değil |
| Sınıf ve öğretmen özetleri | 3 | Sınıf ve atama tabloları |
| **Öğrenci listesi ve detay** | | |
| Profil, hedef | 1 | `student_profiles` |
| Sınıf, atanan öğretmen | 3 | Yeni tablolar |
| Plan ilerlemesi | 1 | `study_plan_sessions` |
| TYT/AYT net geçmişi | 1 | `user_mock_exams` |
| Konu eksikleri | 1 | `topic_progress` + deneme konu detayları |
| Soru kayıtları | 1 (görünürlük kararı gerekli) | `notebook_questions` |
| Son etkinlik | 2 | `lastSignedIn`, son log ya da oturum |
| Rapor geçmişi | 3 | Rapor tablosu |
| **Akademik analiz** | | |
| Ders ve konu başarısı | 2 | Toplama |
| Denemeler arası değişim | 1 | — |
| Hedef ve gerçekleşen net | 4 | Profilde hedef net yok, sadece sıralama var |
| Süre ve görev eğilimi | 1 / 2 | `topic_study_logs`. Not: süre hatası bu oturumda düzeltildi; eski tamamlanan görevler 0 dk görünebilir |
| **Öğretmen paneli** | | |
| Sorumlu öğrenciler | 3 | — |
| Görev atama | 2 / 3 | `savePlan` + atayan alanı |
| Geri bildirim, görüşme kaydı | 3 | — |
| **Kurum ayarları** | | |
| Davetler, sınıflar, yetkiler | 3 | — |
| Paket ve kullanım | 3 | Kurumsal abonelik |

### Kaba ekran taslakları (mevcut kit: `PageHeader`, `StatCard`, `Panel`, `Segmented`; teal tema)
```
[Sol menü: Kurum Paneli · Öğrenciler · Sınıflar · Öğretmenler · Raporlar · Ayarlar]   [Üst: Kurum adı ▾  🔔  Avatar]
┌ PageHeader: "Kurum Paneli" — açıklama ─────────────── [Öğrenci davet et] (birincil) ┐
│ StatCard×4: Aktif öğrenci | Bu hafta plan uyumu % | Son deneme ort. TYT | Takip gereken │
│ Panel "Takip gerektiren öğrenciler" (tablo: ad · sınıf · öğretmen · neden · son etkinlik → detay) │
│ Panel "Net gelişimi (kurum ort.)" Segmented TYT/AYT  │ Panel "Sınıf özetleri" (kartlar) │
└──────────────────────────────────────────────────────────────────────────────┘
Öğrenci detayı: Genel Bakış'ın salt okunur sürümü (hedef, net grafiği, konu hâkimiyeti, plan)
  + sekmeler [Denemeler | Konular | Plan | Notlar (yalnızca personel)]
Mobil: menü çekmece; tablolar kart listesine dönüşür; StatCard 2 sütun.
```

---

## 7. KVKK ve gizlilik risk değerlendirmesi (teknik analizdir, hukuki görüş değildir)

| Konu | Risk | Teknik önlem **[Öneri]** | Sorumlu | Doğrulama |
|---|---|---|---|---|
| Reşit olmayan öğrenciler | Yaş ve veli bilgisi tutulmuyor | Sınıf düzeyinden ya da beyandan yaş grubu; reşit olmayana özel akış | Ürün + hukuk | **[Hukuki görüş gerekli]** |
| Kurumun öğrenci verisine erişimi | Bireysel hesapta toplanan veriyi kurum görmeye başlıyor | Davet kabulünde açık aydınlatma metni ve erişim kapsamının gösterilmesi; kabul kaydının saklanması | Ürün | Kabul kaydı testi; **[Hukuki görüş gerekli]** (dayanak ve sorumlu/işleyen rolleri) |
| Kurumlar ve öğretmenler arası sınır | Sızıntı | §5'teki yetki katmanı ve testleri | Geliştirme | İzolasyon testleri |
| Görüşme notları | Öğrenciye ya da başka öğretmene sızması | Ayrı tablo, `visibility` alanı; öğrenci uçlarında hiç sorgulanmaz | Geliştirme | Test 8 |
| Saklama ve silme | Fotoğraf ve sesler veritabanında süresiz duruyor; öğrencinin kendi hesabını silme ucu bulunamadı | Hesap silme ve dışa aktarma uçları; ayrılmada saklama süresi; yedeklerin rotasyonu | Geliştirme + hukuk | **[Doğrulanamadı]** mevcut silme akışı; **[Hukuki görüş gerekli]** süreler |
| Dışa aktarma | Yok | Öğrencinin kendi verisini JSON/PDF indirmesi | Geliştirme | Uçtan uca test |
| Denetim kaydı | Sadece abonelik işlemleri kayıtlı | Genel `audit_logs` (§5) | Geliştirme | Test 9 |
| AI sağlayıcısına giden veri | Soru fotoğrafları ve ders programı Gemini'ye gidiyor. Bu oturumdaki canlı testte anahtarın ücretsiz pakette olduğu görüldü; ücretsiz pakette Google veriyi eğitimde kullanabilir. Onay sadece tarayıcıda | Ücretli pakete geçmek; onayı sunucuda kaydetmek; kişisel bilgiyi (ad vb.) göndermemek | Ürün + teknik | **[Canlı testte doğrulandı]** ücretsiz paket; **[Hukuki görüş gerekli]** yurt dışı aktarım |
| Loglar | Hata loglarında içerik kısaltılıyor ve anahtarlar maskeleniyor (`llm.ts` redaction) | Kişisel veri içeren log satırlarının taranması | Geliştirme | Kod incelemesi |
| Üçüncü taraflar | Railway (veritabanı), Vercel (sunucu), Gemini (AI), e-posta sağlayıcısı | Veri işleme sözleşmeleri listesi | Ürün | **[Hukuki görüş gerekli]** |

---

## 8. Gelir modeli ve AI maliyet çerçevesi

**Mevcut altyapı neyi destekliyor [Kodda doğrulandı]:**
- Bireysel abonelik: deneme süresi, dönem, ek süre, iptal.
- Apple, Google ve mock sağlayıcıları; webhook işleme.
- Manuel tanımlama (`isManualOverride`) ve kullanıcı başına kota.

**Desteklemedikleri:** kurum ödeyen, koltuk ve kota havuzu. Gerçek bir web ödeme sağlayıcısı da yok.

**Koltuk çerçevesi [Öneri]:**
- **Aktif öğrenci:** dönem içinde üyeliği `active` olan ve en az bir kez giriş yapmış öğrenci. Alternatif tanım: koltuğa atanmış her öğrenci (karar gerekli).
- **Koltuk kuralları:**
  - Kurum N koltuk satın alır; atama `organization_members` üzerinden yapılır.
  - Üye ayrıldığında koltuk boşalır; 24 saat beklemeden yeniden atanabilir.
  - Koltuk dolarsa yeni davet kabul edilmez.
- **Bireysel abonelikle çakışma:** öğrencinin etkin hakkı = max(bireysel plan, kurum paketi). Kurum aboneliği bitince öğrenci kendi planına döner; verisi kaybolmaz.
- **Abonelik biterse:** önce ek süre (grace), sonra kurum paneli salt okunur olur. Öğrencilerin kendi verisine erişimi sürer.
- **Paketler:** Başlangıç (panel + liste + detay), Profesyonel (+ öğretmen iş akışları, raporlar), Kurumsal (+ çok şube). Fiyat önerilmedi.

**AI maliyeti:**
- Gemini kullanımı **[Kodda doğrulandı]**.
- Anahtarın ücretsiz pakette olması **[Canlı testte doğrulandı]**.
- Faturalandırma bağlantısı, token ve maliyet verisi **yok**.
- Gerçek maliyet rakamı verilemez **[Doğrulanamadı]**.

Önerilen `ai_usage_events` kaydı: userId, orgId, özellik, model, kademe, giriş/çıkış token, önbellek isabeti, başarı, yeniden deneme sayısı, gecikme, zaman.

Formüller:
- `Öğrenci başına AI maliyeti = Σ_istek (girdi_token × girdi_fiyatı(model) + çıktı_token × çıktı_fiyatı(model)) / aktif_öğrenci`
- `AI maliyet oranı = toplam_AI_maliyeti / paket_geliri`
- `Paket başına AI limiti = floor((hedef_oran × koltuk_fiyatı) / ortalama_istek_maliyeti(özellik))`. Sonuç `shared/entitlements.ts` limitlerine kurum havuzu olarak yansıtılır.
- `Önbellek isabeti = önbellekten_dönen / toplam_istek`. Kaynaklar: OCR sayfa önbelleği ve kayıtlı AI çözümleri.

Ücretsiz ve ücretli kullanım ayrı izlenir; ücretsiz pakette maliyet 0, ama kota ve veri koşulları farklıdır.

---

## 9. Yol haritası

### Aşama 1 — Marka geçişi (toplam S–M)

| İş | Büyüklük | Ön koşul | Risk | Kabul kriteri | Dosyalar |
|---|---|---|---|---|---|
| Görünen ad ile teknik adı ayırma: tek bir `BRAND` sabiti | S | Karar 1 | Düşük | Arayüzde eski ad 0 kez geçer | Yeni `shared/brand.ts` (ad, kısa ad, slogan) |
| Arayüz metinleri ("Pusula", "Pusula Odak") | S | Karar 1–2 | "Pusula Odak" özellik adının yeni karşılığı | Ekran görüntüsü kontrolü | `Home.tsx`, `OnboardingFlow.tsx`, `VerifyEmailScreen.tsx`, `PremiumGate.tsx`, `shared/yksData.ts`, `shared/focusPlan.ts`, `shared/onboarding.ts` |
| Logo, favicon, uygulama ikonu | S | Logo dosyaları (SVG tercih) | Küçük boyutta okunurluk | 16/32/180/512 px ikonlar | `client/public/`, `client/index.html`, `Brand()` |
| Renk kararı uygulaması | S (teal kalırsa) / M (lacivert) | Karar 3 | Kontrast ve görsel regresyon | AA kontrast; tüm sayfaların ekran görüntüleri | `client/src/index.css`, `shared/palette.ts` |
| E-postalar ve gönderen adı | S | Karar 1 | Mail testleri güncellenmeli | Doğrulama maili yeni adla gelir | `server/_core/emails/verifyEmail.ts`, `mailer.ts`, `mailer.test.ts` |
| Mağaza metinleri | — | Mobil uygulama yok | — | Kapsam dışı | — |
| Değiştirilmeyecekler | — | — | Tarayıcı önbelleğinin sıfırlanması | `pusula-yks-*` anahtarları, çerez, repo adı aynı kalır | — |
| Yayın kontrol listesi | S | — | — | 508+ test, 9 sayfa × 2 ekran boyutu, konsol temiz | — |

### Aşama 2 — Kurumsal MVP (toplam yaklaşık L × 3)
Sıra:
1. Şema
2. `orgProcedure` + izolasyon testleri
3. Davet ve üyelik
4. Atama
5. Kurum paneli
6. Öğrenci detayı
7. Denetim kaydı
8. Pilot hazırlığı: manuel Premium, kurum aydınlatma metni

**Kabul kriteri:** §5'teki 9 testin tamamı geçer; pilot kurumda 1 admin, 2 öğretmen ve 20 öğrenci akışı uçtan uca çalışır.

### Aşama 3 — Analitik ve ticari ölçekleme
- Risk uyarıları için cron
- Haftalık rapor
- Görüşme notları
- `ai_usage_events` (kayıt MVP'de başlayabilir)
- Kurumsal abonelik ve koltuk
- Web ödeme sağlayıcısı
- Çok şube

---

## 10. Riskler ve kullanıcı kararları **[Kullanıcı kararı bekleniyor]**

| # | Soru | Önerilen varsayılan | Alternatif | Etki |
|---|---|---|---|---|
| 1 | Marka yazımı | "Focus KocSENLE" (kısa ad: "KocSENLE") | "Focus Koçsenle" vb. | Tüm metinler, e-postalar, logo |
| 2 | Pusula adı | Tamamen kalkar; "Pusula Odak" → "Focus" (odak modu adı) | Odak modunun adı olarak kalır | Marka tutarlılığı |
| 3 | Renk | Teal tasarım korunur, logo teal/koyu teal tonlarına uyarlanır | Lacivert/camgöbeği paletine geçiş | M iş + görsel regresyon |
| 4 | İlk hedef müşteri | Bireysel ürün sürer; 1 pilot dershaneyle MVP | Önce kurum satışı | Aşama 2'nin zamanlaması |
| 5 | Kurum öğrencisinin Premium'u | Kurum öder (koltuk); öğrenci kendi aboneliğini korur, hak = max | Öğrenci öder, kurum sadece paneli alır | Faturalama tasarımı |
| 6 | Birden fazla kurum | Şema destekler, aynı anda tek aktif kurum | Çoklu aktif üyelik | Yetki karmaşıklığı |
| 7 | Ayrılan öğrencinin geçmişi | Kurum erişimi ayrılınca biter; denetim kaydı kalır | Kurum belirli süre salt okunur görür | **[Hukuki görüş gerekli]** |
| 8 | Veli erişimi MVP'de mi | Hayır | Salt okunur veli raporu | KVKK yükü |
| 9 | Öğretmen notlarını kim görür | Notu yazan öğretmen + kurum admini/koordinatör; öğrenci görmez (ayrı "öğrenciye geri bildirim" alanı görür) | Tüm kurum personeli | Gizlilik |
| 10 | Kurumsal abonelik bağlantısı | Ayrı `organization_subscriptions`; entitlement servisi kurum hakkını da okur | Mevcut `subscriptions` tablosuna orgId | Mevcut abonelik kodunun değişme kapsamı |
| 11 | Soru defteri ve fotoğraflar öğretmene açık mı | Kapalı (öğrenci açarsa açık) | Varsayılan açık | Gizlilik ve pedagojik fayda |
| 12 | Gemini ücretli pakete geçiş | Kurum pilotundan önce mutlaka | Ücretsiz pakette pilot | Veri kullanımı ve kota |

---

## 11. Test ve kabul kriterleri
- **Mevcut:** 52 dosya ve 508 test, hepsi geçiyor; marka geçişinden sonra mail testleri güncellenecek.
- **Yeni:** §5'teki 9 izolasyon testi (router seviyesinde, mevcut `questionsRouter.test.ts` deseniyle); davet belirteci testleri; rol yükseltme testleri; koltuk dolma testi.
- **Görsel:** Playwright ile 9 öğrenci ve 5 kurum sayfası, masaüstü (1440) ve mobil (390); yatay taşma ve konsol hatası kontrolü (bu oturumdaki yöntem).
- **Pilot kabulü:** yukarıdaki uçtan uca senaryo + hukuk onayından geçmiş aydınlatma metni.

## 12. Doğrulanamayan bilgiler ve sınırlamalar
- Öğrencinin kendi hesabını silme ve veri dışa aktarma akışı bulunamadı (admin tarafında yumuşak silme var) **[Doğrulanamadı]**.
- Gerçek AI maliyeti: token ve fatura verisi yok **[Doğrulanamadı]**.
- Gemini'nin veri kullanım koşulları ve ücretsiz/ücretli farkı Google'ın güncel şartlarına bağlı; bu denetimde web araştırması yapılmadı.
- Çalışma süresi hatası düzeltilmeden önce tamamlanan görevler: production'da etkilenen kayıt 0 bulundu (bu oturumda salt okunur sorgu); geleceğe dönük sorun yok.
- Brifingdeki Laravel/Flutter, mağaza metinleri ve mobil özellikler projede olmadığı için değerlendirilmedi.

## Özet sınıflandırma
- **Kodda doğrulandı:** tRPC yetki katmanı (user/admin), `userId` izolasyonu, abonelik/deneme/kota, mock/Apple/Google sağlayıcıları, Gemini ve model kademeleri, OCR önbelleği, koç uyarıları, plan uyumu, admin denetim kaydı, veritabanında blob dosyalar, 55 "Pusula" geçişi, 4 karakterlik şifre kuralı.
- **Kodda mevcut değil veya eksik:** kurum ve rolleri, davetler, öğretmen ataması, sınıflar, görüşme notları, AI token/maliyet kaydı, web ödeme sağlayıcısı, öğrencinin hesap silme/dışa aktarma ucu, veli, mobil uygulama.
- **Öneri:** §5 şeması ve `orgProcedure`, `audit_logs`, `ai_usage_events`, koltuk modeli, `BRAND` sabiti.
- **Hukuki görüş gerekli:** reşit olmayanların verisi, kurum erişim dayanağı ve aydınlatma, saklama süreleri, yurt dışı AI aktarımı, veri işleme rolleri.
- **Kullanıcı kararı bekleniyor:** §10'daki 12 soru.

**Sonraki adım:** kararlar verildiğinde Aşama 1 (marka geçişi) için dosya bazlı ayrı bir uygulama planı hazırlanacak. Bu raporda uygulama yapılmadı.
