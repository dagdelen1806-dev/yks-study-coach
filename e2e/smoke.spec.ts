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
  // ogrenci2 = "Kerem" (misafir demosu "Ece" olduğu için ad ayırt edicidir).
  await signIn(page, "ogrenci2@test.local");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("Kerem");
  await page.locator(".profile-button").click();
  await page.getByRole("menuitem", { name: "Çıkış yap" }).click();
  await expect(page.getByRole("button", { name: "Giriş yap" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).first()).not.toContainText("Kerem");
  await expect(page.locator("body")).not.toContainText("Kerem");
});

test("kurum yöneticisi Kurum Paneli'nde öğrencilerini görür", async ({ page }) => {
  await signIn(page, ORG_ADMIN);
  await page.goto("/kurum");
  await expect(page.getByRole("heading", { name: "Kurum Paneli" })).toBeVisible();
  await page.getByRole("button", { name: "Öğrenciler" }).first().click();
  await expect(page.getByText("Kerem").first()).toBeVisible();
  await expect(page.getByText("Zeynep").first()).toBeVisible();
});
