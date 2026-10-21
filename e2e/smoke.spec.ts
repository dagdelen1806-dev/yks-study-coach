import { expect, test, type Page } from "@playwright/test";

// Örnek kurumdaki öğrenci ve yönetici (e2e/global-setup.ts → scripts/seed-test-org.ts).
const STUDENT = "ogrenci1@test.local";
const ORG_ADMIN = "kurum.admin@test.local";
const PASSWORD = "test1234";

async function signIn(page: Page, identifier: string) {
  const response = await page.request.post("/api/auth/login", { data: { identifier, password: PASSWORD, mode: "login" } });
  expect(response.ok(), `${identifier} giriş yapamadı`).toBeTruthy();
}

// Her testte tarayıcıda yakalanmamış bir JS hatası olursa test kalır.
let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
});
test.afterEach(() => {
  expect(pageErrors, "sayfada yakalanmamış hata").toEqual([]);
});

const nav = (page: Page, label: string) => page.locator('nav[aria-label="Bölümler"] button', { hasText: label }).first();

test("öğrenci giriş yapar; Genel Bakış ve tüm bölümler hatasız açılır", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("Ece");
  await expect(page.locator("#guide-title")).toBeVisible();
  for (const [label, heading] of [["Konu Haritası", "Konu Haritası"], ["Denemeler", "Denemeler"], ["AI Planım", "AI Planım"], ["Takvim", "Takvim"], ["Defter", "Defter"], ["Genel Bakış", "Ece"]] as const) {
    await nav(page, label).click();
    await expect(page.locator("main h1").first()).toContainText(heading);
  }
});

test("deneme sonucu eklenir ve listede görünür", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  await nav(page, "Denemeler").click();
  await page.locator("main").getByRole("button", { name: "Deneme ekle" }).first().click();
  const title = `E2E Deneme ${Date.now()}`;
  await page.getByPlaceholder("Örn. Dershane TYT · 04").fill(title);
  await page.getByLabel("Türkçe").first().fill("31.25");
  await page.getByRole("button", { name: "Kaydet ve çalışma planına aktar" }).click();
  await expect(page.getByText(title).first()).toBeVisible();
});

test("odak oturumu açılır ve kapanır", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  await page.getByRole("button", { name: /Bugünkü planıma başla|Serbest oturum başlat/ }).click();
  await expect(page.locator(".focus-topbar")).toBeVisible();
  await page.locator(".focus-topbar button", { hasText: "Çıkış" }).click();
  await expect(page.locator(".focus-topbar")).toHaveCount(0);
});

test("odak süresi dolmadan sonuç girilemez; çıkış yarım sayılır ve konu tekrar listesine düşer", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  await page.getByRole("button", { name: /Bugünkü planıma başla|Serbest oturum başlat/ }).click();
  await page.getByRole("button", { name: "Odağı başlat" }).click();
  await expect(page.getByRole("button", { name: /Erken bitir/ })).toHaveCount(0);
  await expect(page.getByText("Sonuçlarını süre dolunca girersin.")).toBeVisible();
  const topic = (await page.locator(".focus-topbar .text-white\\/45").innerText()).split(" · ")[1];
  await page.locator(".focus-topbar button", { hasText: "Çıkış" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Oturumdan çık" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Odağa devam et" }).click();
  await expect(confirm).toHaveCount(0);
  await page.locator(".focus-topbar button", { hasText: "Çıkış" }).click();
  await confirm.getByRole("button", { name: "Yarım bırak ve çık" }).click();
  await expect(page.locator(".focus-topbar")).toHaveCount(0);
  await expect(page.getByText(`${topic} tekrar gerektiren konulara eklendi`)).toBeVisible();
  const progress = await page.request.get("/api/trpc/topics.progress");
  const rows = (await progress.json()).result.data.json as Array<{ topic: string; status: string }>;
  expect(["Zayıf", "Orta"]).toContain(rows.find((row) => row.topic === topic)?.status);
});

