export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Fired by `startLogin()`; `App.tsx` listens for it and opens `LocalSignInDialog`. */
export const LOCAL_SIGNIN_REQUEST_EVENT = "pusula:local-signin-request";

/** Actually performs the sign-in (`server/_core/localAuth.ts`) with the
 * e-mail/phone + password typed into `LocalSignInDialog`, then reloads so
 * every query re-reads the now-valid session cookie from scratch. Returns an
 * error message on failure instead of throwing, so the dialog can show it
 * inline (Turkish, per the project's error-messaging convention).
 *
 * `mode` picks which tab the user is on: "register" fails if that e-mail/phone
 * is already taken (guides them to "Giriş Yap" instead) and needs `name` for
 * display; "login" fails if no such account exists yet (guides them to
 * "Kayıt Ol"). */
export async function performLocalSignIn(
  { identifier, password, name, mode }: { identifier: string; password: string; name?: string; mode: "login" | "register" },
): Promise<{ error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password, name, mode }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { error: (body && typeof body.error === "string" && body.error) || "Giriş yapılamadı. Lütfen tekrar dener misin?" };
    }
    window.location.reload();
    return {};
  } catch {
    return { error: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" };
  }
}

/** Giriş penceresini açar (`App.tsx` → `LocalSignInDialog`: e-posta/telefon + şifre). */
export const startLogin = () => {
  window.dispatchEvent(new Event(LOCAL_SIGNIN_REQUEST_EVENT));
};
