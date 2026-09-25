import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Fired by `startLogin()` when no real Manus OAuth is configured; `App.tsx`
 * listens for it and opens `LocalSignInDialog`. */
export const LOCAL_SIGNIN_REQUEST_EVENT = "pusula:local-signin-request";

/** Actually performs the local sign-in (`server/_core/devAuth.ts`) with the
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
    const response = await fetch("/api/dev-login", {
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

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // This project runs standalone here (Laragon + local MySQL), not inside
  // the Manus platform, so there is no real app id / OAuth portal to send
  // the student to — that pair is only ever injected by the hosted Manus
  // environment. Without it `startLogin` would navigate to a broken URL.
  // The local sign-in route (`server/_core/devAuth.ts`) is this
  // deployment's actual login for now; it's hard-disabled outside
  // development, so this fallback never engages in a real deployment.
  if (!oauthPortalUrl || !appId) {
    // Asks `App.tsx`'s `LocalSignInDialog` to open and collect the
    // student's actual name, instead of silently signing everyone in as
    // the same placeholder "Test Öğrenci" — see `performLocalSignIn` below
    // for the request that dialog actually sends.
    window.dispatchEvent(new Event(LOCAL_SIGNIN_REQUEST_EVENT));
    return;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
