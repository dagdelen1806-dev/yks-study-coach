import { Eraser, Highlighter, PenLine, Redo2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Çizim vektör olarak saklanır (bitmap değil): her çizgi = araç + renk + kalınlık
// + nokta listesi. Küçük yer kaplar, her ekran çözünürlüğünde net görünür ve
// sonradan düzenlenebilir. Koordinatlar sabit bir mantıksal tuvalde (800x500).
export type Stroke = { tool: "pen" | "highlighter"; color: string; width: number; points: number[] };
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
const MAX_STROKES = 400;
const MAX_POINTS_PER_STROKE = 1500;

export const PEN_PRESETS = [
  { label: "Siyah kalem", tool: "pen" as const, color: "#1f2333" },
  { label: "Kırmızı kalem", tool: "pen" as const, color: "#d93b3b" },
  { label: "Mavi kalem", tool: "pen" as const, color: "#2f5fd0" },
  { label: "Yeşil kalem", tool: "pen" as const, color: "#2e8a57" },
  { label: "Sarı fosforlu", tool: "highlighter" as const, color: "#f5d90a" },
];
const WIDTHS = [2, 4, 8];

/** Bir çizgiyi SVG path'e çevirir (önizleme ve kayıtlı çizimin gösterimi için ortak). */
export function strokeToPath(stroke: Stroke): string {
  const points = stroke.points;
  if (points.length < 2) return "";
  let path = `M${points[0]} ${points[1]}`;
  for (let index = 2; index < points.length; index += 2) path += ` L${points[index]} ${points[index + 1]}`;
  return path;
}

export function StrokesSvg({ strokes, className }: { strokes: Stroke[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className={className} role="img" aria-label="El yazısı / çizim">
      {strokes.map((stroke, index) => (
        <path key={index} d={strokeToPath(stroke)} fill="none" stroke={stroke.color} strokeWidth={stroke.tool === "highlighter" ? stroke.width * 4 : stroke.width} strokeOpacity={stroke.tool === "highlighter" ? 0.35 : 1} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/**
 * Parmak/kalemle çizim: kalem, fosforlu kalem, silgi (dokunulan çizgiyi siler),
 * kalınlık, renk, geri al / yinele. Pointer Events ile fare, dokunmatik ve
 * stylus aynı şekilde çalışır.
 */
export default function DrawingEditor({ initial, onSave, onCancel }: { initial: Stroke[]; onSave: (strokes: Stroke[]) => void; onCancel: () => void }) {
  const [strokes, setStrokes] = useState<Stroke[]>(initial);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [preset, setPreset] = useState(PEN_PRESETS[0]);
  const [width, setWidth] = useState(4);
  const [eraser, setEraser] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const current = useRef<Stroke | null>(null);
  const [, force] = useState(0);

  const toCanvas = useCallback((event: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [Math.round(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH * 10) / 10, Math.round(((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT * 10) / 10];
  }, []);

  const commit = (next: Stroke[]) => { setUndoStack((stack) => [...stack.slice(-50), strokes]); setRedoStack([]); setStrokes(next); };

  const eraseAt = (x: number, y: number) => {
    const hit = strokes.findIndex((stroke) => { for (let index = 0; index < stroke.points.length; index += 2) { if (Math.hypot(stroke.points[index] - x, stroke.points[index + 1] - y) < 14) return true; } return false; });
    if (hit >= 0) commit(strokes.filter((_, index) => index !== hit));
  };

  const onDown = (event: React.PointerEvent) => {
    event.preventDefault();
    // Çizgi tuval dışına taşsa da devam etsin; bazı cihazlarda işaretçi zaten bırakılmışsa hata atar — çizimi bozmasın.
    try { (event.currentTarget as Element).setPointerCapture?.(event.pointerId); } catch {}
    const [x, y] = toCanvas(event);
    if (eraser) { eraseAt(x, y); return; }
    if (strokes.length >= MAX_STROKES) return;
    current.current = { tool: preset.tool, color: preset.color, width, points: [x, y] };
    force((value) => value + 1);
  };
  const onMove = (event: React.PointerEvent) => {
    if (eraser && event.buttons) { const [x, y] = toCanvas(event); eraseAt(x, y); return; }
    if (!current.current || current.current.points.length >= MAX_POINTS_PER_STROKE * 2) return;
    const [x, y] = toCanvas(event);
    const points = current.current.points;
    // Çok yakın noktaları atla: gereksiz veri üretme.
    if (Math.hypot(points[points.length - 2] - x, points[points.length - 1] - y) < 1.5) return;
    points.push(x, y);
    force((value) => value + 1);
  };
  const onUp = () => {
    if (!current.current) return;
    const stroke = current.current;
    current.current = null;
    commit([...strokes, stroke.points.length === 2 ? { ...stroke, points: [...stroke.points, stroke.points[0] + 0.5, stroke.points[1] + 0.5] } : stroke]);
  };

  const undo = () => { if (!undoStack.length) return; setRedoStack((stack) => [...stack, strokes]); setStrokes(undoStack[undoStack.length - 1]); setUndoStack((stack) => stack.slice(0, -1)); };
  const redo = () => { if (!redoStack.length) return; setUndoStack((stack) => [...stack, strokes]); setStrokes(redoStack[redoStack.length - 1]); setRedoStack((stack) => stack.slice(0, -1)); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const visible = current.current ? [...strokes, current.current] : strokes;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="modal-card max-w-[860px] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[15px] font-semibold text-[#1f2333]">🖊 Kalemle yaz / çiz</div>
          <button onClick={onCancel} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PEN_PRESETS.map((item) => (
            <button key={item.label} onClick={() => { setPreset(item); setEraser(false); }} aria-label={item.label} aria-pressed={!eraser && preset.label === item.label} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${!eraser && preset.label === item.label ? "border-[#1f2333] ring-2 ring-[#1f2333]/15" : "border-[#1f2333]/10"}`}>
              {item.tool === "highlighter" ? <Highlighter size={16} color="#a67c00" /> : <PenLine size={16} color={item.color} />}
            </button>
          ))}
          <button onClick={() => setEraser((value) => !value)} aria-label="Silgi" aria-pressed={eraser} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${eraser ? "border-[#1f2333] ring-2 ring-[#1f2333]/15" : "border-[#1f2333]/10"}`}><Eraser size={16} /></button>
          <span className="mx-1 h-6 w-px bg-[#1f2333]/10" />
          {WIDTHS.map((value) => <button key={value} onClick={() => setWidth(value)} aria-label={`Kalınlık ${value}`} aria-pressed={width === value} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${width === value ? "border-[#3b5ccc]" : "border-[#1f2333]/10"}`}><span className="rounded-full bg-[#1f2333]" style={{ width: value + 2, height: value + 2 }} /></button>)}
          <span className="mx-1 h-6 w-px bg-[#1f2333]/10" />
          <button onClick={undo} disabled={!undoStack.length} aria-label="Geri al" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1f2333]/10 disabled:opacity-30"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={!redoStack.length} aria-label="Yinele" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1f2333]/10 disabled:opacity-30"><Redo2 size={16} /></button>
          <button onClick={() => commit([])} disabled={!strokes.length} className="ml-auto h-10 rounded-xl px-3 text-[11px] font-semibold text-[#d95d4d] disabled:opacity-30">Temizle</button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="mt-3 w-full touch-none select-none rounded-2xl border border-[#1f2333]/10 bg-white"
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`, cursor: eraser ? "cell" : "crosshair" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          role="img"
          aria-label="Çizim alanı"
        >
          {visible.map((stroke, index) => <path key={index} d={strokeToPath(stroke)} fill="none" stroke={stroke.color} strokeWidth={stroke.tool === "highlighter" ? stroke.width * 4 : stroke.width} strokeOpacity={stroke.tool === "highlighter" ? 0.35 : 1} strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
          <button onClick={() => onSave(strokes)} disabled={!strokes.length} className="h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-40">Nota ekle</button>
        </div>
      </div>
    </div>
  );
}
