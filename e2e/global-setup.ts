import { execFileSync } from "node:child_process";

/**
 * Testlerden önce örnek kurumu ve öğrencilerini (verileriyle) baştan kurar. Yalnızca
 * @test.local hesaplarına dokunur (bkz. scripts/seed-test-org.ts); şifre: test1234.
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED) return;
  execFileSync("npx", ["tsx", "--env-file=.env", "scripts/seed-test-org.ts"], { stdio: "inherit", shell: true });
  // Yönetim Paneli testi için yerel platform yöneticisi (platform.admin@test.local); tanıtım tohumunda yok.
  execFileSync("npx", ["tsx", "--env-file=.env", "e2e/platform-admin.ts"], { stdio: "inherit", shell: true });
}
