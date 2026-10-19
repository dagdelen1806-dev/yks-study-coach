/**
 * Oturum hatırlatma bildirimi: hangi oturum için ne zaman ve hangi metinle.
 * Zamanlayıcı (GitHub Actions, 5 dakikada bir) birkaç dakika geç kalabilir; bu yüzden pencere
 * geniş tutulur ve metin oturuma KALAN gerçek süreyi söyler. Başlamasına 2 dakikadan az kalmış
 * (ya da başlamış) oturum için bildirim gönderilmez: o an işe yaramaz.
 */
import { NOTEBOOK_REVIEW_TASK_KIND } from "./questionNotebook";

export const REMINDER_MIN_LEAD_MS = 2 * 60 * 1000;
export const REMINDER_MAX_LEAD_MS = 20 * 60 * 1000;

export type ReminderSession = { id: number; sessionDate: Date; subject: string; topic: string; kind: string; plannedMinutes: number };
export type ReminderMessage = { title: string; body: string; url: string; tag: string };

export const isReminderDue = (sessionDate: Date, now: Date) => {
  const lead = sessionDate.getTime() - now.getTime();
  return lead >= REMINDER_MIN_LEAD_MS && lead <= REMINDER_MAX_LEAD_MS;
};

export function buildReminderMessage(session: ReminderSession, now: Date): ReminderMessage {
  const minutes = Math.max(1, Math.round((session.sessionDate.getTime() - now.getTime()) / 60_000));
  const review = session.kind === NOTEBOOK_REVIEW_TASK_KIND;
  return {
    title: review ? `${minutes} dk sonra: soru defteri tekrarı` : `${minutes} dk sonra: ${session.topic}`,
    body: review
      ? "Tekrar listendeki sorular seni bekliyor. Hazırsan başlayalım."
      : `${session.subject} · ${session.plannedMinutes} dk. Telefonunu uçak moduna al, odağa hazırlan.`,
    // Bildirime dokununca bu oturumun odak ekranı açılır (Home.tsx `?odak=`).
    url: `/?odak=${session.id}`,
    tag: `session-${session.id}`,
  };
}
