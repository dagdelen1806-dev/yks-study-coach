import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { subscriptionAuditLogs, topicProgress, users, yksTopics } from "../drizzle/schema";
import { CURRICULUM } from "../shared/curriculum";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

// Yönetim Paneli → Konular: ekleme, yeniden adlandırma (eski adla gelen veri aynı konuya), gizleme, canlı deneme şablonu.
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("sınav konuları yönetimi (router + veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { admin: 0, student: 0 };
  const created: number[] = [];
  const lgsDef = CURRICULUM.find((def) => def.exam === "LGS" && def.subject === "Matematik")!;
  let lgsTopicId = 0;
  const caller = (id: number, role: "admin" | "user" = "user") => appRouter.createCaller({ user: { id, role, approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
  const admin = () => caller(ids.admin, "admin");

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `topics-${key}-${stamp}`, name: `Konu ${key}`, loginMethod: "dev_email", role: key === "admin" ? "admin" : "user" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    await caller(ids.student).topics.catalog();
    const [row] = await db.select({ id: yksTopics.id }).from(yksTopics).where(eq(yksTopics.slug, lgsDef.slug));
    lgsTopicId = row.id;
  });

  afterAll(async () => {
    const db = (await getDb())!;
    await db.update(yksTopics).set({ hidden: 0 }).where(eq(yksTopics.id, lgsTopicId));
    await db.delete(topicProgress).where(eq(topicProgress.userId, ids.student));
    if (created.length) await db.delete(yksTopics).where(inArray(yksTopics.id, created));
    await db.delete(subscriptionAuditLogs).where(eq(subscriptionAuditLogs.userId, ids.admin));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  it("yalnızca platform yöneticisi; ders sınavda olmalı; aynı ad iki kez eklenmez", async () => {
    await expect(caller(ids.student).admin.topics.list({ exam: "LGS" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { id } = await admin().admin.topics.add({ exam: "LGS", subject: "Matematik", unit: lgsDef.unit, topic: `Test Konusu ${stamp}` });
    created.push(id);
    await expect(admin().admin.topics.add({ exam: "LGS", subject: "Matematik", unit: lgsDef.unit, topic: `test konusu ${stamp}` })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin().admin.topics.add({ exam: "LGS", subject: "Kimya", unit: "X", topic: "Y konusu" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const list = await admin().admin.topics.list({ exam: "LGS" });
    expect(list.topics.find((row) => row.id === id)).toMatchObject({ origin: "admin", hidden: false, unit: lgsDef.unit });
  });

  it("eklenen konu deneme şablonunda kendi ünitesinin sonuna girer", async () => {
    const rows = (await caller(ids.student).topics.curriculum()).filter((row) => row.exam === "LGS" && row.subject === "Matematik");
    const index = rows.findIndex((row) => row.topic === `Test Konusu ${stamp}`);
    expect(index).toBeGreaterThan(0);
    expect(rows[index - 1].unit).toBe(lgsDef.unit);
    if (rows[index + 1]) expect(rows[index + 1].unit).not.toBe(lgsDef.unit);
  });

  it("yeniden adlandırılan konuya eski adla gelen öğrenci verisi bağlanır; yeni konu açılmaz", async () => {
    const topicId = created[0];
    await admin().admin.topics.update({ id: topicId, topic: `Yeni Ad ${stamp}`, unit: lgsDef.unit });
    const result = await caller(ids.student).topics.logResult({ exam: "LGS", subject: "Matematik", topic: `Test Konusu ${stamp}`, accuracy: 40, questionCount: 10, studyDate: "2026-10-23T10:00:00" });
    expect(result).toMatchObject({ topic: `Yeni Ad ${stamp}` });
    const db = (await getDb())!;
    const progress = await db.select({ topicId: topicProgress.topicId }).from(topicProgress).where(eq(topicProgress.userId, ids.student));
    expect(progress).toEqual([{ topicId }]);
    const row = (await admin().admin.topics.list({ exam: "LGS" })).topics.find((item) => item.id === topicId);
    expect(row).toMatchObject({ previousNames: [`Test Konusu ${stamp}`], studentCount: 1 });
  });

  it("gizlenen müfredat konusu şablondan ve katalogdan çıkar, öğrencinin verisi varsa ilerlemede kalır", async () => {
    await admin().admin.topics.setHidden({ id: lgsTopicId, hidden: true });
    expect((await caller(ids.student).topics.curriculum()).some((row) => row.exam === "LGS" && row.topic === lgsDef.topic)).toBe(false);
    expect((await caller(ids.student).topics.catalog()).some((row) => row.id === lgsTopicId)).toBe(false);
    await admin().admin.topics.setHidden({ id: lgsTopicId, hidden: false });
    expect((await caller(ids.student).topics.curriculum()).some((row) => row.exam === "LGS" && row.topic === lgsDef.topic)).toBe(true);
  });

  it("ünite adı dersteki tüm konularında değişir", async () => {
    const { id } = await admin().admin.topics.add({ exam: "LGS", subject: "Matematik", unit: `Geçici Ünite ${stamp}`, topic: `Ünite Konusu ${stamp}` });
    created.push(id);
    expect(await admin().admin.topics.renameUnit({ exam: "LGS", subject: "Matematik", from: `Geçici Ünite ${stamp}`, to: `Kalıcı Ünite ${stamp}` })).toEqual({ count: 1 });
    const row = (await admin().admin.topics.list({ exam: "LGS" })).topics.find((item) => item.id === id);
    expect(row?.unit).toBe(`Kalıcı Ünite ${stamp}`);
  });
});
