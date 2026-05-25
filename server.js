import express from "express";
import path from "path";
import fs from "fs";
import { Canvas, loadImage, FontLibrary } from "skia-canvas";

const app = express();
app.use(express.json());

// 🔥 FRONTEND
app.use(express.static("public"));

const WIDTH = 1086;
const HEIGHT = 1448;

const BG_URL =
  "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/file_00000000a9f47208a295c9c984f92b7a.jpeg";

const FONT_URL =
  "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/nokia-6000-series-medium.ttf";

let bgBuffer = null;
let fontPath = "/tmp/nokia.ttf";
let ready = false;

// ─────────────────────────────────────────────
// ORIGINAL CONFIG (TETAP 1:1)
// ─────────────────────────────────────────────

const DEBUG = false;

const HEADER = {
  text: "Ditzzx",
  x: 543,
  y: 200,
  fontSize: 130,
  color: "#E8F0F0",
  fakeBoldOffset: 4,
  letterSpacing: "0px",
  debug: { x: 40, y: 130, w: 1006, h: 140 }
};

const PESAN = {
  text: "",
  x: 30,
  y: 300,
  fontSize: 63,
  lineHeight: 110,
  color: "#000000",
  strokeWidth: 0,
  scaleY: 1.3,
  letterSpacing: "5px",
  padding: { top: 20, bottom: 20, left: 30, right: 30 },
  debug: { x: 0, y: 280, w: 1086, h: 700 }
};

const INFO = {
  sender: "Ditzzx",
  date: "02/05/2026",
  time: "11:28",
  x: 30,
  y: 980,
  useAutoY: false,
  gap: 120,
  fontSize: 48,
  lineHeight: 80,
  color: "#000000",
  strokeWidth: 0,
  scaleY: 1.3,
  letterSpacing: "5px",
  debug: { x: 0, y: 980, w: 1086, h: 320 }
};

// ─────────────────────────────────────────────
// ASSET INIT (MEMORY ONLY)
// ─────────────────────────────────────────────

async function downloadBuffer(url) {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

async function init() {
  if (ready) return;

  bgBuffer = await downloadBuffer(BG_URL);

  const fontBuffer = await downloadBuffer(FONT_URL);
  fs.writeFileSync(fontPath, fontBuffer);

  FontLibrary.use("FontHeader", fontPath);
  FontLibrary.use("FontPesan", fontPath);
  FontLibrary.use("FontInfo", fontPath);

  ready = true;
}

// ─────────────────────────────────────────────
// ORIGINAL FUNCTIONS (UNCHANGED)
// ─────────────────────────────────────────────

function drawHeaderText(ctx, cfg) {
  ctx.fillStyle = cfg.color;
  ctx.font = `${cfg.fontSize}px FontHeader`;
  ctx.letterSpacing = cfg.letterSpacing ?? "0px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= cfg.fakeBoldOffset; i++) {
    ctx.fillText(cfg.text, cfg.x + i, cfg.y);
  }
}

function drawBodyText(ctx, text, x, y, fontName, fontSize, color, strokeWidth, scaleY, letterSpacing) {
  ctx.save();

  if (scaleY !== 1.0) {
    ctx.translate(x, y);
    ctx.scale(1, scaleY);
    ctx.translate(-x, -y);
  }

  ctx.font = `${fontSize}px ${fontName}`;
  ctx.letterSpacing = letterSpacing;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

function wrapLine(ctx, text, maxW, fontSize, fontName, letterSpacing) {
  ctx.font = `${fontSize}px ${fontName}`;
  ctx.letterSpacing = letterSpacing;

  const words = text.split(" ");
  const wrapped = [];
  let current = "";

  for (const w of words) {
    const test = current ? current + " " + w : w;

    if (ctx.measureText(test).width > maxW && current) {
      wrapped.push(current);
      current = w;
    } else {
      current = test;
    }
  }

  if (current) wrapped.push(current);
  return wrapped;
}

function getFitFontSize(ctx, lines, cfg, maxH) {
  const pad = cfg.padding;
  const maxW = cfg.debug.w - pad.left - pad.right;

  let fontSize = cfg.fontSize;

  while (fontSize > 10) {
    const lineH = fontSize * (cfg.lineHeight / cfg.fontSize);

    const all = lines.flatMap(line =>
      wrapLine(ctx, line, maxW, fontSize, "FontPesan", cfg.letterSpacing)
    );

    const totalH = all.length * lineH;

    if (totalH <= maxH) break;
    fontSize--;
  }

  return fontSize;
}

// ─────────────────────────────────────────────
// GENERATOR (FULL SCRAPER LOGIC)
// ─────────────────────────────────────────────

async function generateImage(data) {
  await init();

  const canvas = new Canvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  // HEADER
  drawHeaderText(ctx, HEADER);

  // PESAN
  PESAN.text = data.text || "";

  const rawLines = PESAN.text.split("\n");
  const maxW = PESAN.debug.w - PESAN.padding.left - PESAN.padding.right;
  const textX = PESAN.debug.x + PESAN.padding.left;
  const textY = PESAN.debug.y + PESAN.padding.top;

  const maxH = INFO.y - textY - PESAN.padding.bottom;

  const fitFontSize = getFitFontSize(ctx, rawLines, PESAN, maxH);
  const fitLineHeight = fitFontSize * (PESAN.lineHeight / PESAN.fontSize);

  const wrappedLines = rawLines.flatMap(line =>
    wrapLine(ctx, line, maxW, fitFontSize, "FontPesan", PESAN.letterSpacing)
  );

  wrappedLines.forEach((line, i) => {
    drawBodyText(
      ctx,
      line,
      textX,
      textY + i * fitLineHeight,
      "FontPesan",
      fitFontSize,
      PESAN.color,
      PESAN.strokeWidth,
      PESAN.scaleY,
      PESAN.letterSpacing
    );
  });

  // INFO
  const infoY = INFO.y;

  const infoLines = ["Dari:", data.sender || "-", data.date || "", data.time || ""];

  infoLines.forEach((line, i) => {
    drawBodyText(
      ctx,
      line,
      INFO.x,
      infoY + i * INFO.lineHeight,
      "FontInfo",
      INFO.fontSize,
      INFO.color,
      INFO.strokeWidth,
      INFO.scaleY,
      INFO.letterSpacing
    );
  });

  return canvas.toBuffer("png");
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

app.post("/api/generate", async (req, res) => {
  try {
    const buffer = await generateImage(req.body);

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ROOT → frontend
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

app.listen(3000, () => {
  console.log("🚀 http://localhost:3000");
});