test("takvimden açılıp yarım bırakılan oturum takvimde 'Yarım kaldı' görünür", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  await nav(page, "Takvim").click();
  const topic = `E2E yarım ${Date.now()}`;
  await page.getByRole("button", { name: /Fazladan çalışmak istersen/ }).click();
  await page.getByPlaceholder("Konu (örn. İntegral)").fill(topic);
  await page.getByRole("button", { name: "Ekle", exact: true }).first().click();
  await expect(page.getByText("Fazladan oturum bugünün planına eklendi.")).toBeVisible();
  await page.getByRole("tab", { name: "Günlük", exact: true }).click();
  const card = () => page.locator("main div.rounded-2xl.border", { hasText: `${topic} (ekstra)` }).first();
  await card().getByRole("button", { name: "Odakla başlat" }).click();
  await page.getByRole("button", { name: "Odağı başlat" }).click();
  await page.locator(".focus-topbar button", { hasText: "Çıkış" }).click();
  await page.getByRole("alertdialog", { name: "Oturumdan çık" }).getByRole("button", { name: "Yarım bırak ve çık" }).click();
  await expect(page.locator(".focus-topbar")).toHaveCount(0);
  await expect(card().getByText("Yarım kaldı", { exact: true })).toBeVisible();
  await expect(card().getByRole("button", { name: "Odakla başlat" })).toBeVisible();
});

test("soru defterine soru eklenir; Escape pencereyi kapatır", async ({ page }) => {
  await signIn(page, STUDENT);
  await page.goto("/");
  const capture = page.locator('[role="dialog"][aria-label="Soru ekle"]');
  const openCapture = () => page.getByRole("button", { name: "Çözemediğin soruyu ekle" }).first().click();

  await openCapture();
  await expect(capture).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(capture).toHaveCount(0);

  await openCapture();
  await capture.getByPlaceholder("Örn. İkinci adımdan sonra ne yapacağımı anlamadım…").fill(`E2E: paydaları eşitleme adımında takıldım ${Date.now()}`);
  await capture.locator("button.bg-brand").last().click();
  await expect(page.getByText("Soru defterine eklendi")).toBeVisible();
  await expect(capture).toHaveCount(0);
});

test("uygulama telefona yüklenebilir: manifest, ikon ve rehber videosu sunulur", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const body = await manifest.json();
  expect(body.icons.length).toBeGreaterThanOrEqual(2);
  expect((await request.get(body.icons[0].src)).ok()).toBeTruthy();
  expect((await request.head("/videos/pusula-nasil-kullanilir.mp4")).ok()).toBeTruthy();
});

test("tanıtım sayfası paylaşım önizlemesi ve arama motoru dosyaları sunulur", async ({ page, request }) => {
  await page.goto("/");
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toMatch(/\/og-image\.png$/);
  const image = await request.get(new URL(ogImage!).pathname);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("<urlset");
});

// LGS öğrencisi (scripts/seed-test-org.ts): 8. sınıf, anketi bitmiş, verisi yok. Veli hesabı bağlantısız.
const LGS_STUDENT = "lgs1@test.local";
const PARENT = "veli1@test.local";

test("LGS öğrencisi LGS dersleriyle deneme ekler; tahmini puan görünür, TYT/AYT görünmez", async ({ page }) => {
  await signIn(page, LGS_STUDENT);
  await page.goto("/");
  await expect(page.getByText("Kişisel LGS koçun").first()).toBeVisible();
  await nav(page, "Denemeler").click();
  await expect(page.getByLabel("Sınav türü")).toHaveCount(0);
  await page.locator("main").getByRole("button", { name: "Deneme ekle" }).first().click();
  const title = `E2E LGS Deneme ${Date.now()}`;
  await page.getByPlaceholder("Örn. Dershane LGS · 04").fill(title);
  await expect(page.locator(".modal-card select option")).toHaveText(["LGS"]);
  await page.getByLabel("Türkçe neti").fill("16");
  await page.getByLabel("Matematik neti").fill("12");
  await page.getByLabel("Fen Bilimleri neti").fill("15");
  await page.getByLabel("İngilizce neti").fill("9");
  await expect(page.getByText("3 yanlış 1 doğruyu götürür")).toBeVisible();
  await page.getByRole("button", { name: "Kaydet ve çalışma planına aktar" }).click();
  await expect(page.getByText(title).first()).toBeVisible();
  const scoreCard = page.locator("main").getByText("Tahmini LGS puanı").first();
  await expect(scoreCard).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Son TYT neti");
});

