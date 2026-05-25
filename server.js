import express from "express";
import { Canvas, loadImage, FontLibrary } from "skia-canvas";

const app = express();
app.use(express.json());

const WIDTH = 1086;
const HEIGHT = 1448;

const BG_URL = "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/file_00000000a9f47208a295c9c984f92b7a.jpeg";
const FONT_URL = "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/nokia-6000-series-medium.ttf";

let bgBuffer = null;
let fontPath = "/tmp/nokia.ttf";
let fontReady = false;

// download helper (memory only)
async function downloadBuffer(url) {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

// init assets (NO folder)
async function init() {
  if (fontReady) return;

  bgBuffer = await downloadBuffer(BG_URL);

  const fontBuffer = await downloadBuffer(FONT_URL);
  require("fs").writeFileSync(fontPath, fontBuffer);

  FontLibrary.use("Nokia", fontPath);

  fontReady = true;
}

function wrap(ctx, text, maxW, size) {
  ctx.font = `${size}px Nokia`;
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function generate(data) {
  await init();

  const canvas = new Canvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // bg from memory buffer
  const img = await loadImage(bgBuffer);
  ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

  // HEADER
  ctx.fillStyle = "#E8F0F0";
  ctx.font = `90px Nokia`;
  ctx.textAlign = "center";
  ctx.fillText("Ditzzx", WIDTH / 2, 200);

  // BODY
  const lines = wrap(ctx, data.text, 900, 55);

  ctx.fillStyle = "#000";
  ctx.font = `55px Nokia`;
  ctx.textAlign = "left";

  let y = 320;
  for (const l of lines) {
    ctx.fillText(l, 60, y);
    y += 85;
  }

  // INFO
  ctx.font = `45px Nokia`;
  ctx.fillText(`Dari: ${data.sender}`, 60, 1000);
  ctx.fillText(`${data.date} ${data.time}`, 60, 1080);

  return canvas.toBuffer("png");
}

app.post("/api/generate", async (req, res) => {
  try {
    const buffer = await generate(req.body);

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => {
  console.log("http://localhost:3000");
});
