/**
 * Kurum personelinin pazar akşamı aldığı sınıf özeti. Öğrenci başına özet ve risk kuralları
 * Kurum Paneli ile aynıdır (shared/org.ts summarizeStudent) — mail ile panel hiç ayrışmaz.
 */
import { RISK_LABELS, type StudentSummary } from "./org";

export type TeacherDigestStudent = { name: string; summary: StudentSummary };

/**
 * Akademik takip (Novara Rehber; yalnızca kurumda açıksa): dosyası henüz açılmamış inceleme
 * önerileri ve öğretmenin açık dosyaları. Not içeriği asla e-postaya girmez.
 */
export type AcademicDigest = {
  suggestions: Array<{ name: string; description: string }>;
  openCases: number;
  /** 7 günden uzun süredir işlem görmeyen açık dosya. */
  staleCases: number;
};

export type TeacherDigest = {
  total: number;
  activeCount: number;
  totalMinutes: number;
  averageAdherence: number | null;
  followUps: Array<{ name: string; reasons: string[] }>;
  topStudents: Array<{ name: string; minutes: number }>;
  headline: string;
  academic: AcademicDigest | null;
};

const MAX_FOLLOW_UPS = 10;
const MAX_SUGGESTIONS = 10;

export function buildTeacherDigest(students: TeacherDigestStudent[], academic: AcademicDigest | null = null): TeacherDigest {
  const total = students.length;
  const activeCount = students.filter((student) => student.summary.weekMinutes > 0).length;
  const totalMinutes = students.reduce((sum, student) => sum + student.summary.weekMinutes, 0);
  const adherences = students.map((student) => student.summary.adherence).filter((value): value is number => value !== null);
  const averageAdherence = adherences.length ? Math.round(adherences.reduce((sum, value) => sum + value, 0) / adherences.length) : null;
  // Önce en çok riski olan, eşitse en az çalışan öğrenci.
  const followUps = students
    .filter((student) => student.summary.risks.length > 0)
    .sort((a, b) => b.summary.risks.length - a.summary.risks.length || a.summary.weekMinutes - b.summary.weekMinutes)
    .slice(0, MAX_FOLLOW_UPS)
    .map((student) => ({ name: student.name, reasons: student.summary.risks.map((risk) => RISK_LABELS[risk]) }));
  const topStudents = students
    .filter((student) => student.summary.weekMinutes > 0)
    .sort((a, b) => b.summary.weekMinutes - a.summary.weekMinutes)
    .slice(0, 3)
    .map((student) => ({ name: student.name, minutes: student.summary.weekMinutes }));
  const followUpCount = students.filter((student) => student.summary.risks.length > 0).length;

  const headline = total === 0
    ? "Henüz takip ettiğin öğrenci yok."
    : followUpCount === 0
      ? `Bu hafta ${total} öğrencinin ${activeCount}'i çalıştı; takip gerektiren öğrenci yok.`
      : `Bu hafta ${total} öğrencinin ${activeCount}'i çalıştı; ${followUpCount} öğrenci takip bekliyor.`;

  const academicPart = academic && (academic.suggestions.length || academic.openCases)
    ? { ...academic, suggestions: academic.suggestions.slice(0, MAX_SUGGESTIONS) }
    : null;
  return { total, activeCount, totalMinutes, averageAdherence, followUps, topStudents, headline, academic: academicPart };
}
