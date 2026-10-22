import { RISK_LABELS, type RiskKey } from "@shared/org";

// Kurum Paneli ortak küçük yardımcıları.

export const ORG_PATHS = {
  dashboard: "/kurum",
  students: "/kurum/ogrenciler",
  cases: "/kurum/akademik-takip",
  classes: "/kurum/siniflar",
  timetable: "/kurum/ders-programi",
  teachers: "/kurum/ogretmenler",
  invitations: "/kurum/davetler",
  audit: "/kurum/kayitlar",
  settings: "/kurum/ayarlar",
} as const;
export type OrgSection = keyof typeof ORG_PATHS;
export const studentPath = (userId: number) => `/kurum/ogrenci/${userId}`;

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "hiç";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? "az önce" : `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} gün önce` : new Date(value).toLocaleDateString("tr-TR");
}

export const formatNet = (value: number | null | undefined) => (typeof value === "number" ? value.toFixed(2) : "—");
export const deltaText = (delta: number | null | undefined) => (typeof delta === "number" ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}` : "");

export function RiskBadges({ risks }: { risks: RiskKey[] }) {
  if (!risks.length) return <span className="flex"><span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">Yolunda</span></span>;
  return <span className="flex flex-wrap gap-1">{risks.map((risk) => <span key={risk} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${risk === "net_drop" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>{RISK_LABELS[risk]}</span>)}</span>;
}

export function Initials({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toLocaleUpperCase("tr-TR")).join("") || "?";
  return <span className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">{initials}</span>;
}
