import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { classStudents, classTimetableSlots, organizationClasses, organizationMembers, organizations, users } from "../drizzle/schema";
import { branchMismatch, findCrossClassConflicts, validateClassTimetable, weeklyHours, type TimetableSlot } from "../shared/orgTimetable";
import { getDb } from "./db";

const slot = (dayOfWeek: number, startTime: string, endTime: string, subject: string, teacherUserId: number | null = null, room: string | null = null): TimetableSlot => ({ dayOfWeek, startTime, endTime, subject, teacherUserId, room });

describe("ders programı kuralları", () => {
  it("sınıfın iki dersi aynı saate düşemez; bitiş başlangıçtan sonra olmalı", () => {
    expect(validateClassTimetable([slot(2, "16:30", "17:10", "Matematik"), slot(2, "17:20", "18:00", "Fizik")])).toBeNull();
    expect(validateClassTimetable([slot(2, "16:30", "17:10", "Matematik"), slot(2, "17:00", "17:40", "Fizik")])).toMatch(/çakışıyor/);
    expect(validateClassTimetable([slot(2, "17:10", "16:30", "Matematik")])).toMatch(/bitiş/);
    // Bitişik dersler (17:10 bitiş, 17:10 başlangıç) çakışma değildir.
    expect(validateClassTimetable([slot(2, "16:30", "17:10", "Matematik"), slot(2, "17:10", "17:50", "Fizik")])).toBeNull();
  });

  it("öğretmen ve derslik başka sınıfta aynı saatte kullanılamaz; farklı gün ya da kendi sınıfı sorun değil", () => {
    const others = [{ ...slot(2, "16:30", "17:10", "Matematik", 7, "A-101"), classId: 2 }, { ...slot(2, "16:30", "17:10", "Türkçe", 8, "B-203"), classId: 3 }];
    expect(findCrossClassConflicts(1, [slot(2, "16:50", "17:30", "Geometri", 7)], others).map((item) => item.kind)).toEqual(["teacher"]);
    expect(findCrossClassConflicts(1, [slot(2, "16:30", "17:10", "Fizik", 9, "b-203")], others).map((item) => item.kind)).toEqual(["room"]);
    expect(findCrossClassConflicts(1, [slot(3, "16:30", "17:10", "Matematik", 7, "A-101")], others)).toEqual([]);
    expect(findCrossClassConflicts(2, [slot(2, "16:30", "17:10", "Matematik", 7, "A-101")], others)).toEqual([]);
  });

  it("branş uyuşmazlığı yakın branşlarda ve rehberlikte uyarı vermez", () => {
    expect(branchMismatch("Geometri", "Matematik")).toBe(false);
    expect(branchMismatch("Fizik", "Fen Bilimleri")).toBe(false);
    expect(branchMismatch("Türkçe", "Rehberlik")).toBe(false);
    expect(branchMismatch("Kimya", null)).toBe(false);
    expect(branchMismatch("Tarih", "Matematik")).toBe(true);
  });

  it("haftalık ders sayısı ve süresi derse göre", () => {
    expect(weeklyHours([slot(2, "16:30", "17:10", "Matematik"), slot(4, "16:30", "17:10", "Matematik"), slot(4, "17:20", "18:00", "Fizik")])).toEqual([{ subject: "Matematik", count: 2, minutes: 80 }, { subject: "Fizik", count: 1, minutes: 40 }]);
  });
});

// Gerçek veritabanıyla: sorumlu öğretmen sınıfını görür; öğrenci sınıfının programını alır.
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("sorumlu öğretmen ve öğrencinin dershane programı (veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  let orgId = 0;
  let classId = 0;
  const ids: Record<"teacher" | "other" | "student" | "outsider", number> = { teacher: 0, other: 0, student: 0, outsider: 0 };

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `timetable-${key}-${stamp}`, name: `Program ${key}`, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    const [org] = await db.insert(organizations).values({ name: "Program Testi", slug: `program-testi-${stamp}` }).returning({ id: organizations.id });
    orgId = org.id;
    await db.insert(organizationMembers).values([
      { orgId, userId: ids.teacher, role: "teacher", subject: "Fizik" },
      { orgId, userId: ids.other, role: "teacher", subject: "Matematik" },
      { orgId, userId: ids.student, role: "student", consentAt: new Date() },
      { orgId, userId: ids.outsider, role: "student", consentAt: new Date() },
    ]);
    const [klass] = await db.insert(organizationClasses).values({ orgId, name: "12-A", advisorUserId: ids.teacher }).returning({ id: organizationClasses.id });
    classId = klass.id;
    await db.insert(classStudents).values({ classId, studentUserId: ids.student });
  });
  afterAll(async () => {
    const db = (await getDb())!;
    await db.delete(classTimetableSlots).where(eq(classTimetableSlots.orgId, orgId));
    await db.delete(classStudents).where(eq(classStudents.classId, classId));
    await db.delete(organizationClasses).where(eq(organizationClasses.orgId, orgId));
    await db.delete(organizationMembers).where(eq(organizationMembers.orgId, orgId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  it("sorumlu öğretmen atama olmadan sınıfının öğrencisini görür, sınıf dışını görmez", async () => {
    const { hasActiveAssignment, listMembers } = await import("./org/orgDb");
    expect(await hasActiveAssignment(orgId, ids.teacher, ids.student)).toBe(true);
    expect(await hasActiveAssignment(orgId, ids.teacher, ids.outsider)).toBe(false);
    expect(await hasActiveAssignment(orgId, ids.other, ids.student)).toBe(false);
    expect((await listMembers(orgId, { role: "student", teacherUserId: ids.teacher })).map((member) => member.userId)).toEqual([ids.student]);
  });

  it("sınıf programı öğrencinin dershane bloklarına ve AI plan bağlamına girer; ayrılan öğretmen dersten düşer", async () => {
    const { replaceClassTimetable, endMembership, listOrgTimetable } = await import("./org/orgDb");
    const { getCourseBlocks, getPlanScheduleContext } = await import("./schedule/classScheduleDb");
    await replaceClassTimetable(orgId, classId, [slot(2, "16:30", "17:10", "Fizik", ids.teacher, "A-101"), slot(2, "17:20", "18:00", "Matematik", ids.other, "A-101")]);
    const blocks = await getCourseBlocks(ids.student);
    expect(blocks.map((block) => [block.source, block.dayOfWeek, block.label, block.room])).toEqual([["course", 2, "12-A · Fizik", "A-101"], ["course", 2, "12-A · Matematik", "A-101"]]);
    expect(await getCourseBlocks(ids.outsider)).toEqual([]);
    const tuesday = new Date("2026-10-27T12:00:00");
    expect(await getPlanScheduleContext(ids.student, tuesday)).toMatch(/Salı.*dershanede işlenen dersler: Fizik, Matematik/);

    await endMembership(orgId, ids.other, "removed");
    expect((await listOrgTimetable(orgId)).map((row) => row.teacherUserId)).toEqual([ids.teacher, null]);
  });
});
