import { AVATAR_STYLES, AVATAR_STYLE_LABELS, type AvatarStyle } from "@shared/onboarding";
import { Check } from "lucide-react";
import Illustration, { ILLUSTRATIONS } from "./Illustration";

export const avatarSrc = (style: AvatarStyle) => (style === "girl" ? ILLUSTRATIONS.avatarGirl : ILLUSTRATIONS.avatarBoy);

/** Öğrencinin avatarı: seçtiyse illüstrasyon, seçmediyse adının baş harfi (nötr). */
export function StudentAvatar({ style, name, size, className = "" }: { style: AvatarStyle | null | undefined; name: string; size: number; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-extrabold text-white ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {name.charAt(0).toLocaleUpperCase("tr-TR")}
      {style && <Illustration src={avatarSrc(style)} className="absolute inset-0 h-full w-full bg-brand-soft object-cover" />}
    </span>
  );
}

/** İki avatar + "seçmeyeyim" seçeneği; onboarding ve Genel Bakış'ta ortak. */
export function AvatarPicker({ id, value, onChange }: { id?: string; value: AvatarStyle | ""; onChange: (next: AvatarStyle | "") => void }) {
  const options: Array<{ key: AvatarStyle | ""; label: string }> = [...AVATAR_STYLES.map((style) => ({ key: style, label: AVATAR_STYLE_LABELS[style] })), { key: "", label: "Seçmeyeyim" }];
  return (
    <div id={id} role="radiogroup" aria-label="Avatar" className="flex flex-wrap gap-3">
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button key={option.key || "none"} type="button" role="radio" aria-checked={selected} onClick={() => onChange(option.key)} className={`flex w-[104px] flex-col items-center gap-2 rounded-2xl border p-3 text-[12px] font-semibold transition ${selected ? "border-brand bg-brand-soft text-brand-strong" : "border-rule bg-white text-ink-2 hover:border-brand/40"}`}>
            <span className="relative">
              {option.key ? <StudentAvatar style={option.key} name="?" size={64} /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-rule-strong text-[20px] text-ink-4">Aa</span>}
              {selected && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"><Check size={12} strokeWidth={3} /></span>}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
