import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { COACHING_EXPECTATION_LABELS, COACHING_STYLE_LABELS, GRADE_LEVEL_LABELS, MOCK_EXAM_FREQUENCY_LABELS, NOTIFICATION_PREFERENCE_LABELS, STUDY_METHOD_LABELS, STUDY_TIME_LABELS, TARGET_SCORE_TYPE_LABELS } from "@shared/onboarding";
import EmailVerifiedBadge from "./EmailVerifiedBadge";
import { accountStatusLabel, accountStatusTone, approvalLabel, approvalTone, formatDate, formatDateTime, paymentStatusLabel, subscriptionStatusLabel, subscriptionStatusTone } from "./adminFormat";

const FEATURE_LABELS: Record<string, string> = { AI_STUDY_PLAN: "AI Çalışma Planı", OCR_EXAM_IMPORT: "Belgeden Deneme Aktarımı", ADVANCED_ANALYTICS: "Gelişmiş Analizler", PLAN_ADHERENCE: "Plan Uyumu", RESOURCE_RECOMMENDATIONS: "Kaynak Önerileri", ADVANCED_REPORTS: "Gelişmiş Raporlar", FOCUS_AURA_PREMIUM: "Premium Pusula Odak", MOCK_EXAM_ANALYTICS: "Deneme Analitiği" };
const LOGIN_METHOD_LABELS: Record<string, string> = { dev_email: "E-posta + şifre", dev_phone: "Telefon + şifre", dev: "İsim + şifre (eski)" };
const labelOf = (labels: Record<string, string>, value: string | null) => (value ? labels[value] ?? value : "—");
const listOf = (values: string[], labels?: Record<string, string>) => (values.length ? values.map((value) => labels?.[value] ?? value).join(", ") : "—");
const TAB_LABELS = ["Genel Bakış", "Profil", "Abonelik", "Kullanım", "İlerleme", "Denemeler", "Konular", "Kitaplar", "Ödemeler", "Denetim"] as const;
type Tab = (typeof TAB_LABELS)[number];

/**
 * Öğrenci detay paneli (spec §9-25) — gerçek URL router olmadığı için
 * (spec §2: "Eğer projede gerçek URL router yoksa mevcut routing
 * architecture'ını kontrollü şekilde geliştir") `/admin/users/:userId`
 * yerine bir overlay panel olarak açılıyor; sekmeler aynı bilgi mimarisini
 * (Overview/Subscription/Usage/Progress/Exams/Topics/Payments/Audit) koruyor.
 */
