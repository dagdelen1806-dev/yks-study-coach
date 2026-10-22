import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Duvarım → bağlantı kaydı: öğrencinin yapıştırdığı adresin başlık/açıklama önizlemesi.
 * Sunucu dış adrese istek attığı için iç ağa erişim (SSRF) engellenir: yalnızca http(s), standart
 * port, kullanıcı adı/şifresiz adres; alan adı çözülür ve özel/yerel/ayrılmış bir IP'ye çıkıyorsa
 * istek atılmaz. Yönlendirmeler elle izlenir (en fazla 3) ve her adım yeniden denetlenir. Kısa zaman
 * aşımı ve gövde sınırı var; yalnızca HTML okunur. Önizleme alınamazsa kayıt düz bağlantı olarak kalır.
 */
export const linkPreviewConfig = { timeoutMs: 5000, maxBytes: 512 * 1024, maxRedirects: 3 };

export type LinkPreview = { url: string; title: string | null; description: string | null; site: string | null };
export class LinkPreviewError extends Error {}

/** Özel, yerel, ayrılmış ya da çok noktaya yayın adresi mi (IPv4 / IPv6, IPv4-eşlemeli dahil). */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isBlockedAddress(mapped[1]);
    return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff") || lower.startsWith("64:ff9b") || lower.startsWith("2001:db8");
  }
  return true;
}

/** Adres biçimi uygun mu; değilse öğrenciye gösterilecek mesajla hata. */
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new LinkPreviewError("Geçerli bir bağlantı değil.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new LinkPreviewError("Yalnızca http ve https bağlantıları eklenebilir.");
  if (url.username || url.password) throw new LinkPreviewError("Kullanıcı adı içeren bağlantı eklenemez.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new LinkPreviewError("Bu bağlantının önizlemesi alınamıyor.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (isIP(host) && isBlockedAddress(host))) throw new LinkPreviewError("Bu bağlantının önizlemesi alınamıyor.");
  return url;
}

async function assertPublicHost(url: URL, resolve: typeof lookup) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return;
  const addresses = await resolve(host, { all: true }).catch(() => []);
  if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address))) throw new LinkPreviewError("Bu bağlantının önizlemesi alınamıyor.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (value: string) => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
  .replace(/\s+/g, " ")
  .trim();

/** HTML'den başlık, açıklama ve site adı (Open Graph önce, sonra <title> / description). */
export function parseLinkMeta(html: string, url: URL): Omit<LinkPreview, "url"> {
  const head = html.slice(0, 200_000);
  const meta = (key: string) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      const name = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
      if (name !== key) continue;
      const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
      const value = decode(content?.[1] ?? content?.[2] ?? "");
      if (value) return value;
    }
    return null;
  };
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const clip = (value: string | null, max: number) => (value ? value.slice(0, max) : null);
  return {
    title: clip(meta("og:title") ?? meta("twitter:title") ?? (titleTag ? decode(titleTag) || null : null), 300),
    description: clip(meta("og:description") ?? meta("description") ?? meta("twitter:description"), 500),
    site: clip(meta("og:site_name") ?? url.hostname.replace(/^www\./, ""), 120),
  };
}

export async function fetchLinkPreview(raw: string, deps: { fetchImpl?: typeof fetch; resolve?: typeof lookup } = {}): Promise<LinkPreview> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolve = deps.resolve ?? lookup;
  let url = parsePublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), linkPreviewConfig.timeoutMs);
  try {
    for (let hop = 0; ; hop += 1) {
      await assertPublicHost(url, resolve);
      const response = await fetchImpl(url, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "PusulaBot/1.0 (+bağlantı önizlemesi)", Accept: "text/html,application/xhtml+xml" } });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (hop >= linkPreviewConfig.maxRedirects) throw new LinkPreviewError("Bağlantı çok fazla yönlendiriyor.");
        url = parsePublicUrl(new URL(response.headers.get("location")!, url).toString());
        continue;
      }
      if (!response.ok || !/text\/html|application\/xhtml/i.test(response.headers.get("content-type") ?? "")) {
        return { url: url.toString(), title: null, description: null, site: url.hostname.replace(/^www\./, "") };
      }
      const html = await readLimited(response, linkPreviewConfig.maxBytes);
      return { url: url.toString(), ...parseLinkMeta(html, url) };
    }
  } catch (error) {
    if (error instanceof LinkPreviewError) throw error;
    throw new LinkPreviewError("Bağlantının önizlemesi alınamadı; düz bağlantı olarak kaydedebilirsin.");
  } finally {
    clearTimeout(timer);
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks).subarray(0, maxBytes));
}
