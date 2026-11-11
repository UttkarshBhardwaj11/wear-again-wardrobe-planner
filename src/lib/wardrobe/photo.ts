import { nearestSwatch } from "./colors";

/** Resize a picked photo to a compact JPEG data URL and guess its main colour. */
export async function processPhoto(file: File, maxSide = 900): Promise<{ dataUrl: string; color: string }> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That file doesn't look like a photo."));
    el.src = src;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: src, color: "Ivory" };
  ctx.drawImage(img, 0, 0, w, h);

  // Sample the centre of the frame, where the garment usually sits.
  const sx = Math.round(w * 0.3);
  const sy = Math.round(h * 0.3);
  const sw = Math.max(1, Math.round(w * 0.4));
  const sh = Math.max(1, Math.round(h * 0.4));
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  const color = n ? nearestSwatch(r / n, g / n, b / n).name : "Ivory";
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), color };
}
