# Pusula Study Coach — Yol Haritası ve Mevcut Sistem Analizi

**Tarih:** 22 Ekim 2026 · **Kaynak:** "22 Ekim 2026 — Proje Geliştirme Kararları ve Claude Master Prompt" toplantı notu
**İncelenen kod:** `lgs-support` dalı (son commit `6233894`), PostgreSQL şeması `drizzle/schema.ts` (57 tablo), `server/routers/*`, `shared/*`, `client/src/pages/*`.
**Durum:** Bu belge bir analiz ve plandır. Kod değişikliği yapılmadı; "İlk geliştirme aşaması" bölümündeki iş onay bekliyor.

---

## 0. Kısa özet

- Toplantıdaki 11 modülün **2'si büyük ölçüde hazır** (Duvar, AI maliyet kontrolü), **6'sı kısmen var** (Çalışma Günlüğü, Tekrar Radarı, Sınava Hazırlık Haritası, Bugün Ne Çalışmalıyım, AI Koç, Roller/Gizlilik), **3'ü hiç yok** (Niyet Kavanozum, Emek Bahçem, Koça Rapor Gönderme). Hedef Simülatörü yalnızca tahmini puan düzeyinde var.
- **En büyük altyapı açığı: konu kimliği.** Çalışma kayıtları (`topic_study_logs`), plan görevleri (`study_plan_sessions`) ve konu ilerlemesi ders/konu **adıyla** (metin) tutuluyor; yalnızca defter, kitap içeriği ve konu ilerlemesi `topicId` kullanıyor. Toplantının istediği "aynı konu kimlikleriyle birleştirme" için önce bu düzeltilmeli. Aksi hâlde Tekrar Radarı, Harita ve günlük karar motoru aynı konuyu farklı yazımlarla ikiye böler.
- **İkinci açık: tek veri girişi.** Bugün çalışma verisi beş ayrı yere yazılıyor (takvim oturumu sonucu, konu logu, kitap logu, okuma sayfası, soru defteri denemesi). Çalışma Günlüğü yeni bir tablo değil, bunların üstünde **tek giriş noktası + birleşik okuma görünümü** olmalı.
- Önerilen sıra toplantıdaki sırayla uyumlu, tek farkla: **Aşama 2'nin ilk işi "konu kimliği birleştirme"** (öğrenci hiçbir şey görmez ama sonraki her modül buna dayanır).

---

## 1. Toplantı kararları — mevcut durum

### 1.1 Zaten bulunan (küçük eklerle yeterli)

| Modül | Mevcut karşılığı | Eksik kalan |
|---|---|---|
| **3 — Duvar** | `wall_posts`, `server/wall/*`, `client/src/pages/wall/WallSection.tsx`: kişisel, zaman sıralı yazı/bağlantı/alıntı; defter editörü (fotoğraf, ses, formül, çizim); "sonra oku", sabitleme, etiket, konu bağlantısı, arama; yalnızca sahibi görür; medya Supabase Storage'da | **Gelecekteki Kendime Mektup** (açılış tarihi gelene kadar kilitli kayıt), **Hedefler** kayıt türü, **arşiv** görünümü (ay/yıl gezintisi). Hepsi mevcut tabloya alan eklenerek yapılır. |
| **10 — AI maliyet kontrolü** | `shared/entitlements.ts` paket başına aylık kotalar (AI plan, OCR, not AI, ses); `feature_usage_logs`; `metredFeatureProcedure`; OCR önbelleği (`ocr_page_cache`); ortak kitap kaydıyla OCR tekrarının önlenmesi (`shared_books`); kurum kredisi (`organization_credit_usage`) | **Token** takibi yok (yalnızca istek sayısı); AI yanıt önbelleği yalnızca OCR'da var. |
| Çoklu sınav desteği | `shared/exams.ts`: YKS (TYT/AYT), LGS, KPSS GY-GK, DGS, MEB-AGS, KPSS A; yeni sınav için kontrol listesi | Toplantı "ileride yeni sınav" diyor — mimari bunu zaten karşılıyor. |

### 1.2 Kısmen geliştirilmiş

