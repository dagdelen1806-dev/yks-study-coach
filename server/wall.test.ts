import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { noteAttachments, users, wallPosts } from "../drizzle/schema";
import { EMPTY_NOTE_DOC, type NoteDoc } from "../shared/noteContent";
import { createSupabaseBlobStore, setMediaBlobStore, type BlobStore } from "./storage/supabaseStorage";
import { fetchLinkPreview, isBlockedAddress, parseLinkMeta, parsePublicUrl } from "./wall/linkPreview";
import { getDb } from "./db";

describe("bağlantı önizlemesi (SSRF koruması)", () => {
  it("özel, yerel ve ayrılmış adresleri engeller", () => {
    for (const address of ["127.0.0.1", "10.2.3.4", "172.20.0.1", "192.168.1.5", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) expect(isBlockedAddress(address), address).toBe(true);
    for (const address of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) expect(isBlockedAddress(address), address).toBe(false);
  });

  it("yalnızca http(s), standart port ve kullanıcı adısız adres kabul edilir", () => {
    expect(parsePublicUrl("https://example.com/a?b=1").hostname).toBe("example.com");
    for (const raw of ["file:///etc/passwd", "ftp://example.com", "http://user:pw@example.com", "http://example.com:8080", "http://localhost/x", "http://127.0.0.1/", "http://[::1]/", "javascript:alert(1)", "nas.local"]) expect(() => parsePublicUrl(raw), raw).toThrow();
  });

  it("Open Graph başlığını ve açıklamasını okur, HTML karakterlerini çözer", () => {
    const html = `<html><head><title>Yedek başlık</title><meta property="og:title" content="Türev &amp; İntegral"><meta name="description" content='Kısa &quot;özet&quot;'><meta property="og:site_name" content="Örnek Site"></head></html>`;
    expect(parseLinkMeta(html, new URL("https://www.ornek.com/x"))).toEqual({ title: "Türev & İntegral", description: 'Kısa "özet"', site: "Örnek Site" });
    expect(parseLinkMeta("<title> Sadece   başlık </title>", new URL("https://www.ornek.com"))).toEqual({ title: "Sadece başlık", description: null, site: "ornek.com" });
  });

  it("alan adı iç ağa çözülürse ya da yönlendirme iç ağa giderse istek atılmaz", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: URL) => {
      calls.push(String(url));
      if (String(url).startsWith("https://kisa.link")) return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
      return new Response("<title>Merhaba</title>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }) as unknown as typeof fetch;
    const resolve = (async (host: string) => [{ address: host === "ic.ornek.com" ? "10.0.0.5" : "93.184.216.34", family: 4 }]) as never;
    await expect(fetchLinkPreview("https://ic.ornek.com/", { fetchImpl, resolve })).rejects.toThrow(/önizlemesi alınamıyor/);
    await expect(fetchLinkPreview("https://kisa.link/abc", { fetchImpl, resolve })).rejects.toThrow(/önizlemesi alınamıyor/);
    expect(calls).toEqual(["https://kisa.link/abc"]);
    expect(await fetchLinkPreview("https://www.ornek.com/yazi", { fetchImpl, resolve })).toEqual({ url: "https://www.ornek.com/yazi", title: "Merhaba", description: null, site: "ornek.com" });
  });
});

describe("Supabase Storage istemcisi", () => {
  it("özel bucket'ı bir kez oluşturur, servis anahtarıyla yükler, imzalı bağlantı ve silme yapar", async () => {
    const requests: Array<{ url: string; method: string; auth: string | null; body: string | null }> = [];
    const fetchImpl = (async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      requests.push({ url, method: init.method ?? "GET", auth: headers.get("authorization"), body: typeof init.body === "string" ? init.body : null });
      if (url.endsWith("/bucket")) return new Response(JSON.stringify({ message: "The resource already exists" }), { status: 400 });
      if (url.includes("/object/sign/")) return new Response(JSON.stringify({ signedURL: "/object/sign/pusula-media/u1/image/a.jpg?token=abc" }), { status: 200 });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const store = createSupabaseBlobStore({ url: "https://proje.supabase.co", serviceRoleKey: "service-key", bucket: "pusula-media" }, fetchImpl);
    await store.put("u1/image/a.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff]));
    await store.put("u1/image/b.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff]));
    expect(await store.signedUrl("u1/image/a.jpg", 600)).toBe("https://proje.supabase.co/storage/v1/object/sign/pusula-media/u1/image/a.jpg?token=abc");
    await store.remove(["u1/image/a.jpg"]);
    expect(requests.map((request) => `${request.method} ${request.url.replace("https://proje.supabase.co/storage/v1", "")}`)).toEqual([
      "POST /bucket", "POST /object/pusula-media/u1/image/a.jpg", "POST /object/pusula-media/u1/image/b.jpg", "POST /object/sign/pusula-media/u1/image/a.jpg", "DELETE /object/pusula-media",
    ]);
    expect(JSON.parse(requests[0].body!)).toMatchObject({ public: false });
    expect(requests.every((request) => request.auth === "Bearer service-key")).toBe(true);
    expect(JSON.parse(requests.at(-1)!.body!)).toEqual({ prefixes: ["u1/image/a.jpg"] });
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("Duvarım (veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { owner: 0, other: 0 };
  const blobs = new Map<string, Buffer>();
  const fakeStore: BlobStore = {
    async put(key, _mime, data) { blobs.set(key, data); },
    async signedUrl(key) { return `https://depo.test/${key}?token=1`; },
    async get(key) { return blobs.get(key)!; },
    async remove(keys) { keys.forEach((key) => blobs.delete(key)); },
  };
  const doc = (text: string, attachmentId?: number): NoteDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }, ...(attachmentId ? [{ type: "noteImage", attrs: { attachmentId } }] : [])] });

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `wall-${key}-${stamp}`, name: `Duvar ${key}`, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
  });
  afterEach(() => setMediaBlobStore(undefined));
  afterAll(async () => {
    const db = (await getDb())!;
    await db.delete(noteAttachments).where(inArray(noteAttachments.userId, Object.values(ids)));
    await db.delete(wallPosts).where(inArray(wallPosts.userId, Object.values(ids)));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  it("kayıtlar zaman sırasıyla, süzgeçlerle listelenir; başka öğrenci göremez ve değiştiremez", async () => {
    const { createWallPost, getWallPost, listWallPosts, setWallPostFlags, updateWallPost, deleteWallPost, wallSummary } = await import("./wall/wallDb");
    const first = await createWallPost(ids.owner, { kind: "note", title: "", content: doc("Bugün türevde zincir kuralını anladım"), tags: ["Türev", "motivasyon"], readLater: false });
    expect(first.title).toBe("Bugün türevde zincir kuralını anladım");
    const link = await createWallPost(ids.owner, { kind: "link", title: "", content: EMPTY_NOTE_DOC, sourceUrl: "https://ornek.com/yazi", sourceTitle: "Verimli çalışma", tags: ["motivasyon"], readLater: true });
    expect(link.title).toBe("Verimli çalışma");
    await expect(createWallPost(ids.owner, { kind: "note", title: "", content: EMPTY_NOTE_DOC, tags: [], readLater: false })).rejects.toThrow(/Boş kayıt/);

    expect((await listWallPosts(ids.owner)).posts.map((post) => post.id)).toEqual([link.id, first.id]);
    expect((await listWallPosts(ids.owner, { filter: "unread" })).posts.map((post) => post.id)).toEqual([link.id]);
    expect((await listWallPosts(ids.owner, { tag: "türev" })).posts.map((post) => post.id)).toEqual([first.id]);
    expect((await listWallPosts(ids.owner, { q: "zincir" })).posts.map((post) => post.id)).toEqual([first.id]);
    expect(await wallSummary(ids.owner)).toMatchObject({ total: 2, unread: 1, pinned: 0, tags: [{ tag: "motivasyon", count: 2 }, { tag: "türev", count: 1 }] });

    await setWallPostFlags(ids.owner, link.id, { read: true });
    expect((await wallSummary(ids.owner)).unread).toBe(0);

    // Başka öğrenci: görmez, değiştiremez, silemez.
    expect((await listWallPosts(ids.other)).posts).toEqual([]);
    expect(await getWallPost(ids.other, first.id)).toBeNull();
    expect(await setWallPostFlags(ids.other, first.id, { pinned: true })).toBe(false);
    await expect(updateWallPost(ids.other, first.id, { kind: "note", title: "x", content: doc("x"), tags: [], readLater: false })).rejects.toThrow(/bulunamadı/);
    expect(await deleteWallPost(ids.other, first.id)).toBe(false);
    expect(await getWallPost(ids.owner, first.id)).not.toBeNull();

    // Sayfalama: imleç bir sonraki (daha eski) kaydı verir.
    const page = await listWallPosts(ids.owner, { limit: 1 });
    expect(page.nextCursor).not.toBeNull();
    expect((await listWallPosts(ids.owner, { limit: 1, cursor: page.nextCursor })).posts.map((post) => post.id)).toEqual([first.id]);
  });

  it("fotoğraf Supabase deposuna gider; sunum imzalı bağlantıyla, kayıt silinince dosya da silinir; yetim temizliği duvar ekine dokunmaz", async () => {
    setMediaBlobStore(fakeStore);
    const { getAttachmentStorage } = await import("./notes/attachmentStorage");
    const { createWallPost, deleteWallPost } = await import("./wall/wallDb");
    const storage = getAttachmentStorage();
    const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const { id } = await storage.put(ids.owner, { kind: "image", mimeType: "image/jpeg", data: image });
    const db = (await getDb())!;
    const [row] = await db.select().from(noteAttachments).where(eq(noteAttachments.id, id));
    expect(row.data).toBeNull();
    expect(row.storageKey).toMatch(new RegExp(`^u${ids.owner}/image/[0-9a-f-]+\\.jpg$`));
    expect(blobs.get(row.storageKey!)).toEqual(image);
    expect(await storage.locate(ids.owner, id)).toEqual({ mimeType: "image/jpeg", url: `https://depo.test/${row.storageKey}?token=1` });
    expect(await storage.locate(ids.other, id)).toBeNull();
    expect((await storage.get(ids.owner, id))?.data).toEqual(image);

    const post = await createWallPost(ids.owner, { kind: "note", title: "Fotoğraflı", content: doc("Tahta", id), tags: [], readLater: false });
    // Süresi dolmuş gibi: yetim temizliği duvara bağlı eki silmez.
    await db.update(noteAttachments).set({ createdAt: new Date(Date.now() - 400 * 24 * 3600_000) }).where(eq(noteAttachments.id, id));
    await storage.cleanupOrphans(ids.owner);
    expect(blobs.has(row.storageKey!)).toBe(true);

    expect(await deleteWallPost(ids.owner, post.id)).toBe(true);
    expect(blobs.has(row.storageKey!)).toBe(false);
    expect(await db.select().from(noteAttachments).where(eq(noteAttachments.id, id))).toEqual([]);
  });
});
