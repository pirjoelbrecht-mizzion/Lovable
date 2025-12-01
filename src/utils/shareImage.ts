// Turn an element into a PNG (best for simple layouts, dark theme looks nice)
export async function saveElementAsPng(elementId: string, filename = "share.png") {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);
  const rect = el.getBoundingClientRect();
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);

  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(el);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <foreignObject x="0" y="0" width="${w}" height="${h}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;">
      ${html}
    </div>
  </foreignObject>
</svg>`.trim();

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--bg") || "#0b0b0c";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);

  URL.revokeObjectURL(url);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}
How to use (Planner example):
Ensure your planner’s main wrapper has an id, e.g. <section id="planner-root" className="card">…



