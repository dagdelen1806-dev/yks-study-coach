import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { kindsOf, subjectsForStudent, type ExamKind, type ExamTrack } from "@shared/exams";

/**
 * Öğrencinin hazırlandığı sınav (profilden; profil yüklenene kadar YKS), o sınavın türleri ve
 * öğrencinin dersleri: ders seçtiren sınavda (KPSS A grubu) yalnızca seçtiği alan testleri.
 */
export function useExamTrack(): { track: ExamTrack; kinds: ExamKind[]; selectedSubjects: string[]; subjectsOf: (kind: ExamKind) => string[]; trackSubjectList: string[] } {
  const { user } = useAuth();
  const profile = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false }).data;
  const track: ExamTrack = profile?.examTrack ?? "YKS";
  const kinds = kindsOf(track);
  const selectedSubjects = profile?.selectedSubjects ?? [];
  const subjectsOf = (kind: ExamKind) => subjectsForStudent(kind, selectedSubjects);
  return { track, kinds, selectedSubjects, subjectsOf, trackSubjectList: Array.from(new Set(kinds.flatMap(subjectsOf))) };
}
