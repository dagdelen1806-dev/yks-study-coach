import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { gardenProgress, intentionAffirmations, intentionGrains, intentionJars, readingBooks, studentProfiles, studyPlanSessions, studyPlans, topicStudyLogs, users } from "../drizzle/schema";
import { computeGarden, stageThresholds } from "../shared/effortGarden";
import { PRESET_AFFIRMATIONS, grainPosition, jarView, matchesAffirmation } from "../shared/intentionJar";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { addTopicStudyLog, getDb, logCompletedRoutineSession } from "./db";

describe("Niyet Kavanozum ve Emek Bahçem — saf mantık", () => {
  it("akşam tekrarı büyük harf, noktalama ve boşluktan bağımsız eşleşir; farklı cümle eşleşmez", () => {
    const text = "Her gün biraz daha gelişiyor ve hedefime yaklaşıyorum.";
    expect(matchesAffirmation("  HER GÜN biraz daha gelişiyor,  ve hedefime yaklaşıyorum ", text)).toBe(true);
    expect(matchesAffirmation("Her gün biraz daha gelişiyorum", text)).toBe(false);
    expect(matchesAffirmation("", "")).toBe(false);
  });

  it("kavanoz 365 tanede dolar, dolu kavanozlar sayılır; tane yerleri sabit ve kavanoz içinde", () => {
    expect(jarView(400)).toMatchObject({ total: 400, fullJars: 1, inCurrent: 35 });
    expect(grainPosition(10)).toEqual(grainPosition(10));
    for (const index of [0, 50, 364]) { const position = grainPosition(index); expect(position.x).toBeGreaterThan(0); expect(position.x).toBeLessThan(1); expect(position.y).toBeLessThanOrEqual(0.99); }
  });

  it("bahçe: günlük puan kişisel hedefe göre; LGS eşikleri daha kısa; aşama saklanandan aşağı inmez", () => {
    const empty = { readingPages: 0, readingSessions: 0, finishedBooks: 0, paragraphSessions: 0, paragraphQuestions: 0, dailyMinutes: [], activeDaysLast7: 0 };
    expect(computeGarden(empty, { examTrack: "YKS", dailyStudyDuration: 120 })).toMatchObject({ stage: 1, label: "Küçük filiz", leaves: 0, flowers: 0 });
    // 4 gün × hedefi tutturan gün = 40 puan → "İlk yapraklar" (YKS eşiği 40).
    const fourDays = { ...empty, dailyMinutes: [60, 60, 90, 60] };
    expect(computeGarden(fourDays, { examTrack: "YKS", dailyStudyDuration: 60 }).stage).toBe(2);
    expect(computeGarden(fourDays, { examTrack: "YKS", dailyStudyDuration: 240 }).stage).toBe(1);
    expect(stageThresholds({ examTrack: "LGS", dailyStudyDuration: null })[1]).toBe(30);
    expect(computeGarden(empty, { examTrack: "YKS", dailyStudyDuration: 120 }, 4)).toMatchObject({ stage: 4, label: "Büyüyen ağaç" });
    const reader = computeGarden({ ...empty, readingPages: 250, paragraphSessions: 6, paragraphQuestions: 40, finishedBooks: 1 }, { examTrack: "LGS", dailyStudyDuration: 60 });
    expect([reader.leaves, reader.flowers, reader.fruits, reader.theme]).toEqual([25, 10, 1, "playful"]);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("Niyet Kavanozum ve Emek Bahçem (router + veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { owner: 0, other: 0, racer: 0, gardener: 0 };
  const caller = (id: number) => appRouter.createCaller({ user: { id, role: "user", approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `personal-${key}-${stamp}`, name: `Kişisel ${key}`, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    await db.insert(studentProfiles).values({ userId: ids.gardener, onboardingCompleted: 1, examTrack: "YKS", dailyStudyDuration: 60 });
  });

  afterAll(async () => {
    const db = (await getDb())!;
    const all = Object.values(ids);
    for (const table of [intentionGrains, intentionAffirmations, intentionJars, gardenProgress, topicStudyLogs, studyPlanSessions, studyPlans, readingBooks, studentProfiles]) await db.delete(table).where(inArray(table.userId, all));
    await db.delete(users).where(inArray(users.id, all));
  });

  it("söz yokken ritüel olmaz; hazır söz seçilir, yanlış cümle tane vermez, doğrusu bir tane verir, ikinci deneme vermez", async () => {
    const me = caller(ids.owner);
    await expect(me.jar.ritual({ typed: "herhangi bir cümle" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const preset = PRESET_AFFIRMATIONS[0];
    const state = await me.jar.setAffirmation({ presetKey: preset.key });
    expect(state.active).toMatchObject({ text: preset.text, presetKey: preset.key });
    await expect(me.jar.ritual({ typed: "Bugün hiç çalışmadım" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const first = await me.jar.ritual({ typed: preset.text.toUpperCase() });
    expect(first).toMatchObject({ added: true, jar: { total: 1, doneToday: true } });
    const second = await me.jar.ritual({ typed: preset.text });
    expect(second).toMatchObject({ added: false, jar: { total: 1 } });
  });

  it("söz değişince eskisi arşivlenir, taneler kalır; kendi sözü kısa olamaz", async () => {
    const me = caller(ids.owner);
    await expect(me.jar.setAffirmation({ text: "kısa" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const state = await me.jar.setAffirmation({ text: "Bugün de sözümü tutuyor, planıma sadık kalıyorum." });
    expect(state.active?.text).toBe("Bugün de sözümü tutuyor, planıma sadık kalıyorum.");
    expect(state.previous.map((row) => row.text)).toEqual([PRESET_AFFIRMATIONS[0].text]);
    expect(state.total).toBe(1);
    expect(state.doneToday).toBe(true);
    const db = (await getDb())!;
    const actives = await db.select().from(intentionAffirmations).where(eq(intentionAffirmations.userId, ids.owner));
    expect(actives.filter((row) => row.isActive === 1)).toHaveLength(1);
  });

  it("eşzamanlı ritüel istekleri tek tane yazar; sayaç bir artar", async () => {
    const me = caller(ids.racer);
    await me.jar.setAffirmation({ presetKey: PRESET_AFFIRMATIONS[1].key });
    const results = await Promise.all(Array.from({ length: 6 }, () => me.jar.ritual({ typed: PRESET_AFFIRMATIONS[1].text })));
    expect(results.filter((result) => result.added)).toHaveLength(1);
    const db = (await getDb())!;
    expect(await db.select().from(intentionGrains).where(eq(intentionGrains.userId, ids.racer))).toHaveLength(1);
    expect((await db.select().from(intentionJars).where(eq(intentionJars.userId, ids.racer)))[0].totalGrains).toBe(1);
  });

  it("sözler ve kavanoz yalnızca sahibine görünür", async () => {
    const other = await caller(ids.other).jar.get();
    expect(other).toMatchObject({ active: null, previous: [], total: 0, doneToday: false });
  });

  it("bahçe mevcut kayıtlardan büyür (okuma → yaprak, paragraf → çiçek); kayıt silinse de aşama geri gitmez", async () => {
    const gardenerId = ids.gardener;
    const me = caller(gardenerId);
    expect(await me.garden.get()).toMatchObject({ stage: 1, leaves: 0, flowers: 0 });
    for (let day = 0; day < 3; day += 1) {
      await logCompletedRoutineSession(gardenerId, { title: "Gece okuması", subject: "Rutin", topic: "Kitap", kind: "Kitap Okuma", plannedMinutes: 20, actualMinutes: 30, actualPages: 40 });
      await logCompletedRoutineSession(gardenerId, { title: "Paragraf pratiği", subject: "Rutin", topic: "Paragraf pratiği", kind: "Paragraf", plannedMinutes: 20, actualMinutes: 30, note: "10 paragraf çözüldü." });
    }
    for (let day = 1; day <= 4; day += 1) await addTopicStudyLog(gardenerId, { subject: "Türkçe", topic: "Paragrafta Anlam", studyDate: new Date(Date.now() - day * 24 * 60 * 60 * 1000), minutes: 60, questions: 20, correct: 15, wrong: 5, blank: 0 });
    const garden = await me.garden.get();
    expect(garden.inputs).toMatchObject({ readingPages: 120, readingSessions: 3, paragraphSessions: 3, paragraphQuestions: 80 });
    expect(garden.leaves).toBe(12);
    expect(garden.flowers).toBe(3 + 8);
    // 5 çalışma günü × hedef (60 dk) tuttu = 50 + okuma 24 + paragraf 6 + 16 = 96 puan → aşama 2.
    expect(garden).toMatchObject({ stage: 2, label: "İlk yapraklar", newlyReached: 2, studyDays: 5 });
    const db = (await getDb())!;
    await db.delete(topicStudyLogs).where(eq(topicStudyLogs.userId, gardenerId));
    await db.delete(studyPlanSessions).where(eq(studyPlanSessions.userId, gardenerId));
    expect(await me.garden.get()).toMatchObject({ stage: 2, newlyReached: null, leaves: 0 });
    // Başka öğrenci bu bahçeyi görmez.
    expect(await caller(ids.other).garden.get()).toMatchObject({ stage: 1, studyDays: 0 });
  });
});
