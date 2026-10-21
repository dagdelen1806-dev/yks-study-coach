import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { studentExamTracks, studentProfiles, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

// Birden çok sınav: gerçek veritabanıyla (CI'da ve yerelde DATABASE_URL varsa).
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("birden çok sınav (ekle, geç, çıkar)", () => {
  const stamp = Date.now() % 1_000_000;
  let userId = 0;
  const caller = () => appRouter.createCaller({ user: { id: userId, role: "user", approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
  const year = new Date().getFullYear() + 2;

  beforeAll(async () => {
    const db = (await getDb())!;
    const [row] = await db.insert(users).values({ openId: `tracks-test-${stamp}`, name: "Track Test", loginMethod: "dev_email" }).returning({ id: users.id });
    userId = row.id;
    // KPSS adayı olarak anketi bitirmiş.
    await caller().onboarding.saveStep({ step: 0, data: { examTrack: "KPSS", preferredName: "Aday", gradeLevel: "lisans_mezun", examYear: String(year) } });
    await caller().onboarding.saveStep({ step: 2, data: { targetGoal: "Memurluk (B grubu)", targetScore: "85" }, complete: true });
  });
  afterAll(async () => {
    const db = (await getDb())!;
    await db.delete(studentExamTracks).where(inArray(studentExamTracks.userId, [userId]));
    await db.delete(studentProfiles).where(inArray(studentProfiles.userId, [userId]));
    await db.delete(users).where(inArray(users.id, [userId]));
  });

  it("anketi bitiren adayın aktif sınavı listelenir", async () => {
    expect(await caller().onboarding.tracks()).toMatchObject([{ track: "KPSS", active: true, examYear: year }]);
  });

  it("A grubu eklenir (alan seçimi zorunlu), ona geçilir; KPSS'nin hedefi kendi kaydında kalır", async () => {
    await expect(caller().onboarding.addTrack({ track: "KPSS_A", gradeLevel: "lisans_mezun", examYear: year })).rejects.toThrow(/alan testini/);
    await expect(caller().onboarding.addTrack({ track: "KPSS_A", gradeLevel: "8", examYear: year })).rejects.toThrow(/eğitim durumunu/);
    await caller().onboarding.addTrack({ track: "KPSS_A", gradeLevel: "lisans_mezun", examYear: year, selectedSubjects: ["Hukuk", "Uydurma"], activate: true });
    const profile = await caller().onboarding.get();
    expect(profile.examTrack).toBe("KPSS_A");
    expect(profile.selectedSubjects).toEqual(["Hukuk"]);
    expect(profile.targetGoal).toBeNull();

    await caller().onboarding.switchTrack({ track: "KPSS" });
    const back = await caller().onboarding.get();
    expect(back).toMatchObject({ examTrack: "KPSS", targetGoal: "Memurluk (B grubu)", targetScore: "85", selectedSubjects: [] });
  });

  it("aynı sınav iki kez eklenmez; aktif sınav çıkarılamaz, diğeri çıkarılır", async () => {
    await expect(caller().onboarding.addTrack({ track: "KPSS_A", gradeLevel: "lisans", examYear: year, selectedSubjects: ["İktisat"] })).rejects.toThrow(/zaten/);
    await expect(caller().onboarding.removeTrack({ track: "KPSS" })).rejects.toThrow(/Aktif/);
    const left = await caller().onboarding.removeTrack({ track: "KPSS_A" });
    expect(left.map((row) => row.track)).toEqual(["KPSS"]);
  });
});
