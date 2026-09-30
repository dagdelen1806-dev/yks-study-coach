/** E-posta doğrulaması yalnızca e-postayla açılmış yerel hesaplarda var;
 * diğerlerinde (telefon, eski isim) "—" gösterilir. */
export default function EmailVerifiedBadge({ loginMethod, verifiedAt }: { loginMethod: string | null; verifiedAt: Date | string | null }) {
  if (loginMethod !== "dev_email") return <span className="text-rule-strong">—</span>;
  return verifiedAt
    ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-bold text-success">✓ Doğrulandı</span>
    : <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-bold text-warn">⚠ Doğrulanmadı</span>;
}
