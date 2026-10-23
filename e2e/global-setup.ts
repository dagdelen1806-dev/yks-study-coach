import { execFileSync } from "node:child_process";

/**
 * Testlerden önce örnek kurumu ve öğrencilerini (verileriyle) baştan kurar. Yalnızca
 * @test.local hesaplarına dokunur (bkz. scripts/seed-test-org.ts); şifre: test1234.
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED) return;
  // SEED_PLATFORM_ADMIN: Yönetim Paneli testi için yerel platform yöneticisi (platform.admin@test.local).
  execFileSync("npx", ["tsx", "--env-file=.env", "scripts/seed-test-org.ts"], { stdio: "inherit", shell: true, env: { ...process.env, SEED_PLATFORM_ADMIN: "1" } });
}
