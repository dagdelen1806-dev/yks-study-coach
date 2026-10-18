import { useEffect, useState } from "react";

/**
 * Dekoratif illüstrasyon yuvası. Görseller `client/public/illustrations/` altına konur
 * (bkz. o klasördeki README). Dosya henüz yoksa ya da yüklenemezse hiçbir şey
 * çizilmez; yerleşim görselsiz de tamam görünecek şekilde tasarlandı.
 */
export const ILLUSTRATIONS = {
  /** Genel Bakış karşılama alanı, öğrenci avatarı (kare, şeffaf arka plan). */
  coachAvatar: "/illustrations/coach-avatar.png",
  /** Genel Bakış sağ sütun alt kartı, manzara (yatay). */
  motivationLandscape: "/illustrations/motivation-landscape.jpg",
  /** Kenar çubuğunun altı, dağ silueti (yatay, şeffaf arka plan). */
  sidebarMountains: "/illustrations/sidebar-mountains.png",
} as const;

export default function Illustration({ src, className, alt = "" }: { src: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt={alt} aria-hidden={alt ? undefined : true} loading="lazy" decoding="async" onError={() => setFailed(true)} className={className} />;
}

/** Görselin var olup olmadığını bilmek gereken yerler için (ör. görsel yoksa kartı hiç gösterme). */
export function useIllustrationAvailable(src: string) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    const probe = new Image();
    probe.onload = () => { if (alive) setAvailable(true); };
    probe.src = src;
    return () => { alive = false; };
  }, [src]);
  return available;
}
