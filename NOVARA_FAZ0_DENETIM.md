# Novara Yazılım Akademi — Faz 0: Mevcut Kod ve Gereksinim Denetimi

**Tarih:** 22 Ekim 2026
**Girdiler:**
- "CLAUDE MASTER PROMPT — NOVARA YAZILIM AKADEMİ v5.0"
- Görsel yön görseli (Novara Koç / Rehber / Veli / Growth)
- `PUSULA_STUDY_COACH_ROADMAP.md` (aynı gün, commit `0915131`)

**İncelenen kod:** `lgs-support` dalı. 57 tablo (`drizzle/schema.ts`), `server/routers/*`, `server/org/*`, `shared/org.ts`, `client/src/pages/org/*`.

**Kapsam:** Bu belge yalnızca denetim ve plandır. Kod, veritabanı ve üretim ortamı değiştirilmedi.

---

## 0. Yönetici özeti

1. **Novara'nın "çekirdeği" büyük ölçüde zaten yazılmış durumda.** Kurum Paneli'nde şunlar var:
   - Kurum, üyelik, rol, sınıf, öğretmen ataması.
   - Ders programı (otomatik dağıtım dahil).
   - Risk rozetleri, öğrenci detayı, görev atama, görüşme notu.
   - Denetim kaydı, KVKK onayı, veli bağlantısı ve haftalık veli/öğretmen özeti.

   Novara'yı ayrı bir uygulama olarak değil, **bu Kurum Paneli'nin genişlemesi** olarak kurmak hem doğru hem en hızlı yol.
2. **Görseldeki öneriyle aynı fikirdeyim: önce Novara Rehber.**
   - Risk motoru (`shared/org.ts` → `RISK_RULES`, `summarizeStudent`) ve rehberlik ekranları (`OrgDashboard.tsx`, `StudentDetail.tsx`) zaten var.
   - Eksik olan **müdahale iş akışı**: vaka, görüşme, atanan çalışma, sonraki denemede karşılaştırma, sonuçlandırma.
   - Bu iş akışı "net düştü" demekten öteye geçip **"öğretmen ne yaptı, öğrenci neyi tamamladı, sonra ne değişti?"** sorusunu yanıtlayan parça. Platformun rekabet avantajı burada.
3. **Rehber'in güvenilirliği veriye bağlı.** Bugün denemeleri öğrenci kendisi giriyor (elle, fotoğraf, CSV/Excel). Kurumun kendi sonuçlarını toplu aktarması (**Connect**) yok. Önerilen sıra:
   - Rehber iş akışı **mevcut veriyle** hemen kurulur.
   - Connect'in deneme sonucu aktarımı **hemen arkasından** gelir.
   - Kurum verisi gelince güven düzeyi otomatik yükselir.
