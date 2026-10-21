import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { kindsOf, type ExamKind, type ExamTrack } from "@shared/exams";

/** Öğrencinin hazırlandığı sınav (profilden; profil yüklenene kadar YKS) ve o sınavın türleri. */
export function useExamTrack(): { track: ExamTrack; kinds: ExamKind[] } {
  const { user } = useAuth();
  const profile = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false }).data;
  const track: ExamTrack = profile?.examTrack ?? "YKS";
  return { track, kinds: kindsOf(track) };
}
