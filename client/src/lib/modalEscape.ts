// Uygulamanın kendi pencereleri (.modal-backdrop) arka plana tıklayınca kapanır; her biri kendi
// koşulunu (kayıt sürerken kapanmama gibi) orada denetler. Escape de aynı yoldan gider: en üstteki
// pencerenin arka planına tıklanmış gibi davranılır. Arka planla kapanmayan pencere Escape'le de kapanmaz.
// Radix pencereleri/açılır menüleri Escape'i kendileri yönettiği için onlar açıkken karışılmaz.

const radixLayerOpen = () => document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]') !== null;

export function topmostBackdrop(backdrops: HTMLElement[], zIndexOf: (element: HTMLElement) => number) {
  let top: HTMLElement | null = null;
  let topZ = -Infinity;
  // Eşit katmanda DOM'da sonra gelen üsttedir.
  for (const element of backdrops) {
    const z = zIndexOf(element);
    if (z >= topZ) { top = element; topZ = z; }
  }
  return top;
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
    const backdrops = Array.from(document.querySelectorAll<HTMLElement>(".modal-backdrop"));
    if (!backdrops.length || radixLayerOpen()) return;
    const top = topmostBackdrop(backdrops, (element) => Number.parseInt(getComputedStyle(element).zIndex, 10) || 0);
    if (!top) return;
    event.preventDefault();
    top.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  });
}
