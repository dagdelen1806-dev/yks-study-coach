import { ENV } from "../_core/env";

/**
 * Supabase Storage (REST) için küçük istemci: özel bucket'a yükle, kısa süreli imzalı bağlantı
 * üret, indir, sil. Servis anahtarı yalnızca sunucuda kullanılır; tarayıcı dosyaya ancak sunucunun
 * kimlik doğrulamasından sonra verdiği imzalı (süreli) bağlantıyla ulaşır. Bucket public değildir.
 */
export interface BlobStore {
  put(key: string, mimeType: string, data: Buffer): Promise<void>;
  signedUrl(key: string, expiresInSec: number): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(keys: string[]): Promise<void>;
}

export class BlobStoreError extends Error {}

export function createSupabaseBlobStore(config: { url: string; serviceRoleKey: string; bucket: string }, fetchImpl: typeof fetch = fetch): BlobStore {
  const base = `${config.url}/storage/v1`;
  const headers = { Authorization: `Bearer ${config.serviceRoleKey}`, apikey: config.serviceRoleKey };
  const objectPath = (key: string) => `${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  let bucketReady: Promise<void> | null = null;

  const fail = async (response: Response, action: string) => {
    const body = await response.text().catch(() => "");
    // Gövde servis anahtarı içermez; yine de kısaltılır.
    throw new BlobStoreError(`Supabase Storage ${action} ${response.status}: ${body.slice(0, 200)}`);
  };
  // Bucket ilk yüklemede yoksa özel olarak oluşturulur (varsa "already exists" yok sayılır).
  const ensureBucket = () => {
    bucketReady ??= (async () => {
      const response = await fetchImpl(`${base}/bucket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: config.bucket, name: config.bucket, public: false }) });
      if (!response.ok && response.status !== 409) {
        const body = await response.text().catch(() => "");
        if (!/already exists|Duplicate/i.test(body)) { bucketReady = null; throw new BlobStoreError(`Supabase Storage bucket ${response.status}: ${body.slice(0, 200)}`); }
      }
    })();
    return bucketReady;
  };

  return {
    async put(key, mimeType, data) {
      await ensureBucket();
      const response = await fetchImpl(`${base}/object/${objectPath(key)}`, { method: "POST", headers: { ...headers, "Content-Type": mimeType, "x-upsert": "false", "Cache-Control": "private, max-age=3600" }, body: new Uint8Array(data) });
      if (!response.ok) await fail(response, "upload");
    },
    async signedUrl(key, expiresInSec) {
      const response = await fetchImpl(`${base}/object/sign/${objectPath(key)}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: expiresInSec }) });
      if (!response.ok) await fail(response, "sign");
      const { signedURL } = (await response.json()) as { signedURL?: string };
      if (!signedURL) throw new BlobStoreError("Supabase Storage sign: yanıtta bağlantı yok");
      return signedURL.startsWith("http") ? signedURL : `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
    },
    async get(key) {
      const response = await fetchImpl(`${base}/object/${objectPath(key)}`, { headers });
      if (!response.ok) await fail(response, "download");
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(keys) {
      if (!keys.length) return;
      const response = await fetchImpl(`${base}/object/${encodeURIComponent(config.bucket)}`, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: keys }) });
      if (!response.ok) await fail(response, "delete");
    },
  };
}

let cached: BlobStore | null | undefined;
/** Ortamda Supabase ayarları varsa medya deposu; yoksa null (dosyalar veritabanında kalır). */
export function getMediaBlobStore(): BlobStore | null {
  if (cached !== undefined) return cached;
  cached = ENV.supabaseUrl && ENV.supabaseServiceRoleKey ? createSupabaseBlobStore({ url: ENV.supabaseUrl, serviceRoleKey: ENV.supabaseServiceRoleKey, bucket: ENV.supabaseMediaBucket }) : null;
  return cached;
}
/** Testler için. */
export function setMediaBlobStore(store: BlobStore | null | undefined) { cached = store; }
