import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { MailNotConfiguredError, parseMailFrom, sendMail } from "./_core/mailer";

const mail = { to: "ogrenci@ornek.com", subject: "Konu", html: "<p>html</p>", text: "text" };
const fetchMock = vi.fn();
const original = { ...ENV };

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ messageId: "m1" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  Object.assign(ENV, { brevoApiKey: "", resendApiKey: "", mailFrom: "", isProduction: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(ENV, original);
});

describe("parseMailFrom", () => {
  it("splits 'Name <address>' and accepts a bare address", () => {
    expect(parseMailFrom("Pusula YKS <ben@gmail.com>")).toEqual({ name: "Pusula YKS", email: "ben@gmail.com" });
    expect(parseMailFrom('"Pusula YKS" <ben@gmail.com>')).toEqual({ name: "Pusula YKS", email: "ben@gmail.com" });
    expect(parseMailFrom("ben@gmail.com")).toEqual({ email: "ben@gmail.com" });
    expect(parseMailFrom("Pusula YKS")).toBeNull();
  });
});

describe("sendMail provider selection", () => {
  it("sends through Brevo's API with the verified sender when BREVO_API_KEY is set", async () => {
    Object.assign(ENV, { brevoApiKey: "brevo-key", mailFrom: "Pusula YKS <ben@gmail.com>" });
    await sendMail(mail);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("brevo-key");
    expect(JSON.parse(init.body)).toEqual({ sender: { name: "Pusula YKS", email: "ben@gmail.com" }, to: [{ email: "ogrenci@ornek.com" }], subject: "Konu", htmlContent: "<p>html</p>", textContent: "text" });
  });

  it("prefers Brevo when both keys are set", async () => {
    Object.assign(ENV, { brevoApiKey: "b", resendApiKey: "r", mailFrom: "ben@gmail.com" });
    await sendMail(mail);
    expect(fetchMock.mock.calls[0][0]).toContain("brevo.com");
  });

  it("falls back to Resend when only RESEND_API_KEY is set", async () => {
    Object.assign(ENV, { resendApiKey: "r" });
    await sendMail(mail);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body).from).toBe("Pusula YKS <onboarding@resend.dev>");
  });

  it("refuses Brevo without a usable MAIL_FROM instead of sending", async () => {
    Object.assign(ENV, { brevoApiKey: "b", mailFrom: "" });
    await expect(sendMail(mail)).rejects.toBeInstanceOf(MailNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the provider's error text so it shows up in the logs", async () => {
    Object.assign(ENV, { brevoApiKey: "b", mailFrom: "ben@gmail.com" });
    fetchMock.mockResolvedValue(new Response('{"code":"unauthorized","message":"Sender not verified"}', { status: 400 }));
    await expect(sendMail(mail)).rejects.toThrow(/Brevo send failed \(400\).*Sender not verified/);
  });

  it("throws in production when no provider is configured", async () => {
    await expect(sendMail(mail)).rejects.toBeInstanceOf(MailNotConfiguredError);
  });
});
