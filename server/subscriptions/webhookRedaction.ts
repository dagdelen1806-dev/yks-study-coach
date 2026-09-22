// Webhook payload'ları denetim amacıyla `payment_events.payload`'a ham JSON
// olarak yazılır — ama kart numarası/CVV/tam token gibi hassas alanlar
// asla saklanmamalı (spec §33: "Webhook payload sensitive ise redaction
// uygula"). Bilinen hassas anahtar adlarını maskeler; provider'a özgü ek
// alanlar eklendikçe bu liste genişletilebilir.
const SENSITIVE_KEYS = new Set(["card_number", "cardNumber", "cvv", "cvc", "password", "secret", "token", "access_token", "refresh_token", "authorization"]);

export function redactSensitivePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitivePayload);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => {
      if (SENSITIVE_KEYS.has(key)) return [key, "[REDACTED]"];
      return [key, redactSensitivePayload(val)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

export function redactAndStringify(payload: unknown): string {
  return JSON.stringify(redactSensitivePayload(payload));
}
