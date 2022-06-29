import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerURL from "pdfjs-dist/build/pdf.worker.js?url";

GlobalWorkerOptions.workerSrc = pdfWorkerURL;

const { canvases, file, log } = document.all;

const FACTOR = 3;

async function canvasToPNG(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function caloryDetect(str) {
  const regexp = /[^\s]*\s*k?cals?[^\w]/gi;
  const matches = [];
  let match;
  while ((match = regexp.exec(str))) {
    matches.push({
      match,
      str: match[0],
      index: match.index,
    });
  }
  return matches;
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.classList.add("page");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx;
}

async function onFileSelect(ev) {
  const file = ev.target?.files?.[0];
  if (!file) return;
  ev.target.parentNode.remove();
  try {
    const ctx = createCanvas(1, 1);
    const data = await new Response(file).arrayBuffer();
    const document = await getDocument({ data }).promise;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      let [x, y, width, height] = page.view;
      const viewport = page.getViewport({ scale: FACTOR });
      width -= x;
      height -= y;
      ctx.canvas.width = width * FACTOR;
      ctx.canvas.height = height * FACTOR;
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
      const rawPNG = await canvasToPNG(ctx.canvas);
      const rawBitmap = await createImageBitmap(rawPNG);
      const textStream = page.streamTextContent();
      const reader = textStream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const { items, styles } = value;
        for (const item of items) {
          for (const match of caloryDetect(item.str)) {
            const width = (match.str.length / item.str.length) * item.width;
            const x =
              item.transform[4] + (match.index / item.str.length) * item.width;
            ctx.filter = `blur(${(FACTOR * item.height) / 4}px)`;
            ctx.save();
            let region = new Path2D();
            region.rect(
              FACTOR * x,
              FACTOR * (height - item.transform[5]),
              FACTOR * width,
              -FACTOR * item.height
            );
            ctx.clip(region, "nonzero");
            ctx.drawImage(rawBitmap, 0, 0);
            ctx.restore();
          }
        }
      }

      const pngBlob = await canvasToPNG(ctx.canvas);
      const pngURL = URL.createObjectURL(pngBlob);
      const img = globalThis.document.createElement("img");
      img.src = pngURL;
      canvases.append(img);
    }
  } catch (e) {
    log.innerHTML = `Error: ${e.message}`;
  }
}

file.addEventListener("change", onFileSelect);
