import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerURL from "pdfjs-dist/build/pdf.worker.js?url";

GlobalWorkerOptions.workerSrc = pdfWorkerURL;

const { canvases, file, log } = document.all;

const FACTOR = 3;

function decalorify(str) {
  return str.replace(/[^\s]*\s*k?cals?[^\w]/i, "");
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvases.append(canvas);
  canvas.classList.add("page");
  canvas.width = width * FACTOR;
  canvas.height = height * FACTOR;
  const ctx = canvas.getContext("2d");
  ctx.scale(FACTOR, FACTOR);
  return ctx;
}

async function onFileSelect(ev) {
  const file = ev.target?.files?.[0];
  if (!file) return;
  try {
    const data = await new Response(file).arrayBuffer();
    const document = await getDocument({ data }).promise;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      let [x, y, width, height] = page.view;
      width -= x;
      height -= y;
      const ctx = createCanvas(width, height);
      const textStream = page.streamTextContent();
      const reader = textStream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const { items, styles } = value;
        for (const item of items) {
          ctx.font = `${item.height}px sans-serif`;
          const str = decalorify(item.str);
          ctx.fillText(str, item.transform[4], height - item.transform[5]);
        }
      }
    }
  } catch (e) {
    log.innerHTML = `Error: ${e.message}`;
  }
}

file.addEventListener("change", onFileSelect);