| Modül | Var olan | Eksik |
|---|---|---|
| **4 — Çalışma Günlüğüm** | `topic_study_logs` (ders, konu, süre, soru, D/Y/B, not), `book_study_logs` (kitap, sayfa/test aralığı), `study_plan_sessions` (plan görevi; tamamlanınca süre/soru/D/Y/B/sayfa; `assignedByUserId` ile **öğretmen ödevi ayrımı zaten var**), `reading_books` (okuma sayfası), `study_sessions` (odak oturumu) | Tek ekranda birleşik günlük yok; **alt konu**, **çalışma türü** (video, özet, tekrar, test, paragraf), **ek (fotoğraf/PDF)**, **tamamlanma durumu** (öğrenci kaydında) yok; konu metin olarak tutuluyor. |
| **6 — Tekrar Radarım** | Soru defterinde aralıklı tekrar (`REVIEW_INTERVALS_DAYS = [1,3,7,14,30]`, `shared/questionNotebook.ts`); konu durumu zayıf/orta/iyi (`shared/topicStatus.ts`: <%55 zayıf, ≥%85 iyi, en az 8 soru); odakta yarım kalan konu tekrar listesine düşüyor | **Konu düzeyinde** tekrar planı yok (yalnızca soru kartı düzeyinde); öğrencinin **kendi değerlendirmesi** (yeşil/sarı/kırmızı) ile hesaplanan düzey ayrı tutulmuyor; **gri** (veri yok) durumu yalnızca "yetersiz veri" bayrağı olarak var; eşikler kodda sabit, yönetici değiştiremiyor; "farklı günlerde 2 başarılı kontrol + 15 soru" kuralı yok. |
| **7 — Sınava Hazırlık Haritam** | Konu Haritası sayfası (`client/src/pages/topics/TopicMap.tsx`), müfredat ağacı `shared/curriculum.ts` (sınav → ders → ünite → konu + eş anlamlılar), `yks_topics`, `topic_progress` | **Alt konu** ve **kazanım** düzeyi yok; müfredat **sürümlü değil** (sınav yılı yok); konuya dokununca son çalışma/kontrol/tekrar geçmişi/koç geri bildirimi paneli yok. Deneme analizi ders bazlı netten konu başarısı **uydurmuyor** (doğru davranış, korunmalı). |
| **8 — Bugün Ne Çalışmalıyım?** | `shared/focusPlan.ts → generateDailyFocusPlan`: **kural tabanlı**, AI'sız günlük plan; okul/dershane saatlerini (`class_schedule_blocks` + kurum ders programı) ve boş zamanı hesaba katıyor; geciken oturumlar cezasız yarına kayıyor | Girdiler sınırlı (yalnızca zayıf konu + ilerleme): **tekrar tarihi, gecikme, sınav ağırlığı, ön koşul, koç önceliği** yok; her öneride **"neden önerildi?"** açıklaması yok. |
| **10 — AI Koç** | Haftalık AI plan (`server/routers.ts` plan üretimi), not AI (özet/kart/soru), soru çözümü ve benzer soru, plan uyum raporu ve koç uyarıları (`plan_adherence_reports`, `coach_alerts` — kural tabanlı) | Haftalık **yorum** metni, **koça rapor taslağı**, kendi geçmişiyle karşılaştırmalı yorum yok. |
| **11 — Roller ve gizlilik** | Kurum rolleri `owner/admin/coordinator/teacher/student` (`organization_members`), veli (`parent_links`, öğrenci onaylı, notları görmez), sistem yöneticisi (`users.role = admin`), kurum izolasyonu (`server/org/orgAccess.ts`, `orgIsolation.test.ts`), denetim kaydı, KVKK onay sürümü, Supabase'de tüm tablolarda RLS | **Koç** rolü yok (bugün öğretmen/koordinatör bu işi yapıyor); öğretmenin **ders bazlı** yetkisi yok (öğretmen atandığı öğrencinin tüm verisini görüyor); 18 yaş altı için zorunlu veli onayı kapısı **bilinçli olarak** uygulanmadı (hukuki karar bekliyor). |
| **9 — Hedef Simülatörü** | LGS tahmini puanı (`shared/exams.ts` `scoreEstimate`), hedef puan / hedef üniversite profil alanları | Senaryo karşılaştırması ve resmî yerleştirme verisi yok. |
| Dış sistemlerden veri | Deneme sonuç belgesi fotoğraftan okuma (`OCR_EXAM_IMPORT`), ders programı fotoğrafından okuma (`server/schedule/scheduleImport.ts`), kurum ders programı | Dershane sistemlerinden **dosya (CSV/Excel) ya da API** ile içe aktarma yok. |

