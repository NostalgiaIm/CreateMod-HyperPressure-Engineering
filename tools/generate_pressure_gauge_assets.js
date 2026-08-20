const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "src", "main", "resources", "assets", "hyperpressure");
const modelDir = path.join(assetRoot, "models", "block", "pressure_gauge");
const itemDir = path.join(assetRoot, "models", "item");
const blockstateDir = path.join(assetRoot, "blockstates");
const textureDir = path.join(assetRoot, "textures", "block");
const itemTextureDir = path.join(assetRoot, "textures", "item");

for (const dir of [modelDir, itemDir, blockstateDir, textureDir, itemTextureDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const stale of ["needle.json", "needle_warning.json", "needle_danger.json", "status_warning.json", "status_danger.json"]) {
  const file = path.join(modelDir, stale);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

for (const stale of ["pressure_gauge_dial_face.png", "pressure_gauge_needle_tip.png"]) {
  const file = path.join(textureDir, stale);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const colors = {
  transparent: [0, 0, 0, 0],
  black: [7, 9, 12, 255],
  white: [235, 244, 242, 255],
  dial: [210, 218, 214, 255],
  dialShade: [169, 181, 179, 255],
  gunmetal: [47, 58, 70, 255],
  gunmetalDark: [22, 29, 36, 255],
  gunmetalLight: [82, 98, 111, 255],
  cobalt: [26, 59, 92, 255],
  cobaltDark: [12, 28, 48, 255],
  cobaltLight: [48, 104, 148, 255],
  cyan: [0, 229, 255, 255],
  cyanDim: [16, 101, 136, 255],
  cyanGlass: [142, 235, 255, 72],
  green: [47, 224, 102, 255],
  greenDark: [16, 105, 59, 255],
  teal: [37, 209, 176, 255],
  yellow: [255, 215, 75, 255],
  yellowDim: [140, 94, 14, 255],
  orange: [247, 127, 34, 255],
  red: [230, 54, 47, 255],
  redDark: [116, 21, 23, 255],
  redGlass: [255, 64, 58, 95],
  brass: [191, 139, 60, 255],
  redstone: [215, 42, 37, 255],
};

function rgba(hex, alpha = 255) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

function mix(a, b, amount) {
  return [
    Math.round(a[0] * (1 - amount) + b[0] * amount),
    Math.round(a[1] * (1 - amount) + b[1] * amount),
    Math.round(a[2] * (1 - amount) + b[2] * amount),
    Math.round(a[3] * (1 - amount) + b[3] * amount),
  ];
}

function materialPixel(x, y, base, dark, light) {
  let c = base;
  if (x === 0 || y === 15) c = dark;
  if (y === 0 || x === 15) c = light;
  if (((x * 13 + y * 7) % 23) === 0) c = mix(c, light, 0.3);
  if (((x * 5 + y * 17) % 29) === 0) c = mix(c, dark, 0.25);
  return c;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    rows[rowStart] = 0;
    pixels.copy(rows, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeTexture(name, width, height, painter) {
  const pixels = Buffer.alloc(width * height * 4);
  const ctx = {
    width,
    height,
    set(x, y, color) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = (y * width + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    },
    get(x, y) {
      const i = (y * width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    },
  };
  painter(ctx);
  const png = encodePng(width, height, pixels);
  const file = path.join(textureDir, `pressure_gauge_${name}.png`);
  fs.writeFileSync(file, png);
  return {
    file,
    width,
    height,
    source: `data:image/png;base64,${png.toString("base64")}`,
  };
}

function writeItemTexture(name, width, height, painter) {
  const pixels = Buffer.alloc(width * height * 4);
  const ctx = {
    width,
    height,
    set(x, y, color) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = (y * width + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    },
    get(x, y) {
      const i = (y * width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    },
  };
  painter(ctx);
  const png = encodePng(width, height, pixels);
  const file = path.join(itemTextureDir, `${name}.png`);
  fs.writeFileSync(file, png);
  return {
    file,
    width,
    height,
    source: `data:image/png;base64,${png.toString("base64")}`,
  };
}

function writeMaterial(name, base, dark, light) {
  return writeTexture(name, 16, 16, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        ctx.set(x, y, materialPixel(x, y, base, dark, light));
      }
    }
  });
}

function drawLine(ctx, x0, y0, x1, y1, color) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    ctx.set(x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function fillCircle(ctx, cx, cy, r, color) {
  for (let y = 0; y < ctx.height; y += 1) {
    for (let x = 0; x < ctx.width; x += 1) {
      if (Math.hypot(x - cx, y - cy) <= r) ctx.set(x, y, color);
    }
  }
}

function circleOutline(ctx, cx, cy, r, color, thickness = 1) {
  for (let y = 0; y < ctx.height; y += 1) {
    for (let x = 0; x < ctx.width; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r - thickness && d <= r + 0.35) ctx.set(x, y, color);
    }
  }
}

function arcPoint(cx, cy, radius, degrees) {
  const rad = (degrees * Math.PI) / 180;
  return [
    Math.round(cx + Math.cos(rad) * radius),
    Math.round(cy - Math.sin(rad) * radius),
  ];
}

function drawArc(ctx, cx, cy, radius, startDeg, endDeg, color, thickness = 1) {
  const min = Math.min(startDeg, endDeg);
  const max = Math.max(startDeg, endDeg);
  for (let a = min; a <= max; a += 1) {
    const [x, y] = arcPoint(cx, cy, radius, a);
    for (let ox = -thickness + 1; ox < thickness; ox += 1) {
      for (let oy = -thickness + 1; oy < thickness; oy += 1) {
        ctx.set(x + ox, y + oy, color);
      }
    }
  }
}

const font = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  A: ["010", "101", "111", "101", "101"],
  E: ["111", "100", "111", "100", "111"],
  H: ["101", "101", "111", "101", "101"],
  M: ["101", "111", "111", "101", "101"],
  P: ["110", "101", "110", "100", "100"],
  T: ["111", "010", "010", "010", "010"],
};

function drawText(ctx, text, x, y, color, scale = 1) {
  let cursor = x;
  for (const char of text) {
    if (char === " ") {
      cursor += 2 * scale;
      continue;
    }
    const glyph = font[char];
    if (!glyph) {
      cursor += 4 * scale;
      continue;
    }
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] !== "1") continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            ctx.set(cursor + gx * scale + sx, y + gy * scale + sy, color);
          }
        }
      }
    }
    cursor += 4 * scale;
  }
}

