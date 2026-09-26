import { trpc } from "@/lib/trpc";
import { Loader2, Mic, Pause, Play, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "./nodes";

const MAX_SECONDS = 600;

type Phase = "idle" | "requesting" | "recording" | "paused" | "transcribing" | "error" | "dictating";

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(type)) return type;
  return "";
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });

type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  const scope = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

/**
 * 🎙️ Ses → metin. Kayıt tarayıcıda (MediaRecorder) yapılır, bitince sunucudaki
 * ses → metin sağlayıcısına (Türkçe) gönderilir. Hata olursa kayıt kaybolmaz,
 * "Tekrar dene" aynı kaydı yeniden gönderir. Sunucu servisi kapalıysa ve tarayıcı
 * destekliyorsa tarayıcının kendi Türkçe dikte özelliğine geçilebilir.
 */
export default function VoiceRecorder({ onDone, onClose }: { onDone: (result: { text: string; attachmentId: number | null; durationSec: number }) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [keepAudio, setKeepAudio] = useState(true);
  const [serviceDown, setServiceDown] = useState(false);
  const [dictation, setDictation] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const cancelled = useRef(false);
  const transcribe = trpc.notes.transcribe.useMutation();

  const stopTracks = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; };
  useEffect(() => () => { cancelled.current = true; recorder.current?.state !== "inactive" && recorder.current?.stop(); stopTracks(); recognition.current?.stop(); }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value + 1 >= MAX_SECONDS) recorder.current?.stop();
      return value + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const send = async () => {
    if (!blob.current) return;
    setPhase("transcribing");
    setError("");
    try {
      const dataUrl = await blobToDataUrl(blob.current);
      const result = await transcribe.mutateAsync({ dataUrl, durationSec: seconds, keepAudio });
      onDone(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setServiceDown(/yapılandırılmamış|kapalı/.test(message));
      setError(/fetch|network/i.test(message) ? "Sunucuya ulaşılamadı. İnternet gelince \"Tekrar dene\"ye bas; kaydın kaybolmadı." : message || "Ses metne çevrilemedi.");
      setPhase("error");
    }
  };

  const start = async () => {
    setError("");
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) { setError("Tarayıcın ses kaydını desteklemiyor."); setPhase("error"); return; }
    // İzin penceresi açıkken ekran boş kalmasın.
    setPhase("requesting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Mikrofon izni verilmedi. Tarayıcı ayarlarından bu site için mikrofona izin verip tekrar dener misin?");
      setPhase("error");
      return;
    }
    chunks.current = [];
    const media = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
    media.onstop = () => {
      stopTracks();
      if (cancelled.current) return;
      blob.current = new Blob(chunks.current, { type: (media.mimeType || mimeType || "audio/webm").split(";")[0] });
      void send();
    };
    recorder.current = media;
    media.start(1000);
    setSeconds(0);
    setPhase("recording");
  };

  const pause = () => { recorder.current?.pause(); setPhase("paused"); };
  const resume = () => { recorder.current?.resume(); setPhase("recording"); };
  const finish = () => { if (seconds < 1) return; recorder.current?.stop(); };
  const cancel = () => { cancelled.current = true; if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop(); stopTracks(); recognition.current?.stop(); onClose(); };

  const startDictation = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const instance = new Recognition();
    instance.lang = "tr-TR";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => setDictation(Array.from(event.results).map((result) => result[0].transcript).join(" "));
    instance.onerror = () => setError("Tarayıcı dikte özelliği çalışmadı.");
    instance.onend = () => setPhase((current) => (current === "dictating" ? "error" : current));
    recognition.current = instance;
    setDictation("");
    setError("");
    setPhase("dictating");
    instance.start();
  };

  const recording = phase === "recording" || phase === "paused";

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && phase === "idle" && onClose()}>
      <div className="modal-card max-w-[420px] text-center">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[#1f2333]">🎙️ Sesli not</div>
          <button onClick={cancel} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kaydı iptal et ve kapat"><X size={16} /></button>
        </div>

        {phase === "idle" && (
          <div className="py-6">
            <button onClick={start} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#d95d4d] text-white shadow-lg transition hover:scale-105" aria-label="Kayda başla"><Mic size={32} /></button>
            <p className="mt-4 text-[12px] leading-5 text-[#6d7390]">Dokun ve konuş. Bitirince sesin Türkçe metne çevrilip notuna eklenecek; düzenleyebilirsin.</p>
            <label className="mt-3 inline-flex items-center gap-2 text-[11px] text-[#545661]"><input type="checkbox" checked={keepAudio} onChange={(event) => setKeepAudio(event.target.checked)} className="accent-[#3b5ccc]" /> Ses kaydını da nota ekle</label>
          </div>
        )}

        {recording && (
          <div className="py-6" aria-live="polite">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${phase === "recording" ? "animate-pulse bg-[#d95d4d]" : "bg-[#8b8c95]"} text-white`}><Mic size={30} /></div>
            <div className="mt-3 font-mono text-[22px] font-semibold text-[#1f2333]">{formatDuration(seconds)}</div>
            <div className="text-[12px] text-[#6d7390]">{phase === "recording" ? "Kayıt yapılıyor…" : "Duraklatıldı"}</div>
            <div className="mt-5 flex justify-center gap-2">
              {phase === "recording"
                ? <button onClick={pause} className="flex h-11 items-center gap-1.5 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#343643]"><Pause size={15} /> Duraklat</button>
                : <button onClick={resume} className="flex h-11 items-center gap-1.5 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#343643]"><Play size={15} /> Devam et</button>}
              <button onClick={finish} disabled={seconds < 1} className="flex h-11 items-center gap-1.5 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-40"><Square size={14} /> Bitir</button>
            </div>
            <button onClick={cancel} className="mt-3 text-[11px] font-semibold text-[#8b8c95]">Kaydı iptal et</button>
          </div>
        )}

        {phase === "requesting" && (
          <div className="py-10" aria-live="polite">
            <Loader2 className="mx-auto animate-spin text-[#d95d4d]" size={26} />
            <p className="mt-3 text-[13px] font-semibold text-[#1f2333]">Mikrofon izni bekleniyor…</p>
            <p className="mt-1 text-[12px] text-[#8b8c95]">Tarayıcının sorduğu izne "İzin ver" de.</p>
          </div>
        )}

        {phase === "transcribing" && (
          <div className="py-10" aria-live="polite">
            <Loader2 className="mx-auto animate-spin text-[#3b5ccc]" size={28} />
            <p className="mt-3 text-[13px] font-semibold text-[#1f2333]">Notuna dönüştürülüyor…</p>
          </div>
        )}

        {phase === "dictating" && (
          <div className="py-4 text-left">
            <div className="text-center text-[12px] text-[#6d7390]">Tarayıcı diktesi açık — konuş, metin aşağıda belirir.</div>
            <div className="mt-3 min-h-[80px] rounded-xl bg-[#f7f5ef] p-3 text-[13px] text-[#1f2333]">{dictation || "…"}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { recognition.current?.stop(); setPhase("idle"); }} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
              <button onClick={() => { recognition.current?.stop(); if (dictation.trim()) onDone({ text: dictation.trim(), attachmentId: null, durationSec: 0 }); }} disabled={!dictation.trim()} className="h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-40">Nota ekle</button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="py-5">
            <p role="alert" className="rounded-xl bg-[#fff0ed] p-3 text-[12px] font-medium text-[#d95d4d]">{error || "Bir sorun oluştu."}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {blob.current && !serviceDown && <button onClick={() => void send()} className="h-10 rounded-xl bg-[#3b5ccc] px-4 text-[12px] font-semibold text-white">Tekrar dene</button>}
              <button onClick={() => { blob.current = null; cancelled.current = false; setPhase("idle"); }} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#545661]">Yeni kayıt</button>
              {serviceDown && getSpeechRecognition() && <button onClick={startDictation} className="h-10 rounded-xl border border-[#3b5ccc]/25 px-4 text-[12px] font-semibold text-[#3b5ccc]">Tarayıcı ile yazıya dök</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