### 1.3 Henüz bulunmayan

| Modül | Not |
|---|---|
| **1 — Niyet Kavanozum** | Hiç yok. Bağımsız, küçük bir modül; diğer modüllere bağımlılığı yok. |
| **2 — Emek Bahçem** | Hiç yok. Verisi hazır (okuma sayfaları, paragraf konu logları, tamamlanan oturumlar); yalnızca hesaplama + görselleştirme gerekiyor. |
| **5 — Koça/öğretmene rapor gönderme** | Hiç yok. Yakın parçalar: öğretmenin öğrenciye görev ataması (`org.tasks.assign`), öğretmen notu (`counseling_notes`, öğrenciye görünür olabilir), öğretmene haftalık özet e-postası (`server/digest`). Öğrenci → öğretmen yönlü rapor, durum akışı ve yorumlaşma yok. **PDF dışa aktarma** altyapısı da yok. |

---

## 2. Önemli tutarsızlıklar ve karar gereken noktalar

1. **Konu kimliği (en kritik).** `topic_study_logs.subject/topic` ve `study_plan_sessions.subject/topic` metin. `topic_progress.topicId`, `notebook_questions.topicId`, `user_book_contents.topicId`, `wall_posts.topicId` ise kimlik. → Metin kayıtlara `topicId` sütunu eklenip mevcut eşleştirici (`server/bookContent/examTopicResolver.ts`, eş anlamlılarla) ile doldurulmalı; yeni kayıtlar kimlikle yazılmalı. Eşleşmeyen eski kayıt **uydurulmaz**, metin olarak kalır.
2. **İki farklı eşik seti.** Mevcut `topicStatus`: zayıf <%55, iyi ≥%85, en az 8 soru. Toplantı: <%60 destek, %60–84 pekiştirme, ≥%85 başarılı; en az 5 soru; yeşil için farklı günlerde 2 başarılı kontrol + toplam 15 soru. → **Tek bir yapılandırılabilir kural seti** (veritabanında, yönetici panelinden değişir) olmalı; konu durumu, Tekrar Radarı ve Harita aynı kuralı kullanmalı. Aksi hâlde aynı konu bir ekranda sarı, öbüründe yeşil görünür.
3. **Tekrar aralıkları.** Soru defteri 1-3-7-14-30 gün kullanıyor; toplantı 1-3-7-14 diyor. → Ortak bir `reviewSchedule` servisi; soru kartı ve konu tekrarı aynı aralıkları kullanır.
4. **"Koç" kimdir?** Bugün kurumda öğretmen ve koordinatör var. Seçenekler: (a) yeni kurum rolü `coach`; (b) öğretmen üyeliğine "rehber/koç" bayrağı (sınıf **sorumlu öğretmeni** zaten bu işi kısmen yapıyor); (c) kurumsuz bağımsız koç (bireysel koçluk hizmeti — ayrı iş modeli).
   **KARAR (22.10.2026):** Koç = öğrenciye atanan sorumlu öğretmen. Kodda bu iki yoldan oluşur: öğrencinin sınıfının sorumlu öğretmeni (`organization_classes.advisorUserId`) ve öğrenciye doğrudan atanan öğretmen (`teacher_assignments`) — ikisi de bugün `teacherStudentIds()` ile tek listede. Yeni rol ya da bayrak **açılmaz**. Kurumsuz bağımsız koç ileriki aşama.
5. **Öğretmenin ders bazlı yetkisi.** Toplantı "öğretmen yalnızca yetkili olduğu öğrenci **ve ders** kayıtlarına erişsin" diyor. Bugün öğretmen atandığı öğrencinin tüm akademik verisini görüyor. Ders bazlı süzme, öğretmenin branşı (`organization_members.subject`) ile yapılabilir ama sorumlu öğretmen/rehber her dersi görmeli.
   **KARAR (22.10.2026):** Öğrencinin verisini yalnızca ona atanan sorumlu öğretmen görür ve **tüm dersleri** görür (bugünkü davranış). Ders programında derse giren branş öğretmenleri öğrenci verisine erişmez (bugün de erişmiyor). Ders bazlı süzme bu nedenle gerekmez.