const textureSources = {
  gunmetal: writeMaterial("gunmetal", colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight),
  dark_metal: writeMaterial("dark_metal", colors.gunmetalDark, colors.black, colors.gunmetal),
  cobalt_casing: writeMaterial("cobalt_casing", colors.cobalt, colors.cobaltDark, colors.cobaltLight),
  cyan_glow: writeMaterial("cyan_glow", colors.cyanDim, rgba("#062834"), colors.cyan),
  yellow_glow: writeMaterial("yellow_glow", colors.yellowDim, rgba("#342106"), colors.yellow),
  red_glow: writeMaterial("red_glow", colors.redDark, rgba("#310709"), colors.red),
  redstone_contact: writeTexture("redstone_contact", 16, 16, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        ctx.set(x, y, materialPixel(x, y, colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight));
      }
    }
    for (let y = 5; y <= 10; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        const edge = x === 3 || x === 12 || y === 5 || y === 10;
        ctx.set(x, y, edge ? colors.redDark : colors.redstone);
      }
    }
    drawLine(ctx, 4, 7, 11, 7, colors.red);
    drawLine(ctx, 4, 8, 11, 8, mix(colors.red, colors.white, 0.25));
  }),
  bolt: writeTexture("bolt", 16, 16, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 4; y <= 11; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        if ((x === 3 || x === 12) && (y < 6 || y > 9)) continue;
        ctx.set(x, y, colors.gunmetalLight);
      }
    }
    drawLine(ctx, 5, 5, 10, 10, colors.gunmetalDark);
    ctx.set(7, 6, colors.white);
    ctx.set(8, 9, colors.gunmetalDark);
  }),
  pipe_port: writeTexture("pipe_port", 16, 16, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        ctx.set(x, y, materialPixel(x, y, colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight));
      }
    }
    fillCircle(ctx, 7.5, 7.5, 5.6, colors.gunmetalDark);
    circleOutline(ctx, 7.5, 7.5, 5.8, colors.gunmetalLight, 1);
    fillCircle(ctx, 7.5, 7.5, 3.1, rgba("#123D5D"));
    circleOutline(ctx, 7.5, 7.5, 3.3, colors.cyanDim, 1);
    drawLine(ctx, 5, 7, 10, 7, colors.cyan);
    drawLine(ctx, 5, 8, 10, 8, colors.cyanDim);
  }),
  rear_cover: writeTexture("rear_cover", 32, 32, (ctx) => {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        ctx.set(x, y, materialPixel(x % 16, y % 16, colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight));
      }
    }
    for (let y = 2; y <= 29; y += 1) {
      for (let x = 2; x <= 29; x += 1) {
        const edge = x === 2 || x === 29 || y === 2 || y === 29;
        ctx.set(x, y, edge ? colors.cobaltLight : colors.cobaltDark);
      }
    }
    for (let y = 4; y <= 27; y += 1) {
      for (let x = 4; x <= 27; x += 1) {
        const edge = x === 4 || x === 27 || y === 4 || y === 27;
        ctx.set(x, y, edge ? colors.gunmetalLight : colors.gunmetalDark);
      }
    }
    fillCircle(ctx, 15.5, 13.7, 10.4, colors.gunmetalDark);
    circleOutline(ctx, 15.5, 13.7, 10.6, colors.gunmetalLight, 2);
    circleOutline(ctx, 15.5, 13.7, 8.2, colors.gunmetal, 1);
    fillCircle(ctx, 15.5, 13.7, 5.8, rgba("#123D5D"));
    circleOutline(ctx, 15.5, 13.7, 6.1, colors.cyanDim, 1);
    drawLine(ctx, 9, 13, 22, 13, colors.cyan);
    drawLine(ctx, 9, 14, 22, 14, colors.cyanDim);
    for (let y = 27; y <= 30; y += 1) {
      for (let x = 7; x <= 24; x += 1) {
        const edge = x === 7 || x === 24 || y === 27 || y === 30;
        ctx.set(x, y, edge ? colors.redDark : colors.redstone);
      }
    }
    drawLine(ctx, 8, 28, 23, 28, colors.red);
    drawLine(ctx, 8, 29, 23, 29, mix(colors.red, colors.white, 0.22));
  }),
  bar_face: writeTexture("bar_face", 32, 32, (ctx) => {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        ctx.set(x, y, materialPixel(x % 16, y % 16, colors.gunmetalDark, colors.black, colors.gunmetal));
      }
    }
    for (let y = 3; y <= 28; y += 1) {
      for (let x = 2; x <= 29; x += 1) {
        const edge = x === 2 || x === 29 || y === 3 || y === 28;
        ctx.set(x, y, edge ? colors.cobaltLight : colors.cobalt);
      }
    }
    for (let y = 6; y <= 17; y += 1) {
      for (let x = 5; x <= 26; x += 1) {
        const edge = x === 5 || x === 26 || y === 6 || y === 17;
        ctx.set(x, y, edge ? colors.gunmetalLight : colors.gunmetalDark);
      }
    }
    const filledUntil = 21;
    for (let y = 8; y <= 15; y += 1) {
      for (let x = 7; x <= 24; x += 1) {
        if (x <= filledUntil) {
          const t = (x - 7) / 17;
          let c;
          if (t <= 0.6) c = mix(colors.green, colors.teal, t / 0.6);
          else if (t <= 0.8) c = mix(colors.yellow, colors.orange, (t - 0.6) / 0.2);
          else c = mix(colors.orange, colors.red, (t - 0.8) / 0.2);
          if (y === 8) c = mix(c, colors.white, 0.2);
          if (y === 15) c = mix(c, colors.black, 0.18);
          ctx.set(x, y, c);
        } else {
          ctx.set(x, y, ((x + y) % 2 === 0) ? rgba("#26313B") : rgba("#1D252D"));
        }
      }
    }
    for (const x of [7, 17, 21, 24]) {
      drawLine(ctx, x, 6, x, 17, x === 21 ? colors.orange : colors.gunmetalLight);
    }
    drawText(ctx, "0", 5, 22, colors.white);
    drawText(ctx, "10", 22, 22, colors.white);
    drawText(ctx, "ATM", 12, 22, colors.cyanDim);
    for (let y = 18; y <= 20; y += 1) {
      for (let x = 19; x <= 23; x += 1) {
        if (Math.abs(x - 21) + Math.abs(y - 18) <= 3) ctx.set(x, y, colors.cyan);
      }
    }
  }),
  glass: writeTexture("glass", 32, 32, (ctx) => {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 5; y <= 18; y += 1) {
      for (let x = 4; x <= 27; x += 1) {
        const edge = x === 4 || x === 27 || y === 5 || y === 18;
        ctx.set(x, y, edge ? rgba("#B9F4FF", 115) : colors.cyanGlass);
      }
    }
    drawLine(ctx, 6, 7, 15, 6, rgba("#FFFFFF", 150));
    drawLine(ctx, 7, 8, 21, 7, rgba("#C8F7FF", 115));
    drawLine(ctx, 20, 17, 26, 14, rgba("#D7FBFF", 95));
  }),
  status_warning: writeTexture("status_warning", 32, 32, (ctx) => {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 6; y <= 17; y += 1) {
      for (let x = 17; x <= 22; x += 1) ctx.set(x, y, [255, 215, 75, 70]);
    }
    drawLine(ctx, 17, 6, 17, 17, [255, 215, 75, 150]);
    drawLine(ctx, 22, 6, 22, 17, [255, 215, 75, 120]);
  }),
  status_danger: writeTexture("status_danger", 32, 32, (ctx) => {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 6; y <= 17; y += 1) {
      for (let x = 22; x <= 26; x += 1) ctx.set(x, y, colors.redGlass);
    }
    drawLine(ctx, 22, 6, 22, 17, [255, 55, 45, 180]);
    drawLine(ctx, 26, 6, 26, 17, [255, 55, 45, 150]);
  }),
  slider: writeTexture("slider", 16, 16, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 6; x <= 9; x += 1) ctx.set(x, y, colors.white);
    }
    for (let y = 5; y <= 12; y += 1) {
      const half = Math.max(0, Math.floor((12 - y) / 2));
      for (let x = 7 - half; x <= 8 + half; x += 1) ctx.set(x, y, colors.cyan);
    }
    ctx.set(7, 13, colors.cyanDim);
    ctx.set(8, 13, colors.cyanDim);
  }),
};

