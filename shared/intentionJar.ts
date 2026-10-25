/**
 * Niyet Kavanozum: öğrencinin kendine verdiği sözlerin sembolü. "Okunmuş pirinç" anlatısından yalnızca
 * sembolik olarak esinlenir; pirincin bir gücü olduğu iddia edilmez. Kavanoz, öğrencinin sözünü her akşam
 * hatırlamasının görsel kaydıdır: günde en fazla bir tane, taneler hiç kaybolmaz, atlanan güne ceza yok.
 */

export const AFFIRMATION_MIN = 8;
export const AFFIRMATION_MAX = 200;

/** Hazır olumlu sözler (yaş ve sınavdan bağımsız, kıyas ve "kesin başarı" vaadi içermez). */
export const PRESET_AFFIRMATIONS: Array<{ key: string; text: string }> = [
  { key: "gelisiyorum", text: "Her gün biraz daha gelişiyor ve hedefime yaklaşıyorum." },
  { key: "adim-adim", text: "Büyük hedefime küçük ama kararlı adımlarla ilerliyorum." },
  { key: "hata-ogretir", text: "Yanlışlarım bana neyi çalışacağımı gösteriyor; onlardan öğreniyorum." },
  { key: "emek", text: "Bugün verdiğim emek yarınki bana bir hediye." },
  { key: "sakin", text: "Sakin bir zihinle çalışıyor, sınavda bildiklerimi gösteriyorum." },
  { key: "kendimle", text: "Kendimi başkalarıyla değil, dünkü hâlimle karşılaştırıyorum." },
  { key: "dinlenme", text: "Dinlenmek de çalışmanın bir parçası; kendime iyi bakıyorum." },
  { key: "sabir", text: "Zor konular zamanla kolaylaşıyor; sabırla tekrar ediyorum." },
  { key: "odak", text: "Çalışırken tek bir işe odaklanıyor, dikkatimi koruyorum." },
  { key: "yapabilirim", text: "Bir konuyu anlamadığımda yardım istiyor ve yeniden deniyorum." },
  { key: "tesekkur", text: "Bugün öğrendiğim her şey için kendime teşekkür ediyorum." },
  { key: "hedef", text: "Hedefimi hatırlıyor, ona bugün bir adım daha yaklaşıyorum." },
];

/**
 * Karşılaştırma için: büyük/küçük harf, noktalama ve fazla boşluk önemsiz. ı/i ve şapkalı harfler eşit sayılır:
 * Türkçe olmayan klavyede ya da Caps Lock'la "BIRAZ" yazan öğrenci de sözünü tekrarlamış olur.
 */
export const normalizeAffirmation = (text: string) =>
  text.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u").replace(/[^0-9a-zçğöşü]+/g, " ").trim();

/** Öğrencinin akşam tekrarı aktif sözle aynı mı (yazım farkları, noktalama ve büyük harf önemsiz). */
export const matchesAffirmation = (typed: string, active: string) => normalizeAffirmation(typed) === normalizeAffirmation(active) && normalizeAffirmation(active).length > 0;

/** Bir kavanoz bu kadar taneyle dolar; dolunca yeni kavanoza geçilir, dolu kavanozlar rafta durur. */
export const JAR_CAPACITY = 365;

export function jarView(totalGrains: number) {
  const total = Math.max(0, Math.floor(totalGrains));
  const fullJars = Math.floor(total / JAR_CAPACITY);
  const inCurrent = total - fullJars * JAR_CAPACITY;
  return { total, fullJars, inCurrent, fillRatio: inCurrent / JAR_CAPACITY };
}

/**
 * i'inci tanenin kavanoz içindeki yeri (0–1 arası x, y; y=0 dip). Deterministik: aynı tane her açılışta aynı
 * yerde durur. Taneler dipten başlayıp hafif dağınık sıralar hâlinde birikir.
 */
export function grainPosition(index: number): { x: number; y: number; rotate: number } {
  const perRow = 19;
  const row = Math.floor(index / perRow);
  // Sıra ortadan iki yana dolar: ilk taneler dibin ortasına düşer.
  const slot = index % perRow;
  const offset = Math.ceil(slot / 2) * (slot % 2 ? -1 : 1);
  const col = Math.floor(perRow / 2) + offset;
  const rand = (seed: number) => { const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); };
  const x = (col + 0.5 + (rand(index) - 0.5) * 0.7 + (row % 2 ? 0.5 : 0)) / (perRow + 0.5);
  const y = (row + 0.5 + (rand(index + 7) - 0.5) * 0.5) / Math.ceil(JAR_CAPACITY / perRow);
  return { x: Math.min(0.97, Math.max(0.03, x)), y: Math.min(0.99, y), rotate: Math.round(rand(index + 3) * 180) };
}
