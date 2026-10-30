import * as THREE from "three";

// Reel strip, top to bottom as it passes the payline.
// Both neighbours of the first 7 are blanks, so a near miss shows a 7 hovering over an empty line.
export const STOPS = ["7", "BLANK", "CHERRY", "BAR", "BLANK", "BELL", "7", "BLANK", "BAR", "BLANK", "CHERRY", "BLANK"] as const;

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const drawSymbol = (ctx: CanvasRenderingContext2D, symbol: (typeof STOPS)[number]) => {
  ctx.lineJoin = "round";
  if (symbol === "7") {
    ctx.font = `900 150px ${BLOCK_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 14;
    ctx.strokeStyle = INK;
    ctx.strokeText("7", 0, 6);
    ctx.fillStyle = "#e3262f";
    ctx.fillText("7", 0, 6);
  } else if (symbol === "BAR") {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(-78, -34, 156, 68, 12);
    ctx.fill();
    ctx.font = `900 50px ${BLOCK_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fbf3dc";
    ctx.fillText("BAR", 0, 3);
  } else if (symbol === "CHERRY") {
    ctx.strokeStyle = "#2f8a3a";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-26, 18);
    ctx.quadraticCurveTo(-10, -40, 22, -56);
    ctx.moveTo(28, 22);
    ctx.quadraticCurveTo(26, -20, 22, -56);
    ctx.stroke();
    for (const [x, y] of [
      [-30, 30],
      [30, 34],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fillStyle = "#d7192a";
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 10, y - 10, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffffaa";
      ctx.fill();
    }
  } else if (symbol === "BELL") {
    ctx.beginPath();
    ctx.moveTo(-50, 40);
    ctx.quadraticCurveTo(-44, -54, 0, -58);
    ctx.quadraticCurveTo(44, -54, 50, 40);
    ctx.closePath();
    ctx.fillStyle = "#f2b630";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 48, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
};

// The cylinder's UV wraps around its circumference; once the reel is laid on its side,
// canvas +x reads as screen-down and canvas -y as screen-right, so each symbol is drawn
// rotated -90 degrees to appear upright.
export const makeReelTexture = () => {
  const W = 2048;
  const H = 240;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#fbf3dc";
  ctx.fillRect(0, 0, W, H);
  const cell = W / STOPS.length;
  STOPS.forEach((symbol, i) => {
    ctx.save();
    ctx.translate(cell * (i + 0.5), H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(0.62, 0.62);
    drawSymbol(ctx, symbol);
    ctx.restore();
    // faint divider between stops
    ctx.fillStyle = "#e8dcbc";
    ctx.fillRect(cell * i, 0, 3, H);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

export const makeSignTexture = (text: string) => {
  const [c, ctx] = canvas(1024, 420);
  const g = ctx.createRadialGradient(512, 230, 40, 512, 230, 560);
  g.addColorStop(0, "#ff7a1a");
  g.addColorStop(1, "#b5121b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 420);
  // sunburst rays
  ctx.save();
  ctx.translate(512, 260);
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.fillStyle = i % 2 ? "#ffffff14" : "#00000010";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-90, -700);
    ctx.lineTo(90, -700);
    ctx.fill();
  }
  ctx.restore();
  ctx.font = `900 190px ${BLOCK_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 30;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 512, 220);
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(text, 512, 220);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const makeCarpetTexture = () => {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#4a0f17";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#c8902e";
  ctx.lineWidth = 6;
  for (const [x, y] of [
    [128, 128],
    [384, 384],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 30, Math.PI, Math.PI * 2.4);
    ctx.stroke();
  }
  ctx.fillStyle = "#1d6f78";
  for (const [x, y] of [
    [384, 128],
    [128, 384],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x + 34, y);
    ctx.lineTo(x, y + 34);
    ctx.lineTo(x - 34, y);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  return t;
};

const DIGITAL_FONT = "Courier New, monospace";

const finish = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// Red seven-segment style counter on a black panel.
export const makeDisplayTexture = (label: string, value: string) => {
  const [c, ctx] = canvas(720, 200);
  ctx.fillStyle = "#120606";
  ctx.fillRect(0, 0, 720, 200);
  ctx.fillStyle = "#ffcc33";
  ctx.font = `900 40px ${BLOCK_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(label, 28, 52);
  ctx.font = `bold 120px ${DIGITAL_FONT}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff3b30";
  ctx.shadowColor = "#ff3b30";
  ctx.shadowBlur = 18;
  ctx.fillText(value, 690, 128);
  return finish(c);
};

export const makeBillTexture = () => {
  const [c, ctx] = canvas(512, 224);
  ctx.fillStyle = "#cfe8c4";
  ctx.fillRect(0, 0, 512, 224);
  ctx.strokeStyle = "#2f7a3a";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 488, 200);
  ctx.beginPath();
  ctx.ellipse(256, 112, 62, 74, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#9fd08f";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2f7a3a";
  ctx.font = `900 64px ${BLOCK_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("100", 34, 66);
  ctx.textAlign = "right";
  ctx.fillText("100", 478, 160);
  return finish(c);
};

export const makeLabelTexture = (text: string, fg: string, bg: string, w = 512, h = 160, size = 84) => {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `900 ${size}px ${BLOCK_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 4);
  return finish(c);
};

// The virtual reel: 64 rows the chip picks from. One jackpot row, flanked by twelve blanks.
export const VIRTUAL_ROWS = 64;
export const JACKPOT_ROW = 29;
export const NEAR_MISS_ROWS = [28, 30, 27, 31, 26, 32, 25, 33, 24, 34, 23, 35]; // stamped in this order
const FILLER: (typeof STOPS)[number][] = ["CHERRY", "BLANK", "BAR", "BLANK", "BELL", "BLANK", "BAR", "CHERRY", "BLANK"];
export const STRIP = { width: 1024, header: 360, rowH: 88 };
export const STRIP_HEIGHT_PX = STRIP.header + VIRTUAL_ROWS * STRIP.rowH;

export const virtualSymbol = (row: number): (typeof STOPS)[number] => {
  if (row === JACKPOT_ROW) return "7";
  if (NEAR_MISS_ROWS.includes(row)) return "BLANK";
  return FILLER[row % FILLER.length];
};

export const makeStripTexture = (stamps: number, highlight: boolean) => {
  const { width: W, header, rowH } = STRIP;
  const [c, ctx] = canvas(W, STRIP_HEIGHT_PX);
  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(0, 0, W, STRIP_HEIGHT_PX);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  ctx.font = `900 92px ${BLOCK_FONT}`;
  ctx.fillText("REEL 3", 60, 90);
  ctx.font = `900 46px ${BLOCK_FONT}`;
  ctx.fillText("YOU SEE: 12 STOPS", 60, 196);
  ctx.fillStyle = "#c8102e";
  ctx.fillText("THE CHIP SEES: 64", 60, 268);
  ctx.fillStyle = INK;
  ctx.fillRect(40, header - 20, W - 80, 6);

  const stamped = new Set(NEAR_MISS_ROWS.slice(0, stamps));
  for (let r = 0; r < VIRTUAL_ROWS; r++) {
    const y = header + r * rowH;
    const symbol = virtualSymbol(r);
    if (r === JACKPOT_ROW && highlight) {
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(40, y + 4, W - 80, rowH - 8);
    }
    ctx.fillStyle = "#8a7f6a";
    ctx.font = `bold 40px ${DIGITAL_FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(`#${r + 1}`, 60, y + rowH / 2);
    ctx.save();
    ctx.translate(250, y + rowH / 2);
    ctx.scale(0.42, 0.42);
    drawSymbol(ctx, symbol);
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.font = `900 44px ${BLOCK_FONT}`;
    ctx.fillText(symbol === "7" ? "7  JACKPOT" : symbol, 330, y + rowH / 2 + 2);
    ctx.fillStyle = "#e3d9c2";
    ctx.fillRect(40, y + rowH - 2, W - 80, 2);
    if (stamped.has(r)) {
      ctx.save();
      ctx.translate(800, y + rowH / 2);
      ctx.rotate(-0.08);
      ctx.strokeStyle = "#d62828";
      ctx.lineWidth = 7;
      ctx.strokeRect(-150, -32, 300, 64);
      ctx.fillStyle = "#d62828";
      ctx.font = `900 34px ${BLOCK_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("ONE CLICK SHORT", 0, 3);
      ctx.restore();
    }
    if (r === JACKPOT_ROW && highlight) {
      ctx.fillStyle = "#c8102e";
      ctx.font = `900 50px ${BLOCK_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("x1", 820, y + rowH / 2 + 2);
    }
  }
  return finish(c);
};

// Prize wheel with one slice per virtual row; slice k is centred at canvas angle k * step.
export const makeWheelTexture = () => {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const step = (Math.PI * 2) / VIRTUAL_ROWS;
  ctx.translate(S / 2, S / 2);
  for (let k = 0; k < VIRTUAL_ROWS; k++) {
    const near = Math.abs(((k + 32) % 64) - 32) <= 6 && k !== 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, S / 2, k * step - step / 2, k * step + step / 2);
    ctx.closePath();
    ctx.fillStyle = k === 0 ? "#ffd23f" : near ? "#d62828" : k % 2 ? "#f3ead6" : "#e4d8bd";
    ctx.fill();
    if (!near || Math.abs(((k + 32) % 64) - 32) === 6) {
      ctx.strokeStyle = "#16121244";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  const label = (angle: number, text: string, color: string, size: number) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px ${BLOCK_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(S * 0.33, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  label(3.5 * step, "ONE CLICK", "#fff", 36);
  label(-3.5 * step, "ONE CLICK", "#fff", 36);
  // "SHORT" sits a line further in on each red block
  for (const a of [3.5 * step, -3.5 * step]) {
    ctx.save();
    ctx.rotate(a);
    ctx.translate(S * 0.25, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `900 38px ${BLOCK_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SHORT", 0, 0);
    ctx.restore();
  }
  label(0, "7", "#c8102e", 40);
  ctx.beginPath();
  ctx.arc(0, 0, S * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = "#3a1a1a";
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, S / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  return finish(c);
};