const textureKeys = Object.keys(textureSources);
const textureId = Object.fromEntries(textureKeys.map((key, index) => [key, index.toString()]));
const textureRefs = Object.fromEntries(
  textureKeys.map((key) => [key, `hyperpressure:block/pressure_gauge_${key}`]),
);
textureRefs.particle = "hyperpressure:block/pressure_gauge_cobalt_casing";

writeItemTexture("pressure_gauge", 16, 16, (ctx) => {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
  }
  for (let y = 2; y <= 13; y += 1) {
    for (let x = 1; x <= 14; x += 1) {
      const edge = x === 1 || x === 14 || y === 2 || y === 13;
      ctx.set(x, y, edge ? colors.cobaltLight : colors.cobaltDark);
    }
  }
  for (let y = 5; y <= 9; y += 1) {
    for (let x = 3; x <= 12; x += 1) {
      const edge = x === 3 || x === 12 || y === 5 || y === 9;
      ctx.set(x, y, edge ? colors.gunmetalLight : colors.gunmetalDark);
    }
  }
  for (let y = 6; y <= 8; y += 1) {
    for (let x = 4; x <= 10; x += 1) {
      const t = (x - 4) / 8;
      let c;
      if (t <= 0.6) c = mix(colors.green, colors.teal, t / 0.6);
      else if (t <= 0.8) c = mix(colors.yellow, colors.orange, (t - 0.6) / 0.2);
      else c = mix(colors.orange, colors.red, (t - 0.8) / 0.2);
      ctx.set(x, y, c);
    }
    for (let x = 11; x <= 11; x += 1) ctx.set(x, y, colors.gunmetalDark);
  }
  drawText(ctx, "0", 3, 11, colors.white);
  drawText(ctx, "10", 10, 11, colors.white);
  drawLine(ctx, 10, 4, 10, 10, colors.cyan);
  ctx.set(9, 4, colors.white);
  ctx.set(10, 4, colors.white);
  ctx.set(11, 4, colors.white);
});

