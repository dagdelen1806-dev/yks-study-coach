import { palette } from "@shared/palette";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Pusula kart dili: Genel Bakış ve diğer sayfalar aynı yapı taşlarını kullanır
 * (beyaz kart, ikonlu başlık, sağda tek eylem; büyük sayı + kısa açıklama).
 */

/** Sayfanın üst başlığı: küçük bağlam etiketi, başlık, açıklama ve sağda eylemler. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[13px] font-semibold text-brand">{eyebrow}</p>}
        <h1 className="font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[70ch] text-[14px] leading-6 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ icon, title, subtitle, action, children, className = "" }: { icon?: ReactNode; title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`soft-card flex min-w-0 flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-ink">{icon && <span className="text-brand">{icon}</span>}{title}</h2>
          {subtitle && <p className="mt-1 text-[12px] text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-strong">{children} <ArrowRight size={13} /></button>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: ReadonlyArray<T | { value: T; label: string }>; onChange: (value: T) => void; label: string }) {
  return (
    <div className="inline-flex shrink-0 rounded-full bg-paper p-1" role="tablist" aria-label={label}>
      {options.map((option) => {
        const key = typeof option === "string" ? option : option.value;
        const text = typeof option === "string" ? option : option.label;
        return <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)} className={`h-7 whitespace-nowrap rounded-full px-3.5 text-[12px] font-bold transition ${value === key ? "bg-brand text-white" : "text-ink-3 hover:text-ink"}`}>{text}</button>;
      })}
    </div>
  );
}

export function Bar100({ value, color = palette.brand }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = palette.brand, children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={palette.rule} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export type StatTone = "plain" | "warm" | "good" | "bad" | "warn";
const STAT_TONE: Record<StatTone, { card: string; icon: string }> = {
  plain: { card: "", icon: "text-brand" },
  warm: { card: "border-[#f3dc9b] bg-pencil-soft/70", icon: "text-pencil-strong" },
  good: { card: "", icon: "text-success" },
  bad: { card: "", icon: "text-danger" },
  warn: { card: "", icon: "text-warn" },
};

export function StatCard({ icon, label, value, unit, foot, progress, tone = "plain" }: { icon: ReactNode; label: string; value: string; unit?: string; foot?: ReactNode; progress?: number; tone?: StatTone }) {
  return (
    <div className={`soft-card flex min-w-0 flex-col p-4 ${STAT_TONE[tone].card}`}>
      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-2"><span className={STAT_TONE[tone].icon}>{icon}</span>{label}</div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5"><span className="metric-value">{value}</span>{unit && <span className="text-[15px] font-semibold text-ink-2">{unit}</span>}</p>
      {(progress !== undefined || foot) && (
        <div className="mt-auto pt-3">
          {progress !== undefined && <div className="mb-2"><Bar100 value={progress} /></div>}
          {foot && <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[12px] text-ink-3">{foot}</div>}
        </div>
      )}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-rule-strong bg-paper/60 px-4 py-8 text-center text-[13px] leading-5 text-ink-3">{children}</div>;
}

/** Birincil (teal) ve ikincil (beyaz) eylem düğmeleri. */
export const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-brand-strong disabled:opacity-60";
export const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rule bg-white px-4 text-[14px] font-semibold text-ink-2 transition hover:border-brand/40 hover:text-brand-strong disabled:opacity-60";
