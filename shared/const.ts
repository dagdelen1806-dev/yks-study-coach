export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
// Standardize edilmiş subscription/entitlement hata kodları (spec §44).
export const APPROVAL_PENDING_ERR_MSG = 'Account approval pending (10003)';
export const APPROVAL_REJECTED_ERR_MSG = 'Account approval rejected (10004)';
export const PREMIUM_REQUIRED_ERR_MSG = 'Premium subscription required (10005)';
export const RATE_LIMITED_ERR_MSG = 'Too many requests (10006)';
export const EMAIL_UNVERIFIED_ERR_MSG = 'Email verification required (10007)';

// E-posta doğrulaması (bkz. server/_core/emailVerification.ts).
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60_000;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Yalnızca e-postayla açılmış yerel hesaplar doğrulama ister — telefon
 * ve eski isim hesapları bu kapıdan hiç geçmez.
 * Sunucu kapısı (trpc.ts requireUser) ve istemci ekranı (App.tsx) aynı
 * kuralı kullansın diye burada. */
export const needsEmailVerification = (user: { loginMethod: string | null; emailVerifiedAt: Date | string | null }) =>
  user.loginMethod === "dev_email" && !user.emailVerifiedAt;