const allElements = [];
const groups = {
  mount: [],
  shell: [],
  display: [],
  slider: [],
  slider_warning: [],
  slider_danger: [],
  status_warning: [],
  status_danger: [],
};

function uuid(seed) {
  const hex = crypto.createHash("md5").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uvFor(face, from, to) {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const w = Math.abs(tx - fx);
  const h = Math.abs(ty - fy);
  const d = Math.abs(tz - fz);
  if (face === "north" || face === "south") return [0, 0, Math.min(16, w), Math.min(16, h)];
  if (face === "east" || face === "west") return [0, 0, Math.min(16, d), Math.min(16, h)];
  return [0, 0, Math.min(16, w), Math.min(16, d)];
}

function box(name, from, to, texture, group, options = {}) {
  const faces = {};
  const faceNames = options.onlyFaces ?? ["north", "east", "south", "west", "up", "down"];
  for (const face of faceNames) {
    if (options.omit?.includes(face)) continue;
    const faceTexture = options.faceTextures?.[face] ?? texture;
    const faceUv = options.faceUv?.[face] ?? options.uv ?? uvFor(face, from, to);
    faces[face] = { uv: faceUv, texture: `#${faceTexture}` };
    if (options.faceRotation?.[face] !== undefined) faces[face].rotation = options.faceRotation[face];
  }
  const element = {
    name,
    from,
    to,
    ...(options.rotation ? { rotation: options.rotation } : {}),
    shade: options.shade ?? true,
    faces,
  };
  allElements.push(element);
  groups[group].push(allElements.length - 1);
  return element;
}

box("sealed single-piece rear cover with interface art", [1.2, 1.4, 14.45], [14.8, 14.6, 15.05], "cobalt_casing", "mount", {
  faceTextures: { south: "rear_cover" },
  faceUv: { south: [0, 0, 16, 16] },
});

for (const [name, from, to] of [
  ["left shallow cobalt panel rail", [1.1, 3.2, 10.65], [2.7, 12.8, 15.05]],
  ["right shallow cobalt panel rail", [13.3, 3.2, 10.65], [14.9, 12.8, 15.05]],
  ["top shallow cobalt panel rail", [2.4, 12.15, 10.65], [13.6, 14.05, 15.05]],
  ["bottom shallow cobalt panel rail", [2.4, 1.95, 10.65], [13.6, 3.85, 15.05]],
]) {
  box(name, from, to, "cobalt_casing", "shell");
}

box("upper left chamfered panel corner", [1.6, 11.65, 10.65], [3.35, 13.4, 15.05], "cobalt_casing", "shell", {
  rotation: { angle: 45, axis: "z", origin: [2.45, 12.5, 12.6] },
});
box("upper right chamfered panel corner", [12.65, 11.65, 10.65], [14.4, 13.4, 15.05], "cobalt_casing", "shell", {
  rotation: { angle: -45, axis: "z", origin: [13.55, 12.5, 12.6] },
});
box("lower left chamfered panel corner", [1.6, 2.6, 10.65], [3.35, 4.35, 15.05], "cobalt_casing", "shell", {
  rotation: { angle: -45, axis: "z", origin: [2.45, 3.5, 12.6] },
});
box("lower right chamfered panel corner", [12.65, 2.6, 10.65], [14.4, 4.35, 15.05], "cobalt_casing", "shell", {
  rotation: { angle: 45, axis: "z", origin: [13.55, 3.5, 12.6] },
});

for (const [name, from, to] of [
  ["inner left slim gunmetal display bevel", [2.6, 4.15, 10.25], [3.2, 11.85, 10.95]],
  ["inner right slim gunmetal display bevel", [12.8, 4.15, 10.25], [13.4, 11.85, 10.95]],
  ["inner top slim gunmetal display bevel", [3, 11.25, 10.25], [13, 11.85, 10.95]],
  ["inner bottom slim gunmetal display bevel", [3, 4.15, 10.25], [13, 4.75, 10.95]],
]) {
  box(name, from, to, "gunmetal", "shell");
}

box("horizontal pressure bar face with 0 and 10 labels", [2.8, 3.35, 10], [13.2, 12.65, 10.2], "dark_metal", "display", {
  onlyFaces: ["north"],
  faceTextures: { north: "bar_face" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});

const boltPositions = [
  [1.55, 2.35],
  [13.05, 2.35],
  [1.55, 12.25],
  [13.05, 12.25],
];
for (const [x, y] of boltPositions) {
  box("front hex socket bolt", [x, y, 9.62], [x + 1.4, y + 1.4, 10.25], "bolt", "shell", {
    faceTextures: { north: "bolt" },
    faceUv: { north: [0, 0, 16, 16] },
  });
}

function slider(group, texture, xCenter, zOffset = 0) {
  box(`${group} horizontal pressure slider marker`, [xCenter - 0.55, 9.15, 9.28 + zOffset], [xCenter + 0.55, 10.9, 9.62 + zOffset], "slider", group, {
    onlyFaces: ["north"],
    faceTextures: { north: "slider" },
    faceUv: { north: [0, 0, 16, 16] },
    shade: false,
  });
  box(`${group} vertical slider rail`, [xCenter - 0.18, 5.5, 9.34 + zOffset], [xCenter + 0.18, 10.15, 9.52 + zOffset], texture, group, {
    onlyFaces: ["north", "south", "east", "west"],
    shade: false,
  });
}

slider("slider", "cyan_glow", 9.9, 0);
slider("slider_warning", "yellow_glow", 10.95, -0.08);
slider("slider_danger", "red_glow", 12.2, -0.16);

function modelJson(indices, includeDisplay = false) {
  const json = {
    credit: "Made with Blockbench for HyperPressure Engineering",
    parent: "block/block",
    render_type: "minecraft:translucent",
    textures: textureRefs,
    elements: indices.map((index) => allElements[index]),
  };
  if (includeDisplay) {
    json.display = {
      thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.2, 0], scale: [0.38, 0.38, 0.38] },
      thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, 2.2, 0], scale: [0.38, 0.38, 0.38] },
      firstperson_righthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.43, 0.43, 0.43] },
      firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.43, 0.43, 0.43] },
      gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.8, 0.8, 0.8] },
      ground: { rotation: [0, 0, 0], translation: [0, 3, 0], scale: [0.34, 0.34, 0.34] },
      fixed: { rotation: [0, 180, 0], translation: [0, 0, 0], scale: [0.62, 0.62, 0.62] },
    };
  }
  return json;
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const bodyIndices = [...groups.mount, ...groups.shell, ...groups.display];
const fullIndices = [...bodyIndices, ...groups.slider];

