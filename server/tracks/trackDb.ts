import { and, asc, eq } from "drizzle-orm";
import { studentExamTracks, studentProfiles } from "../../drizzle/schema";
import { EXAM_TRACK_DEFS, subjectNamesOf, defaultKindOf, type ExamTrack, type GradeLevel } from "../../shared/exams";
import { getDb } from "../db";

// Bir adayın birden çok sınavı (bkz. drizzle/schema.ts studentExamTracks). Profil aktif sınavın
// alanlarını taşır; burada yalnızca o alanlar sınavlar arasında takas edilir. Sınava ait konu
// ilerlemesi, denemeler ve takvim zaten sınav türüyle (exam) ayrıldığı için taşınmaz.

export class TrackError extends Error {}

/** Profilde aktif sınava özgü olan alanlar (her sınavın kendi değeri vardır). */
const TRACK_FIELDS = ["gradeLevel", "examYear", "targetScoreType", "currentTytNet", "currentAytNet", "currentNet", "targetUniversity", "targetDepartment", "targetRanking", "targetGoal", "targetScore", "selectedSubjectsJson"] as const;
type TrackFields = { [K in (typeof TRACK_FIELDS)[number]]: (typeof studentProfiles.$inferSelect)[K] };

const pick = (row: Record<string, unknown>): TrackFields => Object.fromEntries(TRACK_FIELDS.map((key) => [key, row[key] ?? null])) as TrackFields;
const emptyFields = (): TrackFields => Object.fromEntries(TRACK_FIELDS.map((key) => [key, null])) as TrackFields;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok.");
  return db;
}

/** Aktif sınavın profildeki değerlerini kendi kaydına yazar (yoksa oluşturur). Anket her kaydedildiğinde çağrılır. */
export async function syncActiveTrack(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (!profile) return;
  const fields = pick(profile);
  await db.insert(studentExamTracks).values({ userId, track: profile.examTrack, ...fields })
    .onConflictDoUpdate({ target: [studentExamTracks.userId, studentExamTracks.track], set: fields });
}

export type ExamTrackEnrollment = { track: ExamTrack; active: boolean; examYear: number | null; gradeLevel: GradeLevel | null; selectedSubjects: string[] };

/** Adayın sınavları (aktif olan önce); anketi bitirmiş eski hesapta aktif sınav kaydı yoksa oluşturulur. */
export async function listTracks(userId: number): Promise<ExamTrackEnrollment[]> {
  const db = await requireDb();
  const [profile] = await db.select({ examTrack: studentProfiles.examTrack, onboardingCompleted: studentProfiles.onboardingCompleted }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (!profile) return [];
  let rows = await db.select().from(studentExamTracks).where(eq(studentExamTracks.userId, userId)).orderBy(asc(studentExamTracks.createdAt));
  if (!rows.some((row) => row.track === profile.examTrack) && profile.onboardingCompleted) {
    await syncActiveTrack(userId);
    rows = await db.select().from(studentExamTracks).where(eq(studentExamTracks.userId, userId)).orderBy(asc(studentExamTracks.createdAt));
  }
  return rows
    .map((row) => ({ track: row.track, active: row.track === profile.examTrack, examYear: row.examYear, gradeLevel: row.gradeLevel, selectedSubjects: parseList(row.selectedSubjectsJson) }))
    .sort((a, b) => Number(b.active) - Number(a.active));
}

const parseList = (value: string | null): string[] => {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; }
};

export type AddTrackInput = { track: ExamTrack; gradeLevel: GradeLevel; examYear: number; selectedSubjects?: string[]; activate?: boolean };

/** Yeni bir sınav ekler (aynı sınav ikinci kez eklenmez). `activate` ise hemen ona geçer. */
export async function addTrack(userId: number, input: AddTrackInput): Promise<void> {
  const db = await requireDb();
  const def = EXAM_TRACK_DEFS[input.track];
  if (!def.gradeLevels.includes(input.gradeLevel)) throw new TrackError("Bu sınav için eğitim durumunu yeniden seç.");
  const validSubjects = subjectNamesOf(defaultKindOf(input.track));
  const selected = (input.selectedSubjects ?? []).filter((subject) => validSubjects.includes(subject));
  if (def.chooseSubjects && selected.length === 0) throw new TrackError("Gireceğin en az bir alan testini seç.");
  await syncActiveTrack(userId);
  const [existing] = await db.select({ id: studentExamTracks.id }).from(studentExamTracks).where(and(eq(studentExamTracks.userId, userId), eq(studentExamTracks.track, input.track))).limit(1);
  if (existing) throw new TrackError(`${def.label} zaten sınavların arasında.`);
  await db.insert(studentExamTracks).values({ userId, track: input.track, ...emptyFields(), gradeLevel: input.gradeLevel, examYear: input.examYear, selectedSubjectsJson: selected.length ? JSON.stringify(selected) : null });
  if (input.activate) await switchTrack(userId, input.track);
}

/** Aktif sınavı değiştirir: mevcut sınavın değerleri kendi kaydına, yeni sınavınkiler profile. */
export async function switchTrack(userId: number, track: ExamTrack): Promise<void> {
  const db = await requireDb();
  await syncActiveTrack(userId);
  const [target] = await db.select().from(studentExamTracks).where(and(eq(studentExamTracks.userId, userId), eq(studentExamTracks.track, track))).limit(1);
  if (!target) throw new TrackError("Bu sınav henüz eklenmemiş.");
  await db.update(studentProfiles).set({ examTrack: track, ...pick(target) }).where(eq(studentProfiles.userId, userId));
}

/** Aktif olmayan bir sınavı listeden çıkarır (o sınava ait denemeler ve konu verisi silinmez). */
export async function removeTrack(userId: number, track: ExamTrack): Promise<void> {
  const db = await requireDb();
  const [profile] = await db.select({ examTrack: studentProfiles.examTrack }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (profile?.examTrack === track) throw new TrackError("Aktif sınavı çıkaramazsın; önce başka bir sınava geç.");
  await db.delete(studentExamTracks).where(and(eq(studentExamTracks.userId, userId), eq(studentExamTracks.track, track)));
}