test("veli kodla bağlanır, öğrenci onaylayınca veli özeti görür ama notları görmez", async ({ page, browser }) => {
  await signIn(page, LGS_STUDENT);
  await page.goto("/");
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Veli erişimi" }).click();
  const dialog = page.getByRole("dialog", { name: "Veli erişimi" });
  await dialog.getByRole("button", { name: "Veli kodu üret" }).click();
  const code = (await dialog.getByTestId("parent-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  const parentContext = await browser.newContext();
  const parent = await parentContext.newPage();
  parent.on("pageerror", (error) => pageErrors.push(error.message));
  await signIn(parent, PARENT);
  await parent.goto(`/veli?kod=${code}`);
  await expect(parent.getByLabel("Veli kodu")).toHaveValue(code);
  await expect(parent.getByRole("button", { name: "Bağlan" })).toBeDisabled();
  await parent.getByRole("checkbox").first().check();
  await parent.getByRole("button", { name: "Bağlan" }).click();
  await expect(parent.getByText(/isteğini henüz onaylamadı/)).toBeVisible();

  await page.reload();
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Veli erişimi" }).click();
  await page.getByRole("dialog", { name: "Veli erişimi" }).getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Velin artık özetini görebilir.")).toBeVisible();

  await parent.reload();
  await expect(parent.getByRole("heading", { name: "Mert" })).toBeVisible();
  await expect(parent.getByText("Tahmini LGS puanı")).toBeVisible();
  await expect(parent.getByText("Hedef: Fen Lisesi · 450 puan")).toBeVisible();
  await expect(parent.locator("body")).not.toContainText("Soru defteri ");

  // Öğrenci erişimi kaldırınca veli artık göremez.
  page.once("dialog", (confirm) => void confirm.accept());
  await page.getByRole("dialog", { name: "Veli erişimi" }).getByRole("button", { name: "Erişimi kaldır" }).click();
  await expect(page.getByText("Veli erişimi kaldırıldı.")).toBeVisible();
  await parent.reload();
  await expect(parent.getByRole("heading", { name: "Mert" })).toHaveCount(0);
  await expect(parent.getByLabel("Veli kodu")).toBeVisible();
  await parentContext.close();
});

test("KPSS adayı ankette KPSS'yi seçer; yetişkin eğitim durumları, tek net ve hedef kadro sorulur", async ({ page }) => {
  await signIn(page, "kpss1@test.local");
  await page.goto("/");
  // MEB-AGS ve KPSS A grubu seçeneklerinin açıklamasında da "KPSS" geçer.
  await page.getByRole("radio", { name: /^KPSS(?! A grubu)/ }).click();
  await expect(page.getByText("Eğitim durumun")).toBeVisible();
  await expect(page.locator("#onboarding-grade button")).toHaveText(["Lisans öğrencisi", "Lisans mezunu", "Önlisans mezunu", "Lise mezunu"]);
  await expect(page.locator("#onboarding-score-type")).toHaveCount(0);
  await page.getByLabel("Sana nasıl hitap edelim?").fill("Burak");
  await page.getByRole("checkbox", { name: "Lisans mezunu", exact: true }).click();
  await page.getByLabel("Hedef sınav yılın").fill(String(new Date().getFullYear() + 2));
  await page.getByRole("button", { name: "Devam et" }).click();
  await expect(page.getByLabel("Mevcut KPSS netin")).toBeVisible();
  await expect(page.locator("#onboarding-strong-subjects button")).toHaveText(["Türkçe", "Matematik", "Tarih", "Coğrafya", "Vatandaşlık", "Güncel Bilgiler"]);
  await page.getByRole("button", { name: "Devam et" }).click();
  await expect(page.getByPlaceholder("Örn. Vergi müfettiş yardımcılığı")).toBeVisible();
  await expect(page.getByText("Hedef KPSS puanın")).toBeVisible();
  await expect(page.getByText("100 üzerinden; örn. 85.")).toBeVisible();
});

test("KPSS + MEB-AGS adayı iki sınavı birlikte alır: paket indirimi, iki ayrı abonelik", async ({ page }) => {
  await signIn(page, "ags1@test.local");
  await page.goto("/premium");
  await expect(page.getByText("Hangi sınavlar için?")).toBeVisible();
  await page.getByRole("button", { name: "MEB-AGS" }).click();
  const summary = page.locator("main").getByText("Ödeme özeti").locator("..");
  await expect(summary.getByText("Paket indirimi %20")).toHaveCount(2);
  await expect(summary).toContainText("799 ₺");
  await summary.getByRole("button", { name: /Ücretsiz denemeyi başlat|Ödemeyi tamamla/ }).click();
  const subscriptionsCard = page.locator("main").getByText("Aboneliklerin").locator("../../..");
  await expect(subscriptionsCard).toContainText("KPSS · Premium");
  await expect(subscriptionsCard).toContainText("MEB-AGS · Premium");
});

test("çıkış yapınca önceki öğrencinin verisi ekranda kalmaz", async ({ page }) => {
  // ogrenci2 = "Kerem": çıkıştan sonra adı hiçbir yerde kalmamalı.
  await signIn(page, "ogrenci2@test.local");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("Kerem");
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Çıkış yap" }).click();
  await expect(page.getByRole("button", { name: "Hesap oluştur", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).not.toContainText("Kerem");
});

test("giriş yapmamış ziyaretçi her adreste tanıtım sayfasını görür", async ({ page }) => {
  for (const path of ["/", "/denemeler", "/takvim", "/konu-haritasi", "/defter"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Fiyatlar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hesap oluştur", exact: true })).toBeVisible();
    await expect(page.locator('nav[aria-label="Bölümler"]')).toHaveCount(0);
    await expect(page.getByText("Demo verisi")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Hesap oluştur", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Kayıt ol" })).toBeVisible();
});

test("öğrenci yorum gönderir; onaylanmadan tanıtım sayfasında görünmez", async ({ page, browser }) => {
  await signIn(page, "ogrenci2@test.local");
  await page.goto("/");
  const body = `E2E yorum ${Date.now()}: deneme analizleri sayesinde zayıf konularımı netleştirdim.`;
  const dialog = page.locator('[role="dialog"][aria-label="Yorum bırak"]');
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Yorum bırak" }).click();
  await dialog.getByPlaceholder("Pusula çalışmana nasıl yardımcı oldu?").fill(body);
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(page.getByText("onaylandıktan sonra tanıtım sayfasında görünecek")).toBeVisible();
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Yorum bırak" }).click();
  await expect(dialog.getByText("Onay bekliyor")).toBeVisible();

  const visitor = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Öğrenciler ne diyor?" })).toBeVisible();
  await expect(visitor.getByText(body)).toHaveCount(0);
  await visitor.close();
});

test("kurum panelinden çıkış da ilk sayfaya döner", async ({ page }) => {
  await signIn(page, ORG_ADMIN);
  await page.goto("/kurum");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Hesap oluştur", exact: true })).toBeVisible();
});

test("kurum yöneticisi Kurum Paneli'nde öğrencilerini görür", async ({ page }) => {
  await signIn(page, ORG_ADMIN);
  await page.goto("/kurum");
  await expect(page.getByRole("heading", { name: "Kurum Paneli" })).toBeVisible();
  await page.getByRole("button", { name: "Öğrenciler" }).first().click();
  await expect(page.getByText("Kerem").first()).toBeVisible();
  await expect(page.getByText("Zeynep").first()).toBeVisible();
});