writeJson(path.join(modelDir, "block.json"), modelJson(fullIndices, true));
writeJson(path.join(modelDir, "body.json"), modelJson(bodyIndices));
writeJson(path.join(modelDir, "slider.json"), modelJson(groups.slider));
writeJson(path.join(modelDir, "slider_warning.json"), modelJson(groups.slider_warning));
writeJson(path.join(modelDir, "slider_danger.json"), modelJson(groups.slider_danger));
writeJson(path.join(itemDir, "pressure_gauge.json"), {
  parent: "minecraft:item/generated",
  textures: {
    layer0: "hyperpressure:item/pressure_gauge",
  },
});
writeJson(path.join(blockstateDir, "pressure_gauge.json"), {
  variants: {
    "facing=north": { model: "hyperpressure:block/pressure_gauge/block" },
    "facing=east": { model: "hyperpressure:block/pressure_gauge/block", y: 90 },
    "facing=south": { model: "hyperpressure:block/pressure_gauge/block", y: 180 },
    "facing=west": { model: "hyperpressure:block/pressure_gauge/block", y: 270 },
    "facing=up": { model: "hyperpressure:block/pressure_gauge/block", x: 270 },
    "facing=down": { model: "hyperpressure:block/pressure_gauge/block", x: 90 },
  },
});

