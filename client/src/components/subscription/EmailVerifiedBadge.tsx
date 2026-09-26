/** E-posta doğrulaması yalnızca e-postayla açılmış yerel hesaplarda var;
 * diğerlerinde (telefon, eski isim) "—" gösterilir. */
export default function EmailVerifiedBadge({ loginMethod, verifiedAt }: { loginMethod: string | null; verifiedAt: Date | string | null }) {
  if (loginMethod !== "dev_email") return <span className="text-[#b0b1b8]">—</span>;
  return verifiedAt
    ? <span className="rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[10px] font-bold text-[#3c8a6d]">✓ Doğrulandı</span>
    : <span className="rounded-full bg-[#fff8df] px-2 py-0.5 text-[10px] font-bold text-[#a1711d]">⚠ Doğrulanmadı</span>;
}
