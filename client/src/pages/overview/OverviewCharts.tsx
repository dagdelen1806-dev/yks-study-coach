import { palette } from "@shared/palette";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Genel Bakış grafikleri ayrı dosyada: grafik motoru (recharts) ilk paketten çıkar, sayfa
// grafikleri beklemeden çizilir (bkz. Overview.tsx'teki lazy yükleme).

export function NetTrendChart({ data }: { data: Array<{ label: string; net: number; title: string }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -18 }}>
        <defs><linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.brand} stopOpacity={0.18} /><stop offset="100%" stopColor={palette.brand} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={palette.rule} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} width={44} domain={[0, "auto"]} />
        <Tooltip formatter={(value: number) => [`${value} net`, "Net"]} labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label} contentStyle={{ borderRadius: 12, border: `1px solid ${palette.rule}`, fontSize: 12 }} />
        <Area type="monotone" dataKey="net" stroke="none" fill="url(#netFill)" />
        <Line type="monotone" dataKey="net" stroke={palette.brand} strokeWidth={2.5} dot={{ r: 3.5, fill: "#fff", stroke: palette.brand, strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function WeeklyStudyChart({ data, showGoal }: { data: Array<{ key: string; day: string; minutes: number; goal: number }>; showGoal: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: 0 }} barGap={3}>
        <CartesianGrid stroke={palette.rule} vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} width={48} unit=" dk" allowDecimals={false} />
        <Tooltip formatter={(value: number, key) => [`${value} dk`, key === "goal" ? "Hedef" : "Senin süren"]} contentStyle={{ borderRadius: 12, border: `1px solid ${palette.rule}`, fontSize: 12 }} cursor={{ fill: palette.paper }} />
        <Bar dataKey="minutes" fill={palette.brand} radius={[5, 5, 0, 0]} maxBarSize={18} />
        {showGoal && <Bar dataKey="goal" fill={palette.rule} radius={[5, 5, 0, 0]} maxBarSize={18} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
