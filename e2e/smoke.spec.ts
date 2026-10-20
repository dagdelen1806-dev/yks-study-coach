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
