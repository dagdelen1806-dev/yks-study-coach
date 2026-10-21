import { describe, expect, it, vi } from "vitest";
import type { StudentSummary } from "../shared/org";

// ENV, modül yüklenirken JWT_SECRET'i okur: içe aktarmalardan önce atanmalı.
vi.hoisted(() => { process.env.JWT_SECRET = "test-secret-for-digest-unsubscribe"; });
import { buildTeacherDigest } from "../shared/teacherDigest";
import { buildTeacherDigestEmail } from "./_core/emails/teacherDigestEmail";
import { readUnsubscribeToken, createUnsubscribeToken } from "./digest/unsubscribeToken";

const summary = (overrides: Partial<StudentSummary> = {}): StudentSummary => ({ lastTyt: null, lastAyt: null, lastLgs: null, weekMinutes: 0, adherence: null, plannedThisWeek: 0, weakTopicCount: 0, lastActivityAt: null, risks: [], ...overrides });

describe("buildTeacherDigest", () => {
  const students = [
    { name: "Ece", summary: summary({ weekMinutes: 300, adherence: 80 }) },
    { name: "Kerem", summary: summary({ weekMinutes: 40, adherence: 30, risks: ["low_adherence"] }) },
    { name: "Emir", summary: summary({ risks: ["inactive", "low_adherence"] }) },
    { name: "Zeynep", summary: summary({ weekMinutes: 120, adherence: 70 }) },
  ];

  it("counts active students, minutes and averages adherence over students with a plan", () => {
    const digest = buildTeacherDigest(students);
    expect(digest.total).toBe(4);
    expect(digest.activeCount).toBe(3);
    expect(digest.totalMinutes).toBe(460);
    expect(digest.averageAdherence).toBe(60);
  });

  it("lists follow-ups with the panel's risk labels, most risks first", () => {
    const digest = buildTeacherDigest(students);
    expect(digest.followUps.map((student) => student.name)).toEqual(["Emir", "Kerem"]);
    expect(digest.followUps[0].reasons).toEqual(["7 gündür etkinlik yok", "Plan uyumu düşük"]);
    expect(digest.headline).toContain("2 öğrenci takip bekliyor");
  });

  it("ranks the top three by minutes and handles a calm week", () => {
    expect(buildTeacherDigest(students).topStudents.map((student) => student.name)).toEqual(["Ece", "Zeynep", "Kerem"]);
    expect(buildTeacherDigest([students[0]]).headline).toContain("takip gerektiren öğrenci yok");
  });
});

describe("buildTeacherDigestEmail", () => {
  it("escapes names and links to the org panel and the unsubscribe page", () => {
    const digest = buildTeacherDigest([{ name: "<Ali & Veli>", summary: summary({ risks: ["net_drop"] }) }]);
    const mail = buildTeacherDigestEmail({ to: "hoca@ornek.com", name: "Murat", orgName: "Test & Dershane", digest, rangeLabel: "12 – 18 Ekim", panelUrl: "https://pusula.example/kurum", unsubscribeUrl: "https://pusula.example/api/email/weekly-digest/unsubscribe?token=x" });
    expect(mail.subject).toBe("Test & Dershane · haftalık sınıf özeti · 12 – 18 Ekim");
    expect(mail.html).toContain("&lt;Ali &amp; Veli&gt;");
    expect(mail.html).not.toContain("<Ali");
    expect(mail.html).toContain("https://pusula.example/kurum");
    expect(mail.text).toContain("<Ali & Veli>: Net düşüşü");
  });
});

describe("unsubscribe token", () => {
  it("round-trips the kind and id, defaults to student, and rejects tampering", async () => {
    expect(await readUnsubscribeToken(await createUnsubscribeToken("staff", 42))).toEqual({ kind: "staff", id: 42 });
    expect(await readUnsubscribeToken(await createUnsubscribeToken("student", 7))).toEqual({ kind: "student", id: 7 });
    const token = await createUnsubscribeToken("staff", 42);
    expect(await readUnsubscribeToken(token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa"))).toBeNull();
    expect(await readUnsubscribeToken("bozuk")).toBeNull();
  });
});
