import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Odak ekranının ortam sesi (FOKUS'taki ile aynı sesler ve davranış). Dosyalar
 * client/public/media/sounds/ altında. Web Audio ile çalınır: arabellek döngüsü kesintisizdir
 * (<audio loop> dosya başında kısa bir boşluk bırakır) ve düzey değişimleri yumuşak geçişlidir.
 *   full: odak çalışıyor · half: nefes molası · off: hazırlık, duraklatma, bitiş
 */
export const AMBIENT_SOUNDS = [
  { key: "white", label: "Beyaz gürültü" },
  { key: "pink", label: "Pembe gürültü" },
  { key: "brown", label: "Kahverengi gürültü" },
] as const;
export type AmbientKey = (typeof AMBIENT_SOUNDS)[number]["key"];
export type AmbientChoice = AmbientKey | "off";
export type AmbientTarget = "full" | "half" | "off";

const STORAGE_KEY = "pusula.ambient";
const FADE_SECONDS = 0.8;

const readPreferences = (): { sound: AmbientChoice; volume: number } => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { sound?: string; volume?: number };
    const sound = AMBIENT_SOUNDS.some((item) => item.key === saved.sound) ? (saved.sound as AmbientKey) : "off";
    const volume = typeof saved.volume === "number" ? Math.min(100, Math.max(0, saved.volume)) : 60;
    return { sound, volume };
  } catch {
    return { sound: "off", volume: 60 };
  }
};

export function useAmbientSound(target: AmbientTarget) {
  const [{ sound, volume }, setPreferences] = useState(readPreferences);
  const [blocked, setBlocked] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<{ key: AmbientKey; node: AudioBufferSourceNode } | null>(null);
  const buffers = useRef(new Map<AmbientKey, Promise<AudioBuffer>>());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ sound, volume })); } catch { /* gizli pencere: yalnızca bu oturumda hatırlanır */ }
  }, [sound, volume]);

  const ensureContext = () => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      contextRef.current = context;
      gainRef.current = gain;
    }
    return contextRef.current;
  };

  const loadBuffer = (context: AudioContext, key: AmbientKey) => {
    if (!buffers.current.has(key)) {
      const pending = fetch(`/media/sounds/${key}.mp3`).then((response) => {
        if (!response.ok) throw new Error(`ses yüklenemedi: ${key}`);
        return response.arrayBuffer();
      }).then((data) => context.decodeAudioData(data));
      pending.catch(() => buffers.current.delete(key));
      buffers.current.set(key, pending);
    }
    return buffers.current.get(key)!;
  };

  const rampTo = (level: number) => {
    const context = contextRef.current;
    const gain = gainRef.current;
    if (!context || !gain) return;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(level, context.currentTime + FADE_SECONDS);
  };

  const stopSource = (afterSeconds: number) => {
    const current = sourceRef.current;
    sourceRef.current = null;
    if (current) current.node.stop((contextRef.current?.currentTime ?? 0) + afterSeconds);
  };

  // Hedef, seçilen ses ya da düzey değiştikçe çalanı ona uydur.
  useEffect(() => {
    const audible = target !== "off" && sound !== "off";
    if (!audible) {
      rampTo(0);
      if (sourceRef.current) stopSource(FADE_SECONDS);
      return;
    }
    const context = ensureContext();
    if (!context) return;
    let cancelled = false;
    (async () => {
      if (context.state === "suspended") await context.resume().catch(() => undefined);
      // Tarayıcı kullanıcı dokunuşu olmadan sesi başlatmaya izin vermediyse düğme göster.
      setBlocked(context.state !== "running");
      if (sourceRef.current?.key !== sound) {
        const buffer = await loadBuffer(context, sound).catch(() => null);
        if (!buffer || cancelled) return;
        // Ses değişti: eskisini hemen bırak (kazanç ortak; ikisi üst üste çalmasın).
        if (sourceRef.current) stopSource(0);
        const node = context.createBufferSource();
        node.buffer = buffer;
        node.loop = true;
        node.connect(gainRef.current!);
        node.start();
        sourceRef.current = { key: sound, node };
      }
      const level = (volume / 100) ** 2; // kulağa doğrusal gelen ölçek
      rampTo(target === "half" ? level / 2 : level);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, sound, volume]);

  // Odak ekranı kapanınca her şeyi bırak.
  useEffect(() => () => {
    try { sourceRef.current?.node.stop(); } catch { /* zaten durmuş */ }
    void contextRef.current?.close().catch(() => undefined);
  }, []);

  const resume = useCallback(async () => {
    await contextRef.current?.resume().catch(() => undefined);
    setBlocked(contextRef.current?.state !== "running");
  }, []);

  return {
    sound,
    volume,
    blocked: blocked && target !== "off" && sound !== "off",
    setSound: (next: AmbientChoice) => setPreferences((current) => ({ ...current, sound: next })),
    setVolume: (next: number) => setPreferences((current) => ({ ...current, volume: next })),
    resume,
  };
}