export default function AdminUserDetail({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Genel Bakış");
  const detail = trpc.admin.users.get.useQuery({ userId });
  const utils = trpc.useUtils();

  const refetch = () => { detail.refetch(); utils.admin.users.list.invalidate(); };
  const approve = trpc.admin.users.approve.useMutation({ onSuccess: () => { toast.success("Onaylandı."); refetch(); }, onError: (error) => toast.error(error.message) });
  const suspend = trpc.admin.users.suspend.useMutation({ onSuccess: () => { toast.success("Askıya alındı."); refetch(); }, onError: (error) => toast.error(error.message) });
  const reactivate = trpc.admin.users.reactivate.useMutation({ onSuccess: () => { toast.success("Yeniden aktifleştirildi."); refetch(); }, onError: (error) => toast.error(error.message) });
  const reject = trpc.admin.users.reject.useMutation({ onSuccess: () => { toast.success("Reddedildi."); refetch(); }, onError: (error) => toast.error(error.message) });
  const resetUsage = trpc.admin.usage.reset.useMutation({ onSuccess: () => { toast.success("Kullanım sıfırlandı."); refetch(); }, onError: (error) => toast.error(error.message) });
  const verifyEmail = trpc.admin.users.verifyEmail.useMutation({ onSuccess: () => { toast.success("E-posta doğrulandı olarak işaretlendi."); refetch(); }, onError: (error) => toast.error(error.message) });
  const revoke = trpc.admin.subscriptions.revoke.useMutation({ onSuccess: () => { toast.success("Erişim geri alındı."); refetch(); }, onError: (error) => toast.error(error.message) });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-[#1f2333]/40" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        {detail.isLoading || !detail.data ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[#3b5ccc]" size={22} /></div>
        ) : (
          <>
            <div className="border-b border-[#1f2333]/[0.07] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1f2333] text-[13px] font-bold text-white">{(detail.data.user.name || "?").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="text-[15px] font-semibold text-[#1f2333]">{detail.data.user.name || "İsimsiz"}{detail.data.user.role === "admin" && <span className="ml-1.5 rounded-full bg-[#1f2333] px-1.5 py-0.5 text-[9px] font-bold text-white">admin</span>}</div>
                    <div className="text-[11px] text-[#8b8c95]">{detail.data.user.email || detail.data.user.phone || detail.data.user.openId}</div>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]"><X size={16} /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.data.user.loginMethod === "dev_email" && <EmailVerifiedBadge loginMethod={detail.data.user.loginMethod} verifiedAt={detail.data.user.emailVerifiedAt} />}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${approvalTone[detail.data.user.approvalStatus]}`}>{approvalLabel[detail.data.user.approvalStatus]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${accountStatusTone[detail.data.user.accountStatus]}`}>{accountStatusLabel[detail.data.user.accountStatus]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${subscriptionStatusTone[detail.data.entitlements.status] ?? "bg-[#f7f5ef] text-[#858690]"}`}>{detail.data.entitlements.planCode} · {subscriptionStatusLabel[detail.data.entitlements.status] ?? detail.data.entitlements.status}</span>
                <span className="rounded-full bg-[#f7f5ef] px-2 py-0.5 text-[10px] text-[#8b8c95]">Katıldı: {formatDate(detail.data.user.createdAt)}</span>
                <span className="rounded-full bg-[#f7f5ef] px-2 py-0.5 text-[10px] text-[#8b8c95]">Son giriş: {formatDateTime(detail.data.user.lastSignedIn)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.data.user.loginMethod === "dev_email" && !detail.data.user.emailVerifiedAt && (
                  <Button onClick={() => { if (window.confirm("Bu kullanıcının e-postası, kullanıcı linke tıklamadan doğrulanmış sayılacak. Emin misin?")) verifyEmail.mutate({ userId }); }} disabled={verifyEmail.isPending} variant="outline" className="h-8 rounded-lg border-[#3b5ccc]/25 px-3 text-[11px] font-semibold text-[#3b5ccc]">E-postayı manuel doğrula</Button>
                )}
                {detail.data.user.approvalStatus === "pending" && <>
                  <Button onClick={() => approve.mutate({ userId })} disabled={approve.isPending} className="h-8 rounded-lg bg-[#55a98b] px-3 text-[11px] font-semibold text-white">Onayla</Button>
                  <Button onClick={() => reject.mutate({ userId })} disabled={reject.isPending} variant="outline" className="h-8 rounded-lg border-[#d95d4d]/25 px-3 text-[11px] font-semibold text-[#d95d4d]">Reddet</Button>
                </>}
                {detail.data.user.accountStatus === "active" ? (
                  <Button onClick={() => suspend.mutate({ userId })} disabled={suspend.isPending} variant="outline" className="h-8 rounded-lg border-[#d95d4d]/25 px-3 text-[11px] font-semibold text-[#d95d4d]">Askıya al</Button>
                ) : detail.data.user.accountStatus === "suspended" ? (
                  <Button onClick={() => reactivate.mutate({ userId })} disabled={reactivate.isPending} variant="outline" className="h-8 rounded-lg border-[#3b5ccc]/25 px-3 text-[11px] font-semibold text-[#3b5ccc]">Yeniden aktifleştir</Button>
                ) : null}
                {detail.data.entitlements.planCode !== "FREE" && <Button onClick={() => revoke.mutate({ userId })} disabled={revoke.isPending} variant="outline" className="h-8 rounded-lg border-[#d95d4d]/25 px-3 text-[11px] font-semibold text-[#d95d4d]">Premium erişimi geri al</Button>}
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-[#1f2333]/[0.07] px-5 pt-2">
              {TAB_LABELS.map((label) => <button key={label} onClick={() => setTab(label)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-[11px] font-semibold ${tab === label ? "border-b-2 border-[#3b5ccc] text-[#3b5ccc]" : "text-[#8b8c95]"}`}>{label}</button>)}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === "Genel Bakış" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatBox label="Konu kapsama" value={`%${detail.data.progressScore.overallScore ?? "—"}`} />
                    <StatBox label="Deneme sayısı" value={String(detail.data.recentExams.length)} />
                    <StatBox label="Çalışılan konu" value={String(detail.data.topicProgress.length)} />
                    <StatBox label="Son 20 kayıt" value={String(detail.data.recentStudyLogs.length)} />
                  </div>
                  {detail.data.user.rejectionReason && <div className="rounded-xl bg-[#fff0ed] p-3 text-[11px] text-[#d95d4d]">Red nedeni: {detail.data.user.rejectionReason}</div>}
                </div>
              )}

              {tab === "Profil" && (
                <div className="space-y-4 text-[12px]">
                  <Section title="Hesap">
                    <Row label="Kullanıcı ID" value={`#${detail.data.user.id}`} />
                    <Row label="Ad" value={detail.data.user.name || "—"} />
                    <Row label="E-posta" value={detail.data.user.email || "—"} />
                    {detail.data.user.loginMethod === "dev_email" && <Row label="E-posta doğrulandı" value={detail.data.user.emailVerifiedAt ? formatDateTime(detail.data.user.emailVerifiedAt) : "Hayır"} />}
                    <Row label="Telefon" value={detail.data.user.phone || "—"} />
                    <Row label="Giriş yöntemi" value={LOGIN_METHOD_LABELS[detail.data.user.loginMethod ?? ""] ?? detail.data.user.loginMethod ?? "—"} />
                    <Row label="Rol" value={detail.data.user.role === "admin" ? "Admin" : "Öğrenci"} />
                    <Row label="Kayıt tarihi" value={formatDateTime(detail.data.user.createdAt)} />
                    <Row label="Onay tarihi" value={formatDateTime(detail.data.user.approvedAt)} />
                    <Row label="Son giriş" value={formatDateTime(detail.data.user.lastSignedIn)} />
                  </Section>
                  {detail.data.profile.onboardingStep === 0 && !detail.data.profile.onboardingCompleted ? (
                    <EmptyState text="Öğrenci henüz tanışma (onboarding) formunu doldurmadı." />
                  ) : (
                    <>
                      <Section title={`Öğrenci bilgileri${detail.data.profile.onboardingCompleted ? "" : " (form yarım kaldı)"}`}>
                        <Row label="Hitap adı" value={detail.data.profile.preferredName || "—"} />
                        <Row label="Sınıf" value={detail.data.profile.gradeLevel ? GRADE_LEVEL_LABELS[detail.data.profile.gradeLevel] : "—"} />
                        <Row label="Sınav yılı" value={detail.data.profile.examYear ? String(detail.data.profile.examYear) : "—"} />
                        <Row label="Puan türü" value={detail.data.profile.targetScoreType ? TARGET_SCORE_TYPE_LABELS[detail.data.profile.targetScoreType] : "—"} />
                      </Section>
                      <Section title="Akademik durum">
                        <Row label="TYT net" value={detail.data.profile.currentTytNet || "—"} />
                        <Row label="AYT net" value={detail.data.profile.currentAytNet || "—"} />
                        <Row label="Deneme sıklığı" value={labelOf(MOCK_EXAM_FREQUENCY_LABELS, detail.data.profile.mockExamFrequency)} />
                        <Row label="Güçlü dersler" value={listOf(detail.data.profile.strongSubjects)} />
                        <Row label="Zayıf dersler" value={listOf(detail.data.profile.weakSubjects)} />
                        <Row label="Önceden planı var mıydı" value={detail.data.profile.hasPriorStudyPlan === null ? "—" : detail.data.profile.hasPriorStudyPlan ? "Evet" : "Hayır"} />
                      </Section>
                      <Section title="Hedefler">
                        <Row label="Hedef üniversite" value={detail.data.profile.targetUniversity || "—"} />
                        <Row label="Hedef bölüm" value={detail.data.profile.targetDepartment || "—"} />
                        <Row label="Hedef sıralama" value={detail.data.profile.targetRanking || "—"} />
                        <TextRow label="Ana hedef" value={detail.data.profile.mainGoal} />
                        <TextRow label="Kısa vadeli hedef" value={detail.data.profile.shortTermGoal} />
                        <TextRow label="Uzun vadeli hedef" value={detail.data.profile.longTermGoal} />
                      </Section>
                      <Section title="Çalışma düzeni">
                        <Row label="Günlük çalışma" value={detail.data.profile.dailyStudyDuration ? `${detail.data.profile.dailyStudyDuration} dk` : "—"} />
                        <Row label="Başlangıç saati" value={detail.data.profile.preferredStudyStartTime || "—"} />
                        <Row label="Çalışma günleri" value={listOf(detail.data.profile.availableStudyDays)} />
                        <Row label="Tercih edilen saatler" value={listOf(detail.data.profile.preferredStudyTimes, STUDY_TIME_LABELS)} />
                        <Row label="Çalışma yöntemleri" value={listOf(detail.data.profile.preferredStudyMethods, STUDY_METHOD_LABELS)} />
                        <TextRow label="Engeller" value={detail.data.profile.studyObstacles} />
                      </Section>
                      <Section title="Koçluk tercihleri">
                        <Row label="Beklentiler" value={listOf(detail.data.profile.coachingExpectations, COACHING_EXPECTATION_LABELS)} />
                        <Row label="Bildirim tercihi" value={labelOf(NOTIFICATION_PREFERENCE_LABELS, detail.data.profile.notificationPreference)} />
                        <Row label="Koçluk tarzı" value={labelOf(COACHING_STYLE_LABELS, detail.data.profile.coachingStyle)} />
                        <TextRow label="Ek notlar" value={detail.data.profile.additionalNotes} />
                      </Section>
                    </>
                  )}
                </div>
              )}

              {tab === "Abonelik" && detail.data.subscription && (
                <div className="space-y-2 text-[12px]">
                  <Row label="Plan" value={`${detail.data.subscription.planName} (${detail.data.subscription.planTier})`} />
                  <Row label="Durum" value={subscriptionStatusLabel[detail.data.subscription.status] ?? detail.data.subscription.status} />
                  <Row label="Trial başlangıç" value={formatDateTime(detail.data.subscription.trialStartedAt)} />
                  <Row label="Trial bitiş" value={formatDateTime(detail.data.subscription.trialEndsAt)} />
                  <Row label="Dönem başlangıç" value={formatDateTime(detail.data.subscription.currentPeriodStart)} />
                  <Row label="Dönem bitiş" value={formatDateTime(detail.data.subscription.currentPeriodEnd)} />
                  <Row label="Dönem sonunda iptal" value={detail.data.subscription.cancelAtPeriodEnd ? "Evet" : "Hayır"} />
                  <Row label="Ek süre (grace) bitiş" value={formatDateTime(detail.data.subscription.gracePeriodEndsAt)} />
                  <Row label="Sağlayıcı" value={detail.data.subscription.provider ?? "—"} />
                  <Row label="Sağlayıcı abonelik ID" value={detail.data.subscription.providerSubscriptionId ?? "—"} />
                  <Row label="Manuel verilmiş mi" value={detail.data.subscription.isManualOverride ? "Evet (admin tarafından)" : "Hayır"} />
                </div>
              )}
              {tab === "Abonelik" && !detail.data.subscription && <EmptyState text="Bu kullanıcı için abonelik kaydı henüz oluşmadı." />}

              {tab === "Kullanım" && (
                detail.data.usage.length === 0 ? <EmptyState text="Bu kullanıcının erişebildiği kotalı bir özellik yok." /> : (
                  <div className="space-y-3">
                    {detail.data.usage.map((row) => (
                      <div key={row.feature} className="rounded-xl border border-[#1f2333]/[0.07] p-3">
                        <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[#343643]">{FEATURE_LABELS[row.feature] ?? row.feature}</span><button onClick={() => resetUsage.mutate({ userId, featureKey: row.feature as never })} disabled={resetUsage.isPending} className="text-[10px] font-semibold text-[#3b5ccc]">Sıfırla</button></div>
                        {row.limit === null ? (
                          <div className="mt-1 text-[11px] text-[#8b8c95]">Sınırsız</div>
                        ) : (
                          <>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f7f5ef]"><div className="h-full rounded-full bg-[#3b5ccc]" style={{ width: `${Math.min(100, Math.round((row.used / row.limit) * 100))}%` }} /></div>
                            <div className="mt-1 text-[10px] text-[#8b8c95]">{row.used} / {row.limit} kullanıldı · {row.remaining} kalan · son {row.windowDays} gün</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === "İlerleme" && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#f7f5ef] p-4 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#9a9ba3]">Study Progress Score</div>
                    <div className="mt-1 text-[32px] font-semibold text-[#1f2333]">{detail.data.progressScore.overallScore === null ? "—" : `${detail.data.progressScore.overallScore}/100`}</div>
                    {detail.data.progressScore.insufficientData && <div className="mt-1 text-[11px] text-[#8b8c95]">Yeterli veri yok</div>}
                  </div>
                  <div className="space-y-2">
                    {Object.values(detail.data.progressScore.components).map((component) => (
                      <div key={component.label} className="flex items-center justify-between rounded-xl border border-[#1f2333]/[0.07] p-3">
                        <span className="text-[12px] text-[#343643]">{component.label}</span>
                        <span className="text-[12px] font-semibold text-[#1f2333]">{component.insufficientData ? "Yeterli veri yok" : `${component.score}/100`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Denemeler" && (
                detail.data.recentExams.length === 0 ? <EmptyState text="Henüz deneme kaydı yok." /> : (
                  <table className="w-full text-left text-[12px]"><thead className="text-[10px] uppercase text-[#9a9ba3]"><tr><th className="py-1.5">Başlık</th><th className="py-1.5">Sınav</th><th className="py-1.5">Tarih</th><th className="py-1.5">Net</th></tr></thead><tbody className="divide-y divide-[#1f2333]/[0.06]">{detail.data.recentExams.map((exam) => <tr key={exam.id}><td className="py-1.5 pr-2">{exam.title}</td><td className="py-1.5 pr-2">{exam.exam}</td><td className="py-1.5 pr-2">{formatDate(exam.examDate)}</td><td className="py-1.5 font-semibold">{exam.net.toFixed(2)}</td></tr>)}</tbody></table>
                )
              )}

              {tab === "Konular" && (
                detail.data.topicProgress.length === 0 ? <EmptyState text="Henüz çalışılmış konu yok." /> : (
                  <div className="space-y-2">{detail.data.topicProgress.map((topic) => <div key={topic.id} className="flex items-center justify-between rounded-xl border border-[#1f2333]/[0.07] p-2.5 text-[11px]"><span className="text-[#343643]">Konu #{topic.topicId}</span><span className="font-semibold text-[#3b5ccc]">%{topic.progress} · {topic.status}</span></div>)}</div>
                )
              )}

              {tab === "Kitaplar" && (
                detail.data.bookContents.length === 0 ? <EmptyState text="Bu öğrenci henüz bir kitabın içindekilerini taramadı." /> : (
                  <table className="w-full text-left text-[12px]"><thead className="text-[10px] uppercase text-[#9a9ba3]"><tr><th className="py-1.5">Kitap</th><th className="py-1.5">Kaynak</th><th className="py-1.5">Satır</th><th className="py-1.5">Eşleşti</th><th className="py-1.5">Eşleşmedi</th><th className="py-1.5">Düşük güven</th><th className="py-1.5">Tarih</th></tr></thead><tbody className="divide-y divide-[#1f2333]/[0.06]">{detail.data.bookContents.map((book) => <tr key={book.bookId}><td className="max-w-[180px] truncate py-1.5 pr-2" title={book.bookId}>{book.title ?? <span className="font-mono text-[10px]">{book.bookId}</span>}</td><td className="py-1.5 pr-2">{book.source === "ocr" ? "OCR" : "Elle"}</td><td className="py-1.5 pr-2">{book.entries}</td><td className="py-1.5 pr-2 text-[#3c8a6d]">{book.confirmed}{book.manual ? ` (${book.manual} elle)` : ""}</td><td className={`py-1.5 pr-2 ${book.unmatched ? "font-semibold text-[#d95d4d]" : ""}`}>{book.unmatched}</td><td className={`py-1.5 pr-2 ${book.lowConfidence ? "font-semibold text-[#a1711d]" : ""}`}>{book.lowConfidence}</td><td className="py-1.5">{formatDate(book.scannedAt)}</td></tr>)}</tbody></table>
                )
              )}

              {tab === "Ödemeler" && (
                detail.data.payments.length === 0 ? <EmptyState text="Henüz ödeme kaydı yok." /> : (
                  <table className="w-full text-left text-[12px]"><thead className="text-[10px] uppercase text-[#9a9ba3]"><tr><th className="py-1.5">Tutar</th><th className="py-1.5">Durum</th><th className="py-1.5">Tür</th><th className="py-1.5">Tarih</th></tr></thead><tbody className="divide-y divide-[#1f2333]/[0.06]">{detail.data.payments.map((payment) => <tr key={payment.id}><td className="py-1.5 pr-2 font-semibold">{(payment.amount / 100).toFixed(2)} {payment.currency}</td><td className="py-1.5 pr-2">{paymentStatusLabel[payment.status] ?? payment.status}</td><td className="py-1.5 pr-2">{payment.paymentType ?? "—"}</td><td className="py-1.5">{formatDate(payment.createdAt)}</td></tr>)}</tbody></table>
                )
              )}

              {tab === "Denetim" && (
                detail.data.auditLogs.length === 0 ? <EmptyState text="Bu kullanıcı için denetim kaydı yok." /> : (
                  <div className="space-y-2">{detail.data.auditLogs.map((log) => <div key={log.id} className="rounded-xl border border-[#1f2333]/[0.07] p-2.5 text-[11px]"><div className="font-semibold text-[#343643]">{log.action}</div><div className="mt-0.5 text-[#9a9ba3]">{formatDateTime(log.createdAt)}{log.reason ? ` · ${log.reason}` : ""}</div></div>)}</div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f5ef] p-3 text-center"><div className="text-[16px] font-semibold text-[#1f2333]">{value}</div><div className="mt-0.5 text-[10px] text-[#8b8c95]">{label}</div></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[#1f2333]/[0.05] py-2"><span className="text-[#8b8c95]">{label}</span><span className="font-medium text-[#343643]">{value}</span></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#9a9ba3]">{title}</div>{children}</div>;
}
function TextRow({ label, value }: { label: string; value: string | null }) {
  return <div className="border-b border-[#1f2333]/[0.05] py-2"><div className="text-[#8b8c95]">{label}</div><div className="mt-0.5 whitespace-pre-wrap font-medium text-[#343643]">{value || "—"}</div></div>;
}
function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[#f7f5ef] p-6 text-center text-[12px] text-[#858690]">{text}</div>;
}
