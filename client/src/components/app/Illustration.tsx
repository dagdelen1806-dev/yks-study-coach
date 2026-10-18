import { useEffect, useState } from "react";

/**
 * Dekoratif illüstrasyon yuvası. Görseller `client/public/illustrations/` altına konur
 * (bkz. o klasördeki README). Dosya henüz yoksa ya da yüklenemezse hiçbir şey
 * çizilmez; yerleşim görselsiz de tamam görünecek şekilde tasarlandı.
 */
export const ILLUSTRATIONS = {
  /** Avatarlar (512×512, yuvarlak çerçeveye göre kırpılmış). */
  avatarGirl: "/illustrations/avatar-girl.webp",
  avatarBoy: "/illustrations/avatar-boy.webp",
  /** Kız avatarlı karşılama alanının arka planı: zirveye bakan öğrenci (geniş manzara). */
  heroGirl: "/illustrations/hero-girl.jpg",
  /** Bayraklı zirve (dikey, nötr figür): kenar çubuğu, erkek/nötr karşılama ve motivasyon kartı. */
  summit: "/illustrations/summit.png",
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