4. **Belgedeki dört teknik bilgi güncel değil:**
   - **Veritabanı:** Veritabanı artık **PostgreSQL (Supabase'e geçiş için hazır)**, MySQL değil. Kurallar aynı kalır: Drizzle, geriye uyumlu migration ve RLS.
   - **"Danışman öğretmen":** Arayüzde adı **"Sorumlu öğretmen"** oldu.
   - **Sınav desteği:** LGS, TYT ve AYT'nin yanında KPSS, DGS, MEB-AGS ve KPSS A da hazır.
   - **Marka:** Öğrenci uygulamasının kodu ve metinleri hâlâ "Pusula YKS". Marka değişikliği **senin kararınla** yapılacak bir iş; bu denetimde dokunulmadı.
5. **Görsel dil uyumlu.** Mevcut tasarım zaten petrol yeşili (`--brand: #17625f`), açık zemin (`--paper: #f3f6f5`) ve Plus Jakarta Sans kullanıyor; turkuaz-petrol isteğiyle örtüşüyor. Novara'ya geçiş yeniden tasarım değil, **token genişletmesi** olur.

---

## A. Mevcut sistem envanteri

Durumlar: ✅ hazır ve kullanılabilir · 🟡 kısmen var, genişletilecek · 🆕 yeni geliştirilecek · ⏭ sonraki faza bırakılacak.

| Modül | Öncelik | Durum | Gerçek karşılığı (kod yolu) | Eksik |
|---|---|---|---|---|
| **Connect** | P0 | 🟡 | Kurum ders programı elle girilip otomatik dağıtılıyor (`client/src/pages/org/OrgTimetable.tsx`, `shared/orgTimetable.ts`, `class_timetable_slots`); öğrenci takviminde görünüyor (`server/schedule/classScheduleDb.ts → getCourseBlocks`). Öğrenci kendi denemesini fotoğraf/PDF (`OCR_EXAM_IMPORT`) ya da CSV/Excel (`user_mock_exams.importedFrom = csv/xlsx`) ile ekliyor. Kurum kaydı davet koduyla (`organization_invitations`) | **Kurumun** toplu deneme sonucu aktarımı (CSV/Excel → doğrulama → yayımla), öğrenci listesi (roster) aktarımı, ders programı CSV aktarımı, aynı dosyanın tekrarını engelleme, kurum öğrenci numarası eşleştirmesi |
| **Koç** (öğrenci) | P0 | ✅/🟡 | Pusula öğrenci uygulamasının tamamı. Bkz. `PUSULA_STUDY_COACH_ROADMAP.md` | Çalışma Günlüğü, konu kimliği birleştirme, Tekrar Radarı (o belgedeki Aşama 2–4) |
| **Rehber** | P0 | 🟡 | Risk kuralları `shared/org.ts` (`RISK_RULES = { inactiveDays: 7, lowAdherence: 40, netDrop: 5 }`, `summarizeStudent`); "Takip gerektiren öğrenciler" (`OrgDashboard.tsx`); öğrenci detayı: net grafiği, zayıf konular, denemeler, konu durumu, görev ata, plan ve görevler, görüşme notları (`StudentDetail.tsx`); görev atama (`org.tasks.assign` → `study_plan_sessions.assignedByUserId`); görüşme notu (`counseling_notes`, staff/student görünürlüğü); öğretmen haftalık özeti (`server/digest/teacherDigest.ts`); denetim (`organization_audit_logs`) | **Müdahale vakası** ve iş akışı, görüşme planlama, takip ve sonuçlandırma, "son üç karşılaştırılabilir deneme eğilimi", güven düzeyi, ek risk türleri (tekrarlanan konu yanlışı, geciken ödev, geciken tekrar), yönetici özeti |
| **Veli** | P0 | 🟡 | `parent_links` (öğrenci onaylı bağlantı), veli özeti (`server/routers/parent.ts → student`), haftalık veli e-postası (`server/digest/parentDigest.ts`); notlar/defter veliye kapalı | Tamamlanan/geciken görev listesi, önceki denemelerle karşılaştırma grafiği, kaynak ilerlemesi, **öğretmenin veliyle paylaştığı öneriler**, sonraki hafta hedefleri, ayrıntılı bildirim tercihleri |
| **Ödev** | P1 | 🟡 | Öğretmen görevi öğrenci takvimine düşüyor ("Öğretmenin atadı"); tamamlanma süre/soru/D-Y-B ile | Ödev listesi ekranı (öğretmen/sınıf düzeyinde), sınıfa toplu ödev, teslim tarihi, "öğretmen doğruladı" ayrımı, geciken ödev uyarısı |
| **Soru Defterim** | P1 | ✅ | `notebook_questions`, `question_attempts`, aralıklı tekrar (1-3-7-14-30 gün), AI çözüm, benzer soru, tarayıcı filtresi | Öğretmenin öğrencinin soru defterini (izinle) görmesi — **bilinçli olarak yok**, gizlilik kararı gerekir |
| **Etüt** | P2 | 🆕 | — (ders programı ve boş saat hesabı yeniden kullanılabilir) | Etüt talebi, öğretmen müsaitliği, rezervasyon |
| **Kaynak360** | P1 | 🟡 | Kaynak kataloğu (`catalog_books`, zorluk), öğrenci kitaplığı ve içindekiler (`user_book_contents`), ortak kitap kaydı (`shared_books`), kitap ilerlemesi (`computeBookCompletion`), zayıf konuya **sahip olunan kitaptan** öneri (`getWeakTopicBookRecommendations`) | Öğretmenin sınıfa kitap önermesi, öneri ↔ öğrencinin kitabı eşleşmesi, test tamamlama hedefi, kurum düzeyinde kaynak ilerleme grafiği, kaynak kullanımı ↔ konu başarısı karşılaştırması |
| **Nabız** | P1 | 🆕 | — (öğrenci yorumları `testimonials` farklı amaçlı) | Anket, anonim geri bildirim, kimlikli öneri/şikâyet, sorumlu atama, çözüm süresi, raporlar |
| **CRM** | P2 | ⏭ | — | Aday öğrenci, görüşme, hatırlatma (yalnızca mimari) |
| **AI Asistan** (WhatsApp/web) | P3 | ⏭ | Yalnızca mevcut LLM altyapısı (`server/_core/llm.ts`) | WhatsApp Business API, bilgi tabanı |
| **Growth** | P3 | ⏭ | Tanıtım sayfası, sitemap, paylaşım önizlemesi | Ön kayıt formu, kampanya kaynağı, dönüşüm (belgeye göre ilk fazda yalnızca mimari) |

**Ortak altyapı (hepsi ✅):**
- Kimlik: `users` ve yerel oturum.
- Kurum üyeliği ve roller: `owner/admin/coordinator/teacher/student`.
- Kurum izolasyonu: `server/org/orgAccess.ts`, `orgIsolation.test.ts`.
- Veli: `parent_links`.
- Abonelik ve AI kotaları: `shared/entitlements.ts`.
- Kurum kredisi.
- Medya: Supabase Storage.
- Supabase'de tüm tablolarda RLS.
- Öğrencinin kişisel verisi `userId`'ye bağlı olduğu için **kurum değiştirince kaybolmuyor**; kurum yalnızca üyelik sürerken görebiliyor (`endMembership`).

**Belgeyle çelişen ve karar gerektiren mevcut davranış:**
- Bugün `coordinator`, `admin` ve `owner` rolleri kurumdaki **tüm öğrencileri ve tüm görüşme notlarını** görüyor (`seesAllStudents`, `shared/org.ts:47`).
- Belge ise "ayrıntılı öğrenci notları tüm yöneticilere varsayılan olarak açık olmamalı" diyor. → Not görünürlüğüne bir kademe eklenmeli (bkz. B).

---

## B. Veritabanı tasarımı

**Kurallar:**
- Mevcut tablo çoğaltılmaz.
- Her yeni tabloda `orgId` bulunur, sorgular `orgId` ile kapsamlanır ve RLS açılır.
- Mükerrer kayıt veritabanı kısıtıyla (UNIQUE) engellenir.
- Migration'lar geriye uyumludur: yalnızca ekleme yapılır, yeni sütunlar boş bırakılabilir ya da varsayılan değer alır.

### B1. Connect (veri aktarımı)

| Tablo / alan | Alanlar | Gerekçe |
|---|---|---|
| `organization_members.externalCode` | varchar(40), `UNIQUE(orgId, externalCode)` | Dershane sistemindeki öğrenci numarası; aktarılan satırı öğrenciyle eşleştirir |
| `connect_imports` 🆕 | orgId, kind (`exam_results` / `roster` / `timetable`), fileName, **fileHash (SHA-256)**, status (`uploaded` → `validated` → `published` / `discarded`), rowCount, matchedCount, errorCount, warningsJson, uploadedBy, publishedBy, timestamps; **`UNIQUE(orgId, kind, fileHash)`** | Aynı dosyanın ikinci kez yüklenmesini engeller; yayımlamadan önce doğrulama adımı (belge §7) |
| `connect_exam_results` 🆕 | orgId, importId, studentUserId (eşleşmezse null), externalCode, **examKind** (TYT/AYT/LGS/…), **examCode** (dershanenin deneme kimliği), examTitle, examDate, publisher, net, subjectsJson, scoreRaw (kurum puanı varsa, olduğu gibi), status; **`UNIQUE(orgId, examCode, externalCode)`** | Aynı deneme sonucunun iki kez aktarılmasını engeller; ham kurum verisi |
| `user_mock_exams.source` (`student` / `org`), `.orgExamResultId` (UNIQUE) | — | Yayımlanan kurum sonucu öğrencinin Denemeler sayfasına salt okunur olarak düşer; öğrencinin kendi girdiği denemeler silinmez (belge §7) |
| `connect_roster_rows` 🆕 | orgId, importId, externalCode, fullName, classLabel, status (`invited` / `joined`) | Öğrenciler **kendi rızasıyla** davet koduyla katılır (KVKK). Liste yalnızca beklenen öğrencileri ve sınıflarını önceden tanımlar; hesap kendiliğinden açılmaz |

**Karşılaştırılabilirlik anahtarı:** `examKind` + (varsa) `publisher` + tam deneme mi, branş denemesi mi. Rehber motoru yalnızca aynı anahtardaki sonuçları karşılaştırır (belge §4: TYT, AYT ve LGS karıştırılmaz).

### B2. Rehber (risk ve müdahale)

| Tablo | Alanlar | Gerekçe |
|---|---|---|
| `guidance_cases` 🆕 | orgId, studentUserId, ruleKey, examKind (null olabilir), **evidenceJson** (vakayı açan veri anlık görüntüsü: denemeler, güven, eşikler), confidence (`low/medium/high`), status (`open` → `reviewing` → `meeting_planned` → `action_assigned` → `follow_up` → `closed`), outcome (`completed` / `ongoing` / `reassess`), ownerUserId (sorumlu öğretmen), dueAt, openedAt, closedAt; **kısmi UNIQUE (orgId, studentUserId, ruleKey, examKind) WHERE status <> 'closed'** | Aynı sinyal için ikinci açık vaka açılmaz; kanıt anlık görüntü olarak saklanır, sonradan veri değişse de kararın dayanağı kaybolmaz |
| `guidance_events` 🆕 | caseId, orgId, type (`created`, `reviewed`, `meeting_scheduled`, `meeting_held`, `task_assigned`, `task_completed`, `compared`, `note`, `closed`, `reopened`), actorUserId, payloadJson, createdAt | Zaman çizelgesi + denetim; her eylem kayıt altında (belge §4: "her eylem için işlem kaydı") |
| `guidance_meetings` 🆕 | caseId, orgId, scheduledAt, durationMin, place, status (`planned/held/cancelled`), summary, **visibility** | Görüşme planlama ve sonucu |
| `study_plan_sessions.guidanceCaseId` | — | Müdahale sonrası atanan çalışma vakaya bağlanır; tamamlanma takip edilir |
| `counseling_notes.visibility` += `owner_only` ve `parent` | — | Ayrıntılı not yalnızca yazanına ve öğrencinin sorumlu öğretmenine açık olur (yöneticiye varsayılan olarak kapalı); "veliyle paylaşılabilir öneri" ayrı görünürlükte |
| `organization_guidance_rules` 🆕 | orgId (null = varsayılan), eşikler JSON | Kurum kendi eşiğini ayarlar (`RISK_RULES` sabit değer olmaktan çıkar) |

### B3. Kaynak360, Ödev, Nabız, Veli

| Tablo | Gerekçe |
|---|---|
| `class_book_recommendations` 🆕 (orgId, classId, catalogBookId / sharedBookId, subject, examKind, note, testTarget, recommendedBy) | Öğretmenin sınıfa kitap önermesi; öğrencinin rafındaki kitapla `shared_books` / `catalog` kimliği üzerinden eşleşir; "zaten sende var" önce gösterilir |
| `org_assignments` 🆕 (orgId, classId/studentUserId, title, subject, topicId, dueAt, createdBy) + mevcut `study_plan_sessions` satırları | Sınıfa toplu ödev; her öğrenciye bir görev satırı düşer (mevcut takvim, tamamlama ve plan uyumu aynen çalışır) |
| `study_plan_sessions.verifiedByUserId`, `.verifiedAt` | Öğrenci beyanı ile öğretmen doğrulaması ayrımı |
| `surveys`, `survey_questions` 🆕 | Nabız anketleri (5 soruluk hızlı şablon dahil) |
| `survey_invitations` 🆕 (surveyId, userId, usedAt; UNIQUE) **ayrı tablo** | Kişi başı tek yanıtı sağlar; yanıtla **bağlantısı tutulmaz** |
| `survey_responses` 🆕 (surveyId, orgId, answersJson, segment (öğrenci/veli/sınıf düzeyi), createdAt) — **userId yok** | Anonimlik: yanıt kimseye bağlanmaz |
| `feedback_tickets`, `feedback_ticket_events` 🆕 (kimlikli öneri/şikâyet, assignee, status, SLA, çözüm süresi, yeniden değerlendirme) | Nabız başvuruları |
| `parent_links.notifyPrefsJson` | Veli bildirim tercihleri |
| `student_week_goals` 🆕 (userId, weekStart, goalsJson, setBy) | Veli ekranındaki "sonraki haftanın hedefleri" |

**Anonimlik kuralı (Nabız):** 5'ten az yanıtlı bir kırılım (ör. sınıf × soru) raporda gösterilmez, "yetersiz yanıt" yazılır. Serbest metin yanıtları kimliği ele verebileceği için yalnızca kurum düzeyinde listelenir.

### B4. Sonraki faz (yalnızca mimari)

- `leads` ve `lead_activities` (CRM).
- `lead_sources` (web, Instagram, WhatsApp, etkinlik).
- `campaigns`.

Hepsi `orgId` kapsamlı olur. İlk fazda tablo **açılmaz**.

---

## C. Kullanıcı ekranları ve akışları

| Rol | Ekranlar | Ana akış |
|---|---|---|
| **Öğrenci** (Pusula) | Mevcut uygulama + Denemeler'de "Kurumdan" etiketli sonuçlar + atanan çalışmalar ("Öğretmenin atadı") + kurumdan görüşme daveti + Nabız anketi | Görev gelir → tamamlar (süre, soru, D-Y-B) → öğretmen görür. Duvar, Niyet Kavanozu ve defter **hiçbir kurum ekranına çıkmaz** |
| **Öğretmen / sorumlu öğretmen** | Takip listesi (vaka kuyruğu), öğrenci rehberlik dosyası (aşağıda), ödevler, sınıf kaynak önerileri | Uyarı → incele → görüşme planla → çalışma ata → takip → sonraki denemeyi karşılaştır → sonuçlandır |
| **Rehberlik uzmanı** | Öğretmenle aynı ekranlar | Rehberlik uzmanı = branşı **"Rehberlik"** olan öğretmen (`TEACHER_SUBJECT_GROUPS`'ta mevcut). Erişim, sorumlu öğretmenlik ya da atama yoluyla verilir (yol haritası kararı 1–2). Ayrı rol açılmaz |
| **Kurum yöneticisi** | Rehber özeti (sayılar ve eğilimler), Connect aktarımları, sınıf gelişim grafikleri, Nabız raporları, denetim | Yöneticiye ayrıntılı not varsayılan olarak **kapalı**; görünen yalnızca vaka durumu ve kanıt özeti |
| **Veli** | Haftalık gelişim merkezi | Bağlantı kodu → öğrenci onayı → özet. Görünmeyenler: defter, Duvar, `staff` ve `owner_only` notlar |

### Öğrenci rehberlik dosyası (belge §4 yerleşimi, mevcut `StudentDetail.tsx` üzerine)

- **Üst bölüm:**
  - Ad / kurum öğrenci numarası, sınıf, sınav türü.
  - Sorumlu öğretmen, son deneme, son etkinlik.
  - **Takip durumu rozeti**: Takip yok / İnceleniyor / Görüşme planlandı / Çalışma atandı / Takipte / Sonuçlandı.
- **Orta bölüm:**
  - Net grafiği, sınav türüne göre (✅ var).
  - Ders bazında performans (🟡 deneme `subjectsJson`'dan).
  - Haftalık çalışma süresi eğilimi (🆕, `topic_study_logs`'tan).
  - Eksik konular (✅ var).
  - Kaynak360 ilerlemesi (🆕, kitap tamamlanma yüzdeleri).
  - Son ödevler (✅ "Plan ve görevler").
- **Alt bölüm (eylem çubuğu):**
  - "Çalışma kayıtlarını değerlendirdim", "Görüşme planla", "Tekrar çalışması ata", "Sonraki denemede karşılaştır", "Takip notu", "Müdahaleyi sonuçlandır".
  - Her eylem: yetki kontrolü (`assertCanViewStudent`) + `guidance_events` + `organization_audit_logs`.

### Yönetici Rehber özeti

Kartlar:
- İnceleme gerektiren öğrenci sayısı.
- Son 7 günde açılan uyarılar.
- Görüşme bekleyenler.
- Açık müdahaleler.
- Sonuçlananlar.
- **Geciken öğretmen takipleri** (`dueAt` geçmiş açık vakalar).

Ayrıca sınıf bazlı net eğilimi grafiği. Süzgeçler: sınıf, sınav türü, kural, öğretmen, durum.

---

## D. Rehber motoru — 82 → 76 → 69 uçtan uca

**Öğrenci 024**, 12-A Sayısal, TYT. Son üç karşılaştırılabilir deneme: 82 → 76 → 69 (aynı yayınevi serisi, tam deneme, kurumdan aktarılmış).

### D1. Tespit (kural tabanlı, açıklanabilir, AI yok)

Bugünkü kural yalnızca son iki denemeye bakıyor: `delta ≤ −5` (76 → 69 = −7, yani tetiklenir) ve karşılaştırılabilirlik denetimi yok. Önerilen genişletme `shared/guidance.ts` adlı saf bir modül olur (testlenebilir, sunucu ve istemci ortak kullanır):

```
trend_decline (net düşüş eğilimi):
  girdi: aynı karşılaştırılabilirlik anahtarındaki son N=3 deneme, tarih sırasıyla
  koşul: her adım ≤ 0  VE  toplam düşüş ≥ eşik (varsayılan 5 net; LGS için 3)
         82→76 (−6), 76→69 (−7), toplam −13  →  tetiklenir
  güven:
    high   = 3 deneme, aynı anahtar, ≤ 75 gün içinde, kaynağı kurum (Connect)
    medium = 3 deneme ama öğrencinin kendi girişi ya da yayınevi bilinmiyor
    low    = yalnız 2 deneme ya da farklı yayınevleri → uyarı ÜRETİLMEZ, dosyada "düşük güvenli işaret" olarak görünür
  çıktı: { ruleKey, examKind, confidence, evidence: [{date, title, net}], totalChange: −13 }
```

Diğer kurallar aynı biçimde tanımlanır:
- Mevcut kurallar: `inactive`, `low_adherence`.
- `repeated_topic_errors`: 14 günde aynı konuda 3 ve üstü "çözemedim" denemesi. Kaynak `question_attempts` ve konu durumu.
- `overdue_assignments`: öğretmen görevinin teslimi 3 günden fazla geçmiş.
- `overdue_reviews`: tekrarın 7 günden fazla gecikmesi.

Eşikler `organization_guidance_rules` tablosundan okunur.

**Etiket dili:** Ekranda "başarısız/yetersiz/sorunlu" sözcükleri geçmez. Başlık **"Akademik inceleme önerisi"**, metin belgedeki cümlenin aynısıdır:
> "Öğrencinin son üç karşılaştırılabilir denemesinde netleri düşüş eğilimindedir. Çalışma kayıtları ve ders bazlı sonuçlar incelenerek rehberlik görüşmesi değerlendirilmesi önerilir."

### D2. Vaka açma ve yönlendirme

- **Ne zaman çalışır:** Kurum sonuçları yayımlandığında (Connect `published`), ve her gece mevcut özet cron'u ile birlikte.
- **Vaka açma:** `guidance_cases` satırı açılır. Aynı kural ve sınav türü için açık vaka varsa yeni vaka açılmaz; mevcut vakaya `evidence_updated` olayı eklenir.
- **Vakanın sahibi:** Öğrencinin **sorumlu öğretmeni**, yani sınıf sorumlusu; yoksa atanmış öğretmen (yol haritası kararı 1). Sorumlu öğretmen yoksa vaka koordinatör kuyruğuna düşer.
- **Bildirim:** Uygulama içi bildirim gider ve haftalık öğretmen özetine "1 yeni inceleme önerisi" satırı eklenir.

### D3. İnceleme → görüşme → çalışma

1. Öğretmen dosyayı açar ve "İnceliyorum"u seçer (`reviewing`). Dosyada şunları görür:
   - Ders kırılımı, örneğin: Matematik 28 → 25 → 21, Fen 16 → 15 → 14.
   - Son 4 haftanın çalışma süresi.
   - Plan uyumu.
   - Eksik konular.
   - Kitap ilerlemesi.
2. "Görüşme planla" (`meeting_planned`): tarih seçilir. Öğrenci "Öğretmeninle görüşme: Perşembe 16:00" bildirimini alır ve görüşme takviminde dolu saat olarak görünür.
3. Görüşme yapılır (`meeting_held`). Özet girilir; görünürlüğü seçilir: yalnızca ben / personel / öğrenciye / veliye.
4. "Tekrar çalışması ata" (`action_assigned`): örneğin "Problemler — 3 gün, 40'ar dk, 20 soru". Mevcut `org.tasks.assign` kullanılır, oturumlar `guidanceCaseId` ile vakaya bağlanır.

### D4. Takip ve sonuç

- **Takip:** Öğrenci görevleri tamamladıkça `task_completed` olayları düşer. Vaka `follow_up` durumuna geçer ve tamamlanma oranı görünür (örneğin 3/3).
- **Karşılaştırma:** Aynı karşılaştırılabilirlik anahtarında **vakadan sonraki ilk deneme** gelince sistem bir `compared` olayı yazar. Örnek: "Vaka öncesi son deneme 69, sonraki deneme 74 (+5). Atanan çalışmaların 3/3'ü tamamlandı."
- **Sonuç otomatik ilan edilmez.** Sonucu öğretmen seçer:
  - **Tamamlandı**
  - **Devam ediyor**
  - **Yeniden değerlendirme gerekli**

  Ekranda şu not yer alır: "Net değişimi tek başına müdahalenin etkisini göstermez." (belge §4)
- **Kayıt ve görünürlük:** Kapanan vaka öğrencinin "geçmiş müdahaleler" listesinde kalır. Yönetici özetindeki "Sonuçlananlar" sayısı artar.

### D5. Testler (kabul testlerinden)

- **`shared/guidance.ts` birim testleri:**
  - 82 / 76 / 69 durumunda kural tetiklenir.
  - 82 / 85 / 69 durumunda tetiklenmez (her adım düşmüyor).
  - TYT ve AYT karışık olursa tetiklenmez.
  - Yalnız 2 deneme varsa güven düşük kalır ve uyarı üretilmez.
- **Veritabanı testleri:**
  - Aynı sinyal ikinci kez gelince ikinci vaka açılmaz.
  - Başka kurumun öğretmeni vakayı göremez.
  - Atanmamış öğretmen vakayı göremez.
  - `owner_only` not yöneticiye görünmez.
- **Uçtan uca:** öğretmen uyarıdan görüşme planlar ve çalışma atar → öğrenci tamamlar → yeni sonuç aktarılır → karşılaştırma görünür → öğretmen vakayı sonuçlandırır.

---

## E. UI ve görsel referans paketi

**Tasarım sistemi:**
- **Renkler:** Mevcut token'lar korunur ve genişletilir.
  - Ana renk `--brand #17625f` (petrol).
  - Yeni `--teal #1fa3a0` (turkuaz vurgu).
  - Zemin `--paper #f3f6f5`.
  - Vurgu `--pencil #f2b934`.
- **Yazı tipi:** Plus Jakarta Sans.
- **Ürüne göre ton:**
  - Koç: sıcak, motive edici (pencil vurgusu, büyük ilerleme halkaları).
  - Rehber: sakin (düşük doygunluk, bol boşluk, kırmızı yerine amber uyarı).
  - Veli: büyük göstergeler ve sade grafikler.
  - Yönetici: güçlü süzgeçler, tablo + grafik.
- **Ortak durum ekranları:** yükleniyor (iskelet), boş durum (eylem önerisiyle), hata (tekrar dene). Hepsi mevcut `EmptyNote` ve `Panel` bileşenleri üzerine.
- **Mobil kural:** 390 px'te yatay taşma olmaz (Duvarım ve Ders programı aynı ölçütle denetlendi).

| Ürün | Masaüstü yerleşim | Mobil | Ana bileşenler |
|---|---|---|---|
| **Koç** | Sol menü + "Bugün" kartı + haftalık halka + tekrar listesi | Alt sekme çubuğu, kart yığını | Mevcut Home/Overview |
| **Rehber** | 3 sütun: vaka kuyruğu / öğrenci dosyası / zaman çizelgesi | Kuyruk → dosya → zaman çizelgesi (sekmeli) | `GuidanceQueue`, `CaseHeader`, `EvidenceChart`, `CaseTimeline`, `ActionBar` |
| **Veli** | Tek sütun, 4 büyük gösterge + "bu hafta" anlatımı | Aynı (zaten tek sütun) | `ParentWeekHero`, `BigStat`, `ExamCompare`, `TeacherSharedTips` |
| **Growth** (sonraki faz) | Huni grafiği + aday listesi | Liste | — |

**Örnek veri:** Öğrenci 024 ve 82 / 76 / 69 senaryosu. Veri gerçekçi olmalı ama gerçek kişi ya da kurum adı kullanılmamalı (görseldeki "Okula Populo" gibi tabelalar da dahil).

**Tanıtım görselleri:** Görseldeki dört sahne yalnızca yön gösterir. Yayında **özgün ya da kullanım hakkı alınmış** görsel kullanılmalı. Aşağıdaki promptlar görsel üretim araçları içindir:

- **Novara Koç:** "A Turkish high-school student studying at a bright wooden desk by a window, laptop showing a calm study dashboard with a teal progress ring, open notebook and highlighter, soft morning light, plants in background, modern and trustworthy edtech mood, natural candid photo style, no logos, no text."
- **Novara Rehber:** "A guidance counselor and a teenage student having a warm one-on-one academic conversation at a small round table in a calm, plant-filled study room, tablet with a simple line chart on the table, professional yet friendly atmosphere, soft daylight, muted teal and warm wood tones, no logos, no readable text."
- **Novara Veli:** "A parent and a teenager smiling together at a laptop on a kitchen table, the screen shows large friendly progress cards and a simple bar chart in teal and amber, cozy home light, coffee cup and notebook, family-friendly and reassuring mood, no brand names, no readable text."
- **Novara Growth:** "Modern tutoring-center reception and consultation area, a staff member talking with a parent and a student at a round table, clean white walls with a blank sign, teal accents, bright professional atmosphere, no logos, no readable text."

---

## F. Yazılım geliştirme görevleri (dosya bazlı)

| Katman | Dosya | İş |
|---|---|---|
| Paylaşılan kurallar | 🆕 `shared/guidance.ts` | Karşılaştırılabilirlik anahtarı, `trend_decline` ve diğer kurallar, güven düzeyi, metin şablonları (`RISK_RULES` buraya taşınır, `shared/org.ts` yeniden dışa aktarır) |
| Paylaşılan kurallar | `shared/org.ts` | `summarizeStudent` yeni kurallara bağlanır; mevcut rozetler korunur |
| Şema | `drizzle/schema.ts` + **yeni** migration `0003_novara_guidance_connect.sql` (0002 yayınlanmadığı için ona katlanabilir) | B1–B3 tabloları, RLS satırları |
| Sunucu | 🆕 `server/guidance/guidanceDb.ts`, `guidanceEngine.ts` | Vaka aç/güncelle (tek açık vaka), olaylar, görüşme, karşılaştırma |
| Sunucu | 🆕 `server/routers/guidance.ts` (`org` altına `guidance` alt router'ı) | `queue`, `case.get`, `case.review`, `meeting.schedule/held`, `task.assign` (mevcut `insertAssignedTask`), `case.close`, `adminSummary` |
| Sunucu | 🆕 `server/connect/parseExamFile.ts`, `connectDb.ts`, `server/routers/connect.ts` | CSV/Excel ayrıştırma (`xlsx` paketi zaten bağımlılık), kolon eşleme, doğrulama raporu, yayımla, aynı dosya ve aynı satır engeli |
| Sunucu | `server/org/orgAccess.ts`, `server/org/orgDb.ts` | Not görünürlüğü `owner_only` / `parent`; `externalCode` |
| Sunucu | `server/digest/teacherDigest.ts`, `parentDigest.ts` | Yeni vakalar / veliye paylaşılan öneriler |
| Sunucu | 🆕 `server/pulse/*`, `server/routers/pulse.ts` | Nabız (P1, Rehber'den sonra) |
| İstemci | `client/src/pages/org/StudentDetail.tsx` | Rehber dosyası yerleşimi, eylem çubuğu |
| İstemci | 🆕 `client/src/pages/org/OrgGuidance.tsx` | Vaka kuyruğu + yönetici özeti |
| İstemci | 🆕 `client/src/pages/org/OrgConnect.tsx` | Dosya yükle → kolon eşle → doğrula → yayımla |
| İstemci | `client/src/pages/org/OrgApp.tsx`, `orgShared.tsx` | Menü: "Rehberlik", "Veri aktarımı" |
| İstemci | `client/src/pages/exams/ExamsDashboard.tsx` | "Kurumdan" etiketli salt okunur sonuçlar |
| İstemci | Veli sayfası (`server/routers/parent.ts` + ilgili istemci sayfası) | Görev, karşılaştırma ve paylaşılan öneri kartları |
| Testler | 🆕 `server/guidance.test.ts`, `server/connect.test.ts`; `e2e/smoke.spec.ts` | D5 ve H listesi |

---

## G. Fazlara göre teslim planı (gerekçeli sıralama)

| # | Faz | Belgedeki sıra | Öneri ve gerekçe |
|---|---|---|---|
| 0 | Denetim (bu belge) | 1 | ✅ |
| 1 | **Rehber iş akışı — mevcut veriyle** | 3 | Öne alındı. Risk kuralları, ekranlar ve görev atama zaten var; eksik yalnızca vaka ve iş akışı. 1–2 haftada kurum pilotuna gösterilebilir değer üretir. Görseldeki öneriyle de aynı. |
| 2 | **Connect — deneme sonucu ve roster CSV/Excel** | 2 | Rehber'in güven düzeyini "medium"dan "high"a taşır. Ders programı aktarımı sonra, çünkü elle giriş ve otomatik dağıtım zaten var. |
| 3 | **Pusula Aşama 2a: konu kimliği + tek çalışma kaydı** (yol haritası) | — | "Tekrarlanan konu yanlışı" kuralı ve Kaynak360 ↔ konu karşılaştırması için şart. Faz 1–2 ile paralel gidebilir. |
| 4 | Ödev (sınıfa toplu ödev, doğrulama) + Kaynak360 kurumsal | 4 | Rehber'in "çalışma ata" adımını sınıf düzeyine taşır |
| 5 | Veli gelişim merkezi | 6 | Öne alınabilir; veri hazır. Yalnızca "öğretmenin paylaştığı öneri" Rehber'e bağlı |
| 6 | Nabız | 5 | Bağımsız modül; pilot geri bildirimi için faydalı |
| 7 | LGS kapsamının tamamlanması + regresyon | 7 | LGS müfredatı ve tahmini puan var. Eksik: kazanım düzeyi ve 2027 resmî tarih |
| 8 | **Pilot dershane** | 8 | Supabase geçişi ve marka kararı bu fazdan önce bitmeli |
| 9 | CRM ve Growth | 9 | Mimari hazır; tablo açılmaz |

**Pilot öncesi kapılar (yazılım dışı):**
- KVKK ve veli rıza metinlerinin hukuk kontrolü (taslaklar `shared/parent.ts`, kurum KVKK metni).
- Supabase canlı geçişi.
- Marka kararı: "Pusula Study-Coach" ve "Novara" adlarının uygulamaya ve e-postalara yansıması.
- Fiyatlandırma.

---

## H. Kabul testleri

| Senaryo | Nasıl doğrulanır | Bugün |
|---|---|---|
| Aynı kurumda farklı öğretmen yetkileri | Atanmamış öğretmen öğrenciyi ve vakayı göremez; sorumlu öğretmen görür; `owner_only` not yöneticiye kapalı | Kısmen var (`orgIsolation.test.ts`, `orgTimetable.test.ts`) |
| Kurumlar arası izolasyon | B kurumunun öğretmeni A'nın öğrencisini, vakasını ve aktarımını göremez; RLS açık | Var (izolasyon testi); yeni tablolar için eklenecek |
| Aynı dosyanın tekrar yüklenmesi | Aynı `fileHash` reddedilir; farklı dosyada aynı satır (examCode + externalCode) tekrar eklenmez | Yeni |
| TYT/AYT/LGS ayrı karşılaştırma | Karışık sınavlarda `trend_decline` tetiklenmez; grafik sınav türüne göre ayrılır | Grafik var; kural yeni |
| Risk bildiriminden müdahale | 82 / 76 / 69 → vaka → görüşme → görev | Yeni (uçtan uca) |
| Öğrencinin çalışmayı tamamlaması | Görev tamamlanınca vaka zaman çizelgesine düşer | Görev tamamlama var; bağlantı yeni |
| Yeniden deneme değerlendirmesi | Sonraki karşılaştırılabilir deneme `compared` olayı üretir; sonuç otomatik ilan edilmez | Yeni |
| Veli erişim sınırları | Veli defteri, Duvarı ve `staff` / `owner_only` notları göremez; yalnızca `parent` görünürlüğü | Kısmen var (`parentAccess.test.ts`) |
| Anonim anket gizliliği | Yanıtta `userId` yok; 5'ten az yanıtlı kırılım gizli | Yeni |
| Mobil uyum | 390 px'te yatay taşma yok; Rehber dosyası sekmeli | Ölçüt var (Duvarım, Ders programı) |
| Mevcut YKS özellikleri bozulmaz | 658 birim + 22 uçtan uca test her fazda geçer | Var |

---

## 11. Dokunulacak bölümler ve ilk güvenli adımlar

**İlk faza (Rehber iş akışı) dokunacak yerler:**
- `shared/org.ts` (yalnızca kural taşıma, davranış aynı)
- 🆕 `shared/guidance.ts`
- `drizzle/schema.ts` + migration (yalnızca yeni tablolar ve boş bırakılabilir alanlar)
- 🆕 `server/guidance/*`, `server/routers/org.ts` (alt router ekleme)
- `server/org/orgAccess.ts` (not görünürlüğü)
- `client/src/pages/org/StudentDetail.tsx`, 🆕 `OrgGuidance.tsx`, `OrgApp.tsx`
- Testler

**Dokunulmayacak yerler:** Öğrenci uygulamasının akışları, abonelik/ödeme, mevcut YKS hesapları.

**İlk güvenli adımlar (sırayla, her biri ayrı commit ve testli):**
1. `shared/guidance.ts`: mevcut 3 kuralı davranış değiştirmeden taşı. Ardından `trend_decline` ve güven düzeyini **saf fonksiyon** olarak ekle ve 82 / 76 / 69 birim testlerini yaz. Bu adım veritabanına ve ekrana dokunmuyor.
2. `guidance_cases`, `guidance_events` ve `guidance_meetings` tablolarını ekle; "tek açık vaka" kısıtını ve izolasyon testlerini yaz.
3. Sunucu uçlarını yaz: vaka kuyruğu, inceleme, görüşme, görev, sonuçlandırma. Her uç `assertCanViewStudent` ve denetim kaydından geçer.
4. Öğrenci dosyasına eylem çubuğu ve zaman çizelgesini ekle; vaka kuyruğu sayfasını kur.
5. Not görünürlüğüne `owner_only` ve `parent` kademelerini ekle; yönetici varsayılanını kapat. Bu adım **mevcut davranışı değiştiriyor**: bugün yöneticiler tüm notları görüyor. Bu yüzden onayınla yapılır.
6. Uçtan uca senaryo: 82 → 76 → 69.

**Senden beklenen kararlar:**
1. Sıralama: Rehber'in Connect'ten **önce** başlaması (gerekçe G'de). Onaylıyor musun?
2. Yöneticinin ayrıntılı notları varsayılan olarak **görmemesi**. Bu, bugünkü davranışı değiştiren bir karar.
3. Rehberlik uzmanı = branşı "Rehberlik" olan öğretmen, ayrı rol yok. Uygun mu?
4. `trend_decline` eşiği: YKS için toplam 5 net, LGS için 3 net, kurum değiştirebilir. Uygun mu?
5. Marka: "Pusula Study-Coach" (öğrenci) + "Novara" (kurum). Uygulamadaki "Pusula YKS" adı ne zaman değişsin?

---

*Bu belge `PUSULA_STUDY_COACH_ROADMAP.md` ile birlikte okunmalıdır. Öğrenci tarafı (Pusula) orada, kurum tarafı (Novara) burada. Ortak altyapı işleri (konu kimliği, tek çalışma kaydı) iki belgede de aynı adımdır.*
