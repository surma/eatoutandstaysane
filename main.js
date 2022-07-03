/*
   Copyright 2022 Surma <surma@surma.dev>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerURL from "pdfjs-dist/build/pdf.worker.js?url";

import "./foods.js";

import { RingBuffer } from "./ringbuffer.js";

import { fadeOut, fromTop, fadeIn } from "./animation.js";

GlobalWorkerOptions.workerSrc = pdfWorkerURL;

const { canvases, file, log, header, spinner, issue } = document.all;

const FACTOR = 3;

async function canvasToPNG(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function caloryDetect(str) {
  const regexp = /[^\s]*\s*k?cals?([^\w]|$)/gi;
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
  await fadeOut(ev.target.parentNode, { remove: true });
  header.style.display = "flex";
  issue.style.display = "block";
  fromTop(header, { padding: "1rem" });
  fadeIn(issue);
  spinner.classList.add("spinning");
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
      const ringbuf = new RingBuffer(10);
      const blurs = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const { items } = value;
        for (const item of items) {
          ringbuf.push(item);
          const fullStr = [...ringbuf.values()]
            .map((item) => item.str)
            .join("");
          for (const match of caloryDetect(fullStr)) {
            let i = 0;
            let startIndex, endIndex;
            let startOffset, endOffset;
            const it = ringbuf.entries();
            for (const [idx, item] of it) {
              if (i + item.str.length > match.index) {
                startIndex = idx;
                startOffset = match.index - i;
                if (i + item.str.length >= match.index + match.str.length) {
                  endIndex = idx;
                  endOffset = match.index + match.str.length - i;
                }
                i += item.str.length;
                break;
              }
              i += item.str.length;
            }
            for (const [idx, item] of it) {
              if (i + item.str.length >= match.index + match.str.length) {
                endIndex = idx;
                endOffset =
                  item.str.length - (match.index + match.str.length - i);
                break;
              }
              i += item.str.length;
            }
            const startItem = ringbuf.at(startIndex);
            const endItem = ringbuf.at(endIndex);
            blurs.push({
              startItem,
              endItem,
              startOffset,
              endOffset,
            });
            ringbuf.clear();
          }
        }
      }

      for (const { startItem, endItem, startOffset, endOffset } of blurs) {
        const bbo = blurBox(startItem, startOffset, endItem, endOffset);
        const rect = [
          FACTOR * bbo.x,
          FACTOR * (height - bbo.y),
          FACTOR * bbo.width,
          -FACTOR * bbo.height,
        ];
        ctx.save();
        if ("filter" in ctx) {
          ctx.filter = `blur(${(FACTOR * bbo.height) / 4}px)`;
          let region = new Path2D();
          region.rect(...rect);
          ctx.clip(region, "nonzero");
          ctx.drawImage(rawBitmap, 0, 0);
        } else {
          ctx.fillStyle = "white";
          ctx.fillRect(...rect);
        }
        ctx.restore();
      }

      const pngBlob = await canvasToPNG(ctx.canvas);
      const pngURL = URL.createObjectURL(pngBlob);
      const img = globalThis.document.createElement("img");
      img.src = pngURL;
      canvases.append(img);
      fadeIn(img);
    }
    spinner.classList.remove("spinning");
  } catch (e) {
    log.innerHTML = `Error: ${e.message}`;
  }
}

file.addEventListener("change", onFileSelect);

function blurBox(startItem, startOffset, endItem, endOffset) {
  if (startItem === endItem) {
    return {
      x:
        startItem.transform[4] +
        (startOffset / startItem.str.length) * startItem.width,
      y: startItem.transform[5],
      width:
        (startItem.width * (endOffset - startOffset)) / startItem.str.length,
      height: startItem.height,
    };
  }
  const r1 = {
    x:
      startItem.transform[4] +
      (startOffset / startItem.str.length) * startItem.width,
    y: startItem.transform[5],
    width: startItem.width * (1 - startOffset / startItem.str.length),
    height: startItem.height,
  };
  const r2 = {
    x: endItem.transform[4] + (endOffset / endItem.str.length) * endItem.width,
    y: endItem.transform[5],
    width: endItem.width * (1 - endOffset / endItem.str.length),
    height: endItem.height,
  };
  return boundingBox(r1, r2);
}

function boundingBox(r1, r2) {
  const xmin1 = r1.x;
  const xmax1 = r1.x + r1.width;
  const ymin1 = r1.y;
  const ymax1 = r1.y + r1.height;
  const xmin2 = r2.x;
  const xmax2 = r2.x + r2.width;
  const ymin2 = r2.y;
  const ymax2 = r2.y + r2.height;

  const x = Math.min(xmin1, xmin2);
  const y = Math.min(ymin1, ymin2);
  const xmax = Math.max(xmax1, xmax2);
  const ymax = Math.max(ymax1, ymax2);
  const width = xmax - x;
  const height = ymax - y;
  return { x, y, width, height };
}
