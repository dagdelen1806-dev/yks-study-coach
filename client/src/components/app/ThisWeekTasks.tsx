import { Panel } from "@/components/app/kit";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK = [
  { value: "done", label: "Tamamladım" },
  { value: "struggled", label: "Zorlandım" },
  { value: "needs_review", label: "Tekrar etmeliyim" },
] as const;

/**
 * Öğrenci → Genel Bakış: öğretmenin bu hafta önerdiği çalışmalar ve görev başına kısa geri bildirim.
 * Öğretmenin takip dosyası, notları ve risk dili burada görünmez; yalnızca görevler.
 */
export default function ThisWeekTasks() {
  const utils = trpc.useUtils();
  const tasks = trpc.studyTasks.thisWeek.useQuery(undefined, { retry: false });
  const feedback = trpc.studyTasks.feedback.useMutation({
    onSuccess: (_, input) => { toast.success(input.feedback === "done" ? "Harika, görev tamamlandı." : "Öğretmenine iletildi."); void utils.studyTasks.thisWeek.invalidate(); void utils.calendar.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const rows = tasks.data ?? [];
  if (!rows.length) return null;
  const done = rows.filter((task) => task.studentFeedback === "done" || task.status === "completed").length;
  return (
    <Panel icon={<ClipboardCheck size={18} />} title="Bu haftaki çalışmalar" subtitle={`Öğretmeninin önerdikleri · ${done}/${rows.length} tamamlandı`}>
      <ul className="divide-y divide-rule">
        {rows.map((task) => {
          const at = new Date(task.sessionDate);
          return (
            <li key={task.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">{task.title}</div>
                <div className="text-[12.5px] text-ink-3">{at.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" })} {at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · {task.plannedMinutes} dk{task.targetPages ? ` · ${task.targetPages}` : ""}{task.assignedBy ? ` · ${task.assignedBy}` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${task.title} geri bildirimi`}>
                {FEEDBACK.map((option) => (
                  <button key={option.value} type="button" aria-pressed={task.studentFeedback === option.value} disabled={feedback.isPending} onClick={() => feedback.mutate({ sessionId: task.id, feedback: option.value })} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${task.studentFeedback === option.value ? (option.value === "done" ? "bg-success text-white" : "bg-warn text-white") : "bg-paper text-ink-2 hover:bg-brand-soft"}`}>{option.label}</button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
