// Defter eklerinin küçük yardımcıları. nodes.tsx'ten ayrı tutulur: o dosya editörü (tiptap,
// KaTeX) içe aktarır; bu yardımcıları kullanan liste/soru bileşenleri editörü yüklemesin.

export const attachmentUrl = (id: number) => `/api/notes/attachments/${id}`;

export const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
