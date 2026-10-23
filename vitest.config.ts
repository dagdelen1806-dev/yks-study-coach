import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // Sunucu canlıda Türkiye saatinde çalışır (server/_core/timezone.ts); testler her makinede aynı saatte koşsun.
    env: { TZ: "Europe/Istanbul" },
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});