6. **Özel alanlar.** Duvar, Niyet Kavanozum ve (gelecekteki) mektuplar hiçbir kurum/veli/koç sorgusuna girmemeli. Bugün Duvar bunu sağlıyor (`wallDb` her sorguda `userId`); yeni modüller aynı kuralla yazılmalı ve bunu doğrulayan izolasyon testi olmalı.
7. **Deneme konu analizi.** Toplantı kararı mevcut davranışla aynı: ders bazlı netten konu başarısı türetilmez. Korunacak.
8. **Küçük yaş ve KVKK.** Veli rıza metni taslak (`shared/parent.ts`), kurum KVKK metni hukuk kontrolü bekliyor. Rapor gönderme ve koç yorumları yeni kişisel veri akışı açıyor → aydınlatma metnine eklenmeli. **Hukuk kontrolü gerekli.**

---

## 3. Değişecek mevcut dosyalar (modül bazında)

| Alan | Dosyalar |
|---|---|
| Konu kimliği | `drizzle/schema.ts` (topic_study_logs, study_plan_sessions), `server/db.ts` (`addTopicStudyLog`, `completeStudySession`, `getUserTopicProgress`), `server/routers/topics.ts` (`logResult`), `server/bookContent/examTopicResolver.ts` (yeniden kullanım), bir kerelik doldurma betiği `scripts/` |
| Çalışma Günlüğü | `server/db.ts` (kayıt yazma noktaları), yeni `server/studyLog/*`, `client/src/pages/Home.tsx` (Takvim'deki oturum sonucu, "Fazladan çalış"), `client/src/components/app/ReadingBookDialog.tsx`, `shared/calendarLogic.ts` |
| Rapor gönderme | `server/routers/org.ts` (öğretmen paneli uçları), `server/org/orgAccess.ts` (`assertCanViewStudent`), `server/digest/*` (özet hesaplarının yeniden kullanımı), `client/src/pages/org/StudentDetail.tsx`, `client/src/pages/org/OrgApp.tsx` (menü) |
| Tekrar Radarı | `shared/topicStatus.ts`, `shared/questionNotebook.ts` (ortak aralıklar), `server/routers/topics.ts`, `client/src/pages/topics/TopicMap.tsx`, `shared/focusPlan.ts` |
| Harita | `shared/curriculum.ts` (alt konu/kazanım, sürüm), `server/db.ts` (`ensureCurriculumSeeded`), `client/src/pages/topics/TopicMap.tsx` |
| Günlük karar motoru | `shared/focusPlan.ts` (`generateDailyFocusPlan` girdileri ve "neden" alanı), `client/src/pages/Home.tsx` (Bugünün Pusula Odak Planı kartı) |
| Duvar ekleri | `drizzle/schema.ts` (`wall_posts`), `server/wall/wallDb.ts`, `server/routers/wall.ts`, `client/src/pages/wall/WallSection.tsx` |
| Kişisel gelişim | `shared/yksData.ts` (menü), `client/src/lib/sections.ts`, `client/src/pages/Home.tsx` |
| AI Koç | `server/routers.ts` (AI plan), `shared/entitlements.ts` (yeni özellik anahtarları), `server/_core/llm.ts` (token sayımı) |

---

## 4. Veritabanı değişiklikleri

Kural: mevcut tabloyu çoğaltmak yok; her değişiklik migration ile (`drizzle-kit generate`), yeni tabloda RLS satırı, her sorgu `userId`/`orgId` kapsamlı.

| Değişiklik | Tür | Amaç |
|---|---|---|
| `topic_study_logs.topicId`, `.activityType` (`test`, `topic_study`, `review`, `video`, `summary`, `paragraph`, `reading`), `.subtopic`, `.bookId`, `.pageStart/pageEnd`, `.status`, `.source` (`self`/`plan`/`assignment`/`focus`), `.planSessionId`, `.clientRequestId` (mükerrer önleme) | Alan | Çalışma Günlüğü'nün tek kayıt tablosu olarak genişletilmesi |
| `study_plan_sessions.topicId` | Alan | Plan görevini konu kimliğine bağlama |
| `study_log_attachments` ya da mevcut `note_attachments`'a `studyLogId` | Alan | Kayda fotoğraf/PDF eki (Supabase Storage altyapısı hazır; PDF için tür izni eklenir) |
| `student_reports` (öğrenci, kurum, dönem, durum: `draft/sent/reviewed/changes_requested`, `snapshotJson`, öğrenci açıklaması, alıcı) + `student_report_comments` | Tablo | Modül 5 |
| `topic_review_states` (öğrenci, topicId, **öğrencinin değerlendirmesi**, **hesaplanan düzey**, aşama, sonraki tekrar, başarılı kontrol sayısı/günleri, toplam soru) | Tablo | Modül 6 — öz değerlendirme ve hesaplanan düzey ayrı |
| `mastery_rules` (tek satır ya da anahtar/değer: eşikler, en az soru, aralıklar) | Tablo | Yöneticinin değiştirebildiği kurallar |
| `curriculum_versions` + `yks_topics.subtopic`/`outcomeCode` ya da `curriculum_outcomes` | Tablo/alan | Modül 7 — sınav yılı sürümü, alt konu, kazanım |
| `intention_affirmations` (öğrenci, metin, aktif mi) + `intention_checkins` (öğrenci, **yerel gün**, söz; `UNIQUE(userId, day)`) | Tablo | Modül 1 — günde tek pirinç, eşzamanlı çift kayda veritabanı engeli |
| `wall_posts.kind` += `letter`, `goal`; `wall_posts.unlockAt` | Alan | Gelecekteki Kendime Mektup, Hedefler |
| `feature_usage_logs.inputTokens/outputTokens` | Alan | AI maliyet takibi |

**Emek Bahçem için tablo gerekmez:** bahçe aşaması gerçek kayıtlardan (okunan sayfa, paragraf soruları, tamamlanan çalışma günleri) hesaplanır; birikimli olduğu için "silinmez" kuralı kendiliğinden sağlanır. İstenirse yalnızca görsel tercih (tema) için `student_profiles`'a bir alan.

---

## 5. Modüllerin ortak kullanacağı veri ve servisler

1. **Konu kimliği servisi** — metni `topicId`'ye çeviren tek nokta (`examTopicResolver` + müfredat eş anlamlıları), sınava göre süzülmüş.
2. **Çalışma kaydı servisi (tek yazma noktası)** — takvim oturumu, odak, kitap, okuma, "fazladan çalış", ödev tamamlama hepsi buradan yazar; yan etkileri tek yerde: konu ilerlemesi, tekrar durumu, kitap ilerlemesi, bahçe. Mükerrer kayıt `clientRequestId` ile önlenir.
3. **Ustalık (mastery) servisi** — tek kural seti; Konu Haritası, Tekrar Radarı, günlük plan, rapor ve kurum paneli aynı sonucu gösterir.
4. **Tekrar takvimi servisi** — soru kartı ve konu tekrarı için ortak aralıklar; müsait zaman (`class_schedule_blocks` + kurum programı + takvim) ve günlük kapasiteye göre yerleştirme; geciken tekrar cezasız kayar (bugünkü `rescheduleOverdueSessions` kalıbı).
5. **Dönem özeti servisi** — günlük/haftalık süre, soru, D/Y/B, ders/konu dağılımı, tamamlanan/eksik ödev. Bugün `server/digest/*` ve `planAdherence` benzerlerini hesaplıyor; rapor, öğretmen paneli, veli özeti ve AI koç **aynı** hesabı kullanmalı.
6. **Yetki servisi** — `server/org/orgAccess.ts` (kurum) + `server/parent/*` (veli) + özel alan kuralı (Duvar/Kavanoz hiçbir paylaşım sorgusuna girmez).
7. **Medya deposu** — `server/notes/attachmentStorage.ts` (Supabase Storage; Duvar ve defterle ortak). PDF ekleri ve rapor PDF'leri de buradan.

---

## 6. Rol eksikleri

| Rol | Bugün | Eksik |
|---|---|---|
| Öğrenci | Tam | Rapor gönderme, Çalışma Günlüğü, Kavanoz/Bahçe |
| Koç = sorumlu öğretmen (karar 1) | Sınıf sorumlusu + doğrudan atanan öğretmen; öğrencinin tüm verisini görür, görev atar (`org.tasks.assign`), not yazar | Rapor listesi, durum değiştirme, yorum, "öğretmen doğruladı" işareti |
| Branş öğretmeni | Ders programında görünür; öğrenci verisine erişmez | Değişiklik yok (karar 2) |
| Veli | Öğrenci onaylı bağlantı, özet görünüm, haftalık e-posta | Rapor görünümü (isteğe bağlı, öğrenci açarsa) |
| Kurum yöneticisi | Tam (üye, sınıf, program, kredi, denetim) | Kurum geneli rapor durumu özeti |
| Sistem yöneticisi | Abonelik, fiyat, hata, katalog yönetimi | Ustalık kuralları ve AI kota/maliyet ekranı |

---

## 7. AI nerede gerekli, nerede gereksiz

**AI kullanılmayacak (sunucuda hesaplanır):** net ve doğruluk yüzdesi, konu durumu ve renkler, tekrar tarihleri, günlük görev seçimi ve sıralaması, "neden önerildi?" açıklaması (kural tabanlı şablon metin), bahçe aşaması, kavanoz sayacı, dönem özetleri ve rapor içeriği, grafik verisi, bildirimler, mükerrer kayıt kontrolü.

**AI kullanılabilir (kotalı, isteğe bağlı, AI kapalıyken temel işlev çalışır):**
- Haftalık çalışma **yorumu** (dönem özeti hazır veri olarak verilir; model yalnızca dil üretir) — haftada bir, önbellekli.
- Koç için **rapor taslağı** (koç ister, düzenler).
- Zorlanılan konunun **açıklaması** (mevcut not AI / soru çözümü altyapısı).
- Kendi geçmişiyle **karşılaştırmalı yorum** — aylık.
- Fotoğraftan veri okuma (zaten var: deneme belgesi, kitap kapağı/içindekiler, ders programı).

**Maliyet önlemleri:** mevcut kota sistemine yeni özellik anahtarları (`AI_WEEKLY_COMMENT`, `AI_REPORT_DRAFT`); aynı dönem + aynı veri için yanıt önbelleği (girdi özeti hash'i); token sayımı `feature_usage_logs`'a; kurum kredisiyle ödeme mevcut kalıptan.

---

## 8. Önerilen geliştirme sırası

Toplantının aşamalarıyla aynı, iki düzeltmeyle: konu kimliği en başa, kişisel gelişim (Aşama 5) bağımsız olduğu için istenirse paralel gidebilir.

| Aşama | İçerik | Neden bu sırada |
|---|---|---|
| **2a** | Konu kimliği birleştirme + çalışma kaydı servisi (tek yazma noktası) | Sonraki her modül buna dayanıyor |
| **2b** | Çalışma Günlüğüm ekranı (birleşik görünüm + hızlı kayıt + ödev/kendi çalışması ayrımı) | Öğrencinin gördüğü ilk değer; veri kalitesi artar |
| **3** | Rapor oluşturma/gönderme, koç paneli, yorumlar, PDF | Kurumsal satışın ana argümanı; 2b verisine dayanır |
| **4** | Ustalık kural seti → Tekrar Radarı → Harita → günlük karar motoru | Kural seti tek olmalı; motor en sonda tüm girdileri kullanır |
| **5** | Niyet Kavanozum, Emek Bahçem, Duvar'a mektup/hedef | Bağımsız; Bahçe 2a verisini kullanır |
| **6** | AI koç yorumları, Hedef Simülatörü, gelişmiş kurum raporları, dış sistem içe aktarma | Veri altyapısı oturduktan sonra |

Her aşama ayrı commit, ayrı test, tek migration dosyası; canlıya çıkış Supabase geçişinden sonra.

---

## 9. İlk çalışan MVP — görev listesi

MVP hedefi: **"Öğrenci çalışmasını tek yerden kaydeder, haftalık raporunu öğretmenine gönderir, öğretmen yorumlar ve görev atar."**

1. [ ] `topic_study_logs` ve `study_plan_sessions`'a `topicId`; eşleştirici ile mevcut kayıtları doldurma betiği (eşleşmeyen metin kalır); testler.
2. [ ] `topic_study_logs` genişletme: `activityType`, `subtopic`, `bookId`, `pageStart/End`, `status`, `source`, `planSessionId`, `clientRequestId` (benzersiz).
3. [ ] `server/studyLog/studyLogService.ts`: tek yazma noktası; mevcut yazma yerlerini (oturum tamamlama, konu logu, kitap logu, okuma sayfası) buna yönlendirme; mükerrer önleme testi (aynı istek iki kez → tek kayıt).
4. [ ] `studyLog` router: `list(dönem)`, `create`, `update`, `delete`, `summary(dönem)`; yetki ve izolasyon testleri.
5. [ ] "Çalışma Günlüğüm" sayfası (mobil öncelikli): gün gün liste, hızlı ekleme (ders/konu seçici mevcut müfredattan), ödev (öğretmen) / kendi çalışması ayrımı ve rozetleri, düzenleme.
6. [ ] Dönem özeti servisi (`server/studyLog/periodSummary.ts`): süre, soru, D/Y/B, ders/konu dağılımı, tamamlanan/eksik ödev, tekrar gereken konular (mevcut konu durumu kuralıyla).
7. [ ] `student_reports` + `student_report_comments` tabloları; durum akışı `draft → sent → reviewed | changes_requested`; rapor içeriği gönderim anında **anlık görüntü** olarak saklanır (sonradan değişen veri raporu değiştirmez).
8. [ ] Öğrenci: rapor oluştur (dönem seç → önizle → açıklama → alıcı seç → gönder). Alıcı listesi yalnızca yetkili öğretmenler (sorumlu + atanmış).
9. [ ] Öğretmen paneli: "Raporlar" listesi (durum süzgeci), rapor detayı, yorum, "incelendi"/"düzeltme iste", rapordan görev atama (mevcut `org.tasks.assign`).
10. [ ] Öğrenci yorum yanıtı; uygulama içi bildirim (mevcut bildirim/push altyapısı).
11. [ ] PDF dışa aktarma: ilk sürümde tarayıcı yazdırma görünümü (sunucuda PDF kütüphanesi ve maliyet yok); sunucu PDF'i gerekirse sonra.
12. [ ] Özel alan testi: Duvar içeriği hiçbir rapor/öğretmen/veli ucunda dönmez.
13. [ ] Uçtan uca: öğrenci kayıt → rapor gönder → öğretmen yorum + görev → öğrenci görür.

Kapsam dışı (MVP sonrası): Tekrar Radarı, Harita genişletme, karar motoru, Kavanoz, Bahçe, AI yorumları, Hedef Simülatörü.

---

## 10. CLAUDE.md için öneriler

Projede **kendi CLAUDE.md'si yok**; yalnızca kullanıcının genel `~/.claude/CLAUDE.md`'si var (task-observer protokolü). Mevcut talimatlara dokunmadan proje köküne aşağıdaki içerikle bir `CLAUDE.md` eklenmesini öneriyorum (onay verirsen oluştururum):

```markdown
# Pusula Study Coach — proje kuralları

## Veri ve mimari
- Konu her yerde `yks_topics.id` (topicId) ile tutulur; ders/konu adı yalnızca görüntüleme içindir.
  Metni kimliğe çevirmek için `server/bookContent/examTopicResolver.ts` kullanılır; eşleşmeyen kayıt uydurulmaz.
- Çalışma verisi tek noktadan yazılır (çalışma kaydı servisi); yeni ekran yeni tablo açmaz.
- Konu durumu/renkleri tek kural setinden gelir (ustalık servisi); eşikler kodda sabitlenmez.
- Deneme yalnızca ders netiyse konu başarısı türetilmez.
- Yeni sınav: `shared/exams.ts` başındaki kontrol listesi.

## Gizlilik ve yetki
- Duvar, Niyet Kavanozu ve kişisel mektuplar hiçbir kurum/öğretmen/veli/koç sorgusuna girmez; her yeni paylaşım ucu için izolasyon testi yazılır.
- Her sorgu `userId` / `orgId` ile kapsamlı; kurum erişimi `server/org/orgAccess.ts` üzerinden.
- Yeni tablo eklenince migration'a `ENABLE ROW LEVEL SECURITY` satırı eklenir.

## Veritabanı
- Şema değişikliği yalnızca migration ile; yayınlanmamış migration varsa yeni değişiklik ona katlanır.
- Canlı veritabanında migration öncesi yedek alınır.
- Mükerrer kayıt veritabanı kısıtıyla (UNIQUE) önlenir, yalnızca arayüzle değil.

## AI ve maliyet
- Hesaplama (net, yüzde, tarih, sıralama, rapor özeti) AI ile yapılmaz.
- AI çağrısı kotalı (`metredFeatureProcedure`) ve önbellekli olur; AI kapalıyken özellik temel hâliyle çalışır.

## Arayüz
- Mobil öncelikli (390 px'te yatay taşma yok), mevcut kit bileşenleri (`client/src/components/app/kit.tsx`).
- Erişilebilir adlar: form alanları ve simge düğmeleri `aria-label` taşır.

## Test ve teslim
- Her değişiklikten sonra: `npx tsc --noEmit`, `npx vitest run`, gerekiyorsa `E2E_BROWSER_CHANNEL=msedge npx playwright test`, `npm run build:vercel`.
- Veritabanı testleri `describe.skipIf(!process.env.DATABASE_URL)`; yerel PG: docker `pusula-pg`, port 5433.
- Tamamlanmamış entegrasyon "tamamlandı" diye raporlanmaz.
- Fiyat, marka, ödeme ve hukuki metinler kullanıcı kararı olmadan değiştirilmez.
```

Genel CLAUDE.md'de değişiklik önermiyorum (task-observer talimatları korunur).

---

## 11. İlk geliştirme aşaması — onay bekleyen plan

**Aşama 2a: Konu kimliği + tek çalışma kaydı servisi.** Öğrenci arayüzünde görünür değişiklik yok; mevcut ekranlar aynı çalışır.

| Ne | Nerede | Ne yapılacak |
|---|---|---|
| Şema | `drizzle/schema.ts`, yayınlanmamış `0002_*` migration'ına katlanır | `topic_study_logs`: `topicId`, `activityType`, `subtopic`, `bookId`, `pageStart`, `pageEnd`, `status`, `source`, `planSessionId`, `clientRequestId` (+ `UNIQUE(userId, clientRequestId)`); `study_plan_sessions.topicId` |
| Konu çözümleme | yeni `server/studyLog/topicIdentity.ts` | Öğrencinin sınavına göre (ders, konu) → `topicId`; mevcut `examTopicResolver` + müfredat eş anlamlıları; belirsizse `null` |
| Tek yazma noktası | yeni `server/studyLog/studyLogService.ts` | `recordStudy()` — konu logu, konu ilerlemesi, (varsa) kitap logu ve plan oturumu güncellemesini tek işlemde yapar; `clientRequestId` ile tekrar gönderim tek kayıt |
| Mevcut yazıcılar | `server/db.ts` (`addTopicStudyLog`, `completeStudySession`, `logCompletedRoutineSession`), `server/routers/topics.ts` (`logResult`), `server/org/orgDb.ts` (ödev oluşturma) | İmzalar korunur, içleri servise yönlenir; ödev oluştururken `topicId` yazılır |
| Doldurma | yeni `scripts/backfill-topic-ids.ts` | Mevcut kayıtlar için `topicId` doldurma (kuru çalıştırma modu + rapor); Supabase'e geçişte veri sıfırlanacağı için canlıda gerekmeyebilir, yerel ve gelecekteki göçler için |
| Testler | yeni `server/studyLog.test.ts` | Çözümleme (eş anlamlı, sınava göre süzme, belirsiz → null), mükerrer önleme, mevcut uçların aynı sonucu vermesi, izolasyon; tüm mevcut birim/e2e testleri geçmeli |

Ardından **Aşama 2b** (Çalışma Günlüğüm ekranı) ve **Aşama 3** (rapor) bu belgedeki MVP listesiyle devam eder.

**Kararlar:**
1. ✅ Koç = öğrenciye atanan sorumlu öğretmen (sınıf sorumlusu + doğrudan atanan öğretmen). Yeni rol yok.
2. ✅ Öğrenci verisini yalnızca o sorumlu öğretmen, tüm dersleriyle görür; branş öğretmenine erişim açılmaz.
3. ⏳ Tekrar Radarı eşikleri (%60/%85, 5 soru, 2 kontrol + 15 soru) mevcut konu durumu kuralının yerine geçsin mi? Önerim: evet, tek kural seti olarak. (Aşama 4'te gerekir; Aşama 2a ve 3'ü beklemez.)
4. ⏳ Aşama 2a ile başlama onayı.

**Kararların plana etkisi:** Rapor alıcısı, koç paneli ve yorum yetkisi mevcut `teacherStudentIds()` / `assertCanViewStudent()` üzerine kurulur; yeni rol, yeni yetki tablosu ve ders bazlı süzme işi plandan çıkar (bölüm 4'teki `organization_members.isCoach` satırı ve bölüm 6'daki "ders bazlı yetki" eksiği düşer).
