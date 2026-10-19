import { defineConfig, devices } from "@playwright/test";

// Duman testi: gerçek tarayıcıda kritik akışlar (bkz. e2e/). Sunucu ayrı bir portta açılır;
// port doluysa Playwright hata verir (reuseExistingServer: false) — başka bir sunucunun eski
// kodu yanıtlayıp testin yanlışlıkla geçmesi olmasın. Sunucunun kendisi boş port arar
// (server/_core/index.ts), bu yüzden portu burada sabit tutup dolu olmasına izin vermiyoruz.
const PORT = 3999;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // Yerelde indirilmiş Chromium yoksa E2E_BROWSER_CHANNEL=msedge ile kurulu Edge kullanılabilir.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, channel: process.env.E2E_BROWSER_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: "npx tsx --env-file=.env server/_core/index.ts",
    url: `http://localhost:${PORT}`,
    env: { NODE_ENV: "development", PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