function bbFaces(faces) {
  return Object.fromEntries(
    Object.entries(faces).map(([face, data]) => [
      face,
      (() => {
        const textureKey = data.texture.replace("#", "");
        const texture = textureSources[textureKey];
        const scaleU = texture ? texture.width / 16 : 1;
        const scaleV = texture ? texture.height / 16 : 1;
        return {
          ...data,
          uv: data.uv.map((value, index) => value * (index % 2 === 0 ? scaleU : scaleV)),
          texture: textureId[textureKey],
        };
      })(),
    ]),
  );
}

const elementUuids = allElements.map((element, index) => uuid(`pressure-gauge-element-${index}-${element.name}`));
const bbElements = allElements.map((element, index) => ({
  ...element,
  autouv: 0,
  color: index % 8,
  locked: false,
  origin: [8, 8, 8],
  faces: bbFaces(element.faces),
  uuid: elementUuids[index],
}));

function outlinerGroup(name, origin, groupName, options = {}) {
  return {
    name,
    origin,
    uuid: uuid(`pressure-gauge-group-${groupName}`),
    export: true,
    isOpen: options.isOpen ?? true,
    locked: false,
    visibility: options.visibility ?? true,
    children: groups[groupName].map((index) => elementUuids[index]),
  };
}

const bbModel = {
  meta: {
    format_version: "4.10",
    model_format: "java_block",
    box_uv: false,
  },
  name: "pressure_gauge",
  parent: "block/block",
  ambientocclusion: true,
  front_gui_light: false,
  visible_box: [1, 1, 0],
  resolution: { width: 32, height: 32 },
  elements: bbElements,
  outliner: [
    outlinerGroup("Sealed single-piece rear cover", [8, 8, 14.75], "mount"),
    outlinerGroup("Deep cobalt rectangular shell with corner bolts", [8, 8, 12.6], "shell"),
    outlinerGroup("Single-layer horizontal pressure bar face", [8, 8, 10.1], "display"),
    outlinerGroup("Slider - cyan safe state, translate horizontally", [9.9, 8, 9.45], "slider"),
    outlinerGroup("Slider - yellow warning state", [10.95, 8, 9.37], "slider_warning", { visibility: false }),
    outlinerGroup("Slider - red danger state", [12.2, 8, 9.29], "slider_danger", { visibility: false }),
  ],
  textures: textureKeys.map((key) => ({
    path: `assets/hyperpressure/textures/block/pressure_gauge_${key}.png`,
    name: `pressure_gauge_${key}.png`,
    folder: "block",
    namespace: "hyperpressure",
    id: textureId[key],
    particle: key === "cobalt_casing",
    visible: true,
    mode: "bitmap",
    saved: true,
    uuid: uuid(`pressure-gauge-texture-${key}`),
    source: textureSources[key].source,
  })),
};

writeJson(path.join(modelDir, "pressure_gauge.bbmodel"), bbModel);

console.log(`Generated pressure gauge assets in ${assetRoot}`);
