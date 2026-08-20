const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "src", "main", "resources", "assets", "hyperpressure");
const modelDir = path.join(assetRoot, "models", "item", "pressure_goggles");
const itemDir = path.join(assetRoot, "models", "item");
const textureDir = path.join(assetRoot, "textures", "item", "pressure_goggles");

for (const dir of [modelDir, itemDir, textureDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const colors = {
  transparent: [0, 0, 0, 0],
  black: [5, 7, 9, 255],
  cobaltDark: [10, 25, 43, 255],
  cobalt: [26, 59, 92, 255],
  cobaltLight: [47, 101, 146, 255],
  gunmetalDark: [24, 29, 36, 255],
  gunmetal: [49, 58, 67, 255],
  gunmetalLight: [85, 96, 108, 255],
  rubberDark: [14, 16, 20, 255],
  rubber: [34, 39, 47, 255],
  rubberLight: [63, 70, 80, 255],
  cyanDark: [0, 78, 96, 190],
  cyan: [0, 229, 255, 210],
  cyanBright: [157, 247, 255, 245],
  cyanGrid: [101, 239, 255, 235],
  blueLed: [35, 143, 255, 255],
  blueLedBright: [137, 229, 255, 255],
  brass: [187, 135, 59, 255],
  brassDark: [98, 67, 32, 255],
  cream: [217, 222, 209, 255],
  red: [218, 48, 46, 255],
  redDim: [105, 27, 30, 255],
  yellow: [255, 205, 64, 255],
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
  if (x === 15 || y === 0) c = light;
  if ((x + y) % 7 === 0) c = mix(c, light, 0.25);
  if ((x * 11 + y * 5) % 31 === 0) c = mix(c, dark, 0.35);
  return c;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
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

function writeTexture(name, painter) {
  const width = 16;
  const height = 16;
  const pixels = Buffer.alloc(width * height * 4);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = color[3];
  };
  const get = (x, y) => {
    const i = (y * width + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };
  painter({ set, get, width, height });
  const png = encodePng(width, height, pixels);
  const file = path.join(textureDir, `${name}.png`);
  fs.writeFileSync(file, png);
  return { file, source: `data:image/png;base64,${png.toString("base64")}` };
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

function drawCircle(ctx, cx, cy, r, fill, outline) {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= r) ctx.set(x, y, fill);
      if (dist > r - 1.15 && dist <= r + 0.45) ctx.set(x, y, outline);
    }
  }
}

function writeMaterial(name, base, dark, light) {
  return writeTexture(name, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, base, dark, light));
    }
  });
}

const textureSources = {
  cobalt_frame: writeMaterial("cobalt_frame", colors.cobalt, colors.cobaltDark, colors.cobaltLight),
  gunmetal: writeMaterial("gunmetal", colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight),
  dark_rubber: writeMaterial("dark_rubber", colors.rubber, colors.rubberDark, colors.rubberLight),
  cyan_lens: writeTexture("cyan_lens", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.cyanDark);
    }
    for (let y = 1; y <= 14; y += 1) {
      for (let x = 1; x <= 14; x += 1) {
        let c = mix(colors.cyan, colors.cyanDark, (x + y) / 42);
        if (x === 1 || y === 1) c = mix(c, colors.cyanBright, 0.42);
        if (x === 14 || y === 14) c = mix(c, rgba("#003342", 210), 0.45);
        ctx.set(x, y, c);
      }
    }
    for (const x of [4, 8, 12]) drawLine(ctx, x, 2, x, 13, colors.cyanGrid);
    for (const y of [4, 8, 12]) drawLine(ctx, 2, y, 13, y, colors.cyanGrid);
    drawLine(ctx, 2, 3, 6, 3, colors.cyanBright);
    drawLine(ctx, 3, 2, 3, 6, colors.cyanBright);
  }),
  hud_grid: writeTexture("hud_grid", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, [0, 0, 0, 0]);
    }
    for (const y of [2, 5, 8, 11, 14]) drawLine(ctx, 1, y, 14, y, rgba("#8BF6FF", 135));
    for (const x of [2, 6, 10, 14]) drawLine(ctx, x, 1, x, 14, rgba("#00E5FF", 105));
    drawLine(ctx, 1, 1, 6, 1, rgba("#A9FBFF", 180));
    drawLine(ctx, 1, 2, 1, 6, rgba("#A9FBFF", 160));
    drawLine(ctx, 9, 13, 14, 13, rgba("#00E5FF", 150));
  }),
  bolt: writeTexture("bolt", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let y = 4; y <= 11; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        if ((x === 3 || x === 12) && (y < 6 || y > 9)) continue;
        ctx.set(x, y, colors.gunmetalLight);
      }
    }
    drawLine(ctx, 4, 5, 11, 10, colors.gunmetalDark);
    drawLine(ctx, 4, 10, 11, 5, mix(colors.gunmetal, colors.black, 0.2));
    ctx.set(6, 6, colors.cyanBright);
  }),
  pressure_badge: writeTexture("pressure_badge", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    drawCircle(ctx, 7.5, 8, 6, colors.cream, colors.cobaltDark);
    drawCircle(ctx, 7.5, 8, 4.6, colors.cream, colors.gunmetalLight);
    for (const angle of [-150, -110, -70, -30, 10]) {
      const rad = (angle * Math.PI) / 180;
      drawLine(
        ctx,
        Math.round(7.5 + Math.cos(rad) * 3.2),
        Math.round(8 + Math.sin(rad) * 3.2),
        Math.round(7.5 + Math.cos(rad) * 4.4),
        Math.round(8 + Math.sin(rad) * 4.4),
        colors.gunmetalDark,
      );
    }
    drawLine(ctx, 8, 8, 11, 5, colors.red);
    drawLine(ctx, 7, 8, 8, 8, colors.black);
    ctx.set(7, 7, colors.black);
    ctx.set(8, 7, colors.black);
  }),
  led_blue: writeTexture("led_blue", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, rgba("#06151C", 210));
    }
    drawCircle(ctx, 7.5, 7.5, 5.8, rgba("#0A2633", 255), colors.cobaltLight);
    drawCircle(ctx, 7.5, 7.5, 3.7, colors.blueLed, colors.blueLedBright);
    ctx.set(6, 5, colors.cyanBright);
    ctx.set(5, 6, colors.cyanBright);
  }),
  stripe_logo: writeTexture("stripe_logo", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, colors.rubber, colors.rubberDark, colors.rubberLight));
    }
    drawLine(ctx, 0, 3, 15, 3, colors.cobaltLight);
    drawLine(ctx, 0, 12, 15, 12, colors.cyan);
    drawLine(ctx, 2, 5, 4, 5, colors.cyanBright);
    drawLine(ctx, 2, 6, 2, 9, colors.cyanBright);
    drawLine(ctx, 4, 6, 4, 9, colors.cyanBright);
    drawLine(ctx, 6, 5, 6, 10, colors.cyanBright);
    drawLine(ctx, 7, 5, 9, 5, colors.cyanBright);
    drawLine(ctx, 7, 7, 9, 7, colors.cyanBright);
    drawLine(ctx, 11, 5, 11, 10, colors.cyanBright);
    drawLine(ctx, 12, 5, 14, 5, colors.cyanBright);
    drawLine(ctx, 12, 8, 14, 8, colors.cyanBright);
    ctx.set(12, 10, colors.blueLed);
    ctx.set(14, 10, colors.blueLed);
    ctx.set(10, 10, colors.blueLed);
  }),
  module_dark: writeMaterial("module_dark", rgba("#151E29"), colors.black, colors.gunmetal),
  sensor_red: writeTexture("sensor_red", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, colors.gunmetalDark, colors.black, colors.gunmetal));
    }
    for (const [cx, cy] of [[4, 5], [8, 8], [12, 5]]) {
      drawCircle(ctx, cx, cy, 2.3, colors.red, colors.yellow);
    }
    drawLine(ctx, 3, 12, 13, 12, colors.cyan);
  }),
  antenna_disc: writeTexture("antenna_disc", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    drawCircle(ctx, 7.5, 7.5, 6.4, colors.gunmetal, colors.gunmetalLight);
    drawCircle(ctx, 7.5, 7.5, 3.3, colors.cobalt, colors.cyan);
    drawLine(ctx, 7, 2, 7, 13, colors.cyanGrid);
    drawLine(ctx, 2, 8, 13, 8, colors.cyanGrid);
  }),
  warning_glow: writeTexture("warning_glow", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    for (let x = 1; x <= 14; x += 1) {
      ctx.set(x, 1, colors.yellow);
      ctx.set(x, 14, colors.red);
    }
    for (let y = 1; y <= 14; y += 1) {
      ctx.set(1, y, colors.yellow);
      ctx.set(14, y, colors.red);
    }
    drawLine(ctx, 3, 3, 12, 3, rgba("#FFE683", 185));
    drawLine(ctx, 3, 12, 12, 12, rgba("#FF4E4C", 190));
  }),
  overload_red_lens: writeTexture("overload_red_lens", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, rgba("#38080B", 185));
    }
    for (let y = 1; y <= 14; y += 1) {
      for (let x = 1; x <= 14; x += 1) {
        const heat = (x + (15 - y)) / 30;
        ctx.set(x, y, mix(rgba("#F33236", 225), rgba("#63080C", 205), heat));
      }
    }
    for (const y of [3, 6, 10, 13]) drawLine(ctx, 1, y, 14, y, rgba("#FFB0A3", 165));
    drawLine(ctx, 2, 2, 14, 12, rgba("#FF332F", 235));
    drawLine(ctx, 1, 13, 12, 1, rgba("#FF8A3F", 190));
  }),
};

function drawRect(ctx, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) ctx.set(x, y, color);
  }
}

function writeFlatIcon(name, painter) {
  const result = writeTexture(name, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
    }
    painter(ctx);
  });
  fs.copyFileSync(result.file, path.join(assetRoot, "textures", "item", `${name}.png`));
  return result;
}

writeFlatIcon("pressure_goggles_icon", (ctx) => {
  drawRect(ctx, 2, 4, 13, 10, colors.cobaltDark);
  drawRect(ctx, 3, 5, 12, 9, colors.cobalt);
  drawRect(ctx, 4, 6, 6, 8, colors.cyan);
  drawRect(ctx, 9, 6, 11, 8, colors.cyan);
  ctx.set(4, 6, colors.cyanBright);
  ctx.set(9, 6, colors.cyanBright);
  drawRect(ctx, 7, 5, 8, 10, colors.cobaltLight);
  drawRect(ctx, 1, 7, 2, 9, colors.gunmetal);
  drawRect(ctx, 13, 7, 14, 9, colors.gunmetal);
  drawRect(ctx, 3, 11, 12, 12, colors.rubber);
  ctx.set(5, 11, colors.cyan);
  ctx.set(10, 11, colors.cyan);
  drawCircle(ctx, 7.5, 10.5, 1.8, colors.cream, colors.gunmetalDark);
  ctx.set(8, 10, colors.red);
});

writeFlatIcon("super_engineer_goggles", (ctx) => {
  const brassLight = [232, 184, 92, 255];
  const brassMid = [184, 123, 45, 255];
  const brassDark = [105, 67, 28, 255];
  const lensMix = [28, 207, 224, 220];
  const orangeGlint = [255, 162, 53, 230];

  drawRect(ctx, 2, 4, 13, 10, brassDark);
  drawRect(ctx, 3, 5, 12, 9, brassMid);
  drawRect(ctx, 4, 6, 6, 8, lensMix);
  drawRect(ctx, 9, 6, 11, 8, lensMix);
  ctx.set(4, 6, colors.cyanBright);
  ctx.set(9, 6, colors.cyanBright);
  ctx.set(6, 8, orangeGlint);
  ctx.set(11, 8, orangeGlint);
  drawRect(ctx, 7, 5, 8, 10, brassLight);
  drawRect(ctx, 1, 7, 2, 9, colors.gunmetal);
  drawRect(ctx, 13, 7, 14, 9, colors.gunmetal);
  drawRect(ctx, 1, 5, 3, 6, colors.cobalt);
  drawRect(ctx, 12, 5, 14, 6, colors.cobalt);
  ctx.set(2, 5, colors.cyan);
  ctx.set(13, 5, colors.cyan);
  drawRect(ctx, 3, 11, 12, 12, colors.rubber);
  ctx.set(6, 11, brassLight);
  ctx.set(7, 11, colors.cyanBright);
  ctx.set(8, 11, colors.cyanBright);
  ctx.set(9, 11, brassLight);
  ctx.set(5, 3, brassLight);
  ctx.set(10, 3, brassLight);
});

const textureKeys = Object.keys(textureSources);
const textureId = Object.fromEntries(textureKeys.map((key, index) => [key, index.toString()]));
const textureRefs = Object.fromEntries(textureKeys.map((key) => [key, `hyperpressure:item/pressure_goggles/${key}`]));
textureRefs.particle = "hyperpressure:item/pressure_goggles/cobalt_frame";

const allElements = [];
const groups = {
  base: [],
  lens_overlay: [],
  left_led: [],
  left_antenna: [],
  right_data_module: [],
  right_sensor_array: [],
  final_glow: [],
  warning_state: [],
  overload_state: [],
};

let uuidCounter = 0;
function uuid(name) {
  uuidCounter += 1;
  const hex = Buffer.from(`${name}-${uuidCounter}`).toString("hex").padEnd(32, "0").slice(0, 32);
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
  for (const face of ["north", "east", "south", "west", "up", "down"]) {
    if (options.omit?.includes(face)) continue;
    const faceTexture = options.faceTextures?.[face] ?? texture;
    const faceUv = options.faceUv?.[face] ?? options.uv ?? uvFor(face, from, to);
    faces[face] = { uv: faceUv, texture: `#${faceTexture}` };
    if (options.faceRotation?.[face] !== undefined) faces[face].rotation = options.faceRotation[face];
    if (options.tintindex !== undefined) faces[face].tintindex = options.tintindex;
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

// Thick front shell.
box("upper deep cobalt brow frame", [2.1, 9.25, 2.25], [13.9, 10.85, 5.25], "cobalt_frame", "base");
box("lower deep cobalt cheek frame", [2.1, 5.15, 2.25], [13.9, 6.75, 5.25], "cobalt_frame", "base");
box("left outer vertical frame", [1.55, 5.6, 2.2], [3.25, 10.4, 5.3], "cobalt_frame", "base");
box("right outer vertical frame", [12.75, 5.6, 2.2], [14.45, 10.4, 5.3], "cobalt_frame", "base");
box("center reinforced bridge", [7.1, 5.75, 2.0], [8.9, 10.15, 5.55], "cobalt_frame", "base");

// Lens wells and luminous HUD layers.
box("left electric cyan lens", [3.25, 6.45, 1.95], [7.15, 9.35, 2.2], "cyan_lens", "base", {
  omit: ["south"],
  faceTextures: { north: "cyan_lens" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("right electric cyan lens", [8.85, 6.45, 1.95], [12.75, 9.35, 2.2], "cyan_lens", "base", {
  omit: ["south"],
  faceTextures: { north: "cyan_lens" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("left HUD grid overlay", [3.35, 6.55, 1.82], [7.05, 9.25, 1.86], "hud_grid", "lens_overlay", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "hud_grid" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("right HUD grid overlay", [8.95, 6.55, 1.82], [12.65, 9.25, 1.86], "hud_grid", "lens_overlay", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "hud_grid" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});

// Hex bolts and pressure badge.
for (const [x0, y0] of [[2.0, 9.75], [12.45, 9.75], [2.0, 5.25], [12.45, 5.25]]) {
  box("recessed hex socket bolt", [x0, y0, 1.75], [3.05 + (x0 > 10 ? 0.4 : 0), y0 + 0.95, 2.05], "bolt", "base", {
    omit: ["east", "south", "west", "up", "down"],
    faceTextures: { north: "bolt" },
    faceUv: { north: [0, 0, 16, 16] },
  });
}

box("central micro pressure gauge badge", [6.6, 4.55, 1.55], [9.4, 7.0, 1.86], "pressure_badge", "base", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "pressure_badge" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});

// Side temples, rubber ends, and head strap.
box("left gunmetal hinge block", [0.55, 6.25, 3.25], [2.05, 9.75, 5.4], "gunmetal", "base");
box("right gunmetal hinge block", [13.95, 6.25, 3.25], [15.45, 9.75, 5.4], "gunmetal", "base");
box("left thick metal temple", [0.4, 6.65, 5.15], [1.75, 9.2, 12.65], "gunmetal", "base");
box("right thick metal temple", [14.25, 6.65, 5.15], [15.6, 9.2, 12.65], "gunmetal", "base");
box("left anti slip rubber sleeve", [0.25, 6.35, 11.9], [1.9, 9.35, 14.6], "dark_rubber", "base");
box("right anti slip rubber sleeve", [14.1, 6.35, 11.9], [15.75, 9.35, 14.6], "dark_rubber", "base");
box("rear wide elastic headband", [2.6, 5.95, 12.55], [13.4, 9.95, 14.75], "stripe_logo", "base", {
  faceTextures: { south: "stripe_logo", north: "stripe_logo" },
  faceUv: { south: [0, 0, 16, 16], north: [0, 0, 16, 16] },
});
box("upper blue stitched band stripe", [2.9, 9.75, 12.2], [13.1, 10.22, 14.95], "cyan_lens", "base", { shade: false });
box("lower blue stitched band stripe", [2.9, 5.68, 12.2], [13.1, 6.15, 14.95], "cyan_lens", "base", { shade: false });

// Four visible modular attachment states.
box("attachment 1 left root glowing LED socket", [0.05, 7.1, 4.65], [1.05, 8.65, 5.85], "led_blue", "left_led", {
  faceTextures: { west: "led_blue", north: "led_blue" },
  faceUv: { west: [0, 0, 16, 16], north: [0, 0, 16, 16] },
  shade: false,
});
box("attachment 1 breathing light halo plate", [0.0, 6.75, 4.3], [0.28, 9.0, 6.2], "cyan_lens", "left_led", {
  omit: ["east"],
  shade: false,
});

box("attachment 2 left headband signal puck", [1.35, 8.55, 12.65], [3.45, 10.85, 14.95], "antenna_disc", "left_antenna", {
  faceTextures: { west: "antenna_disc", up: "antenna_disc" },
  faceUv: { west: [0, 0, 16, 16], up: [0, 0, 16, 16] },
});
box("attachment 2 short angled antenna mast", [1.75, 10.45, 13.35], [2.35, 13.95, 13.95], "gunmetal", "left_antenna", {
  rotation: { angle: -22.5, axis: "z", origin: [2.0, 10.45, 13.65] },
});
box("attachment 2 cyan antenna tip", [1.35, 13.45, 13.15], [2.35, 14.45, 14.15], "cyan_lens", "left_antenna", {
  rotation: { angle: -22.5, axis: "z", origin: [2.0, 10.45, 13.65] },
  shade: false,
});
box("attachment 2 extra blue band stripe", [3.0, 7.75, 12.1], [13.0, 8.18, 15.05], "cyan_lens", "left_antenna", {
  shade: false,
});

box("attachment 3 right temple data module body", [14.0, 6.0, 7.15], [16.1, 9.8, 10.95], "module_dark", "right_data_module");
box("attachment 3 data module cyan status slit", [15.82, 6.55, 8.05], [16.18, 7.15, 10.05], "cyan_lens", "right_data_module", {
  omit: ["west"],
  shade: false,
});
box("attachment 3 module screw cap top", [14.4, 9.6, 7.75], [15.7, 10.15, 8.95], "bolt", "right_data_module", {
  faceTextures: { up: "bolt" },
  faceUv: { up: [0, 0, 16, 16] },
});
box("attachment 3 denser left HUD scanlines", [3.25, 7.75, 1.65], [7.15, 7.95, 1.75], "cyan_lens", "right_data_module", {
  shade: false,
});
box("attachment 3 denser right HUD scanlines", [8.85, 7.75, 1.65], [12.75, 7.95, 1.75], "cyan_lens", "right_data_module", {
  shade: false,
});

box("attachment 4 right headband sensor base", [12.85, 8.55, 12.7], [15.4, 10.7, 14.8], "sensor_red", "right_sensor_array", {
  faceTextures: { east: "sensor_red", up: "sensor_red" },
  faceUv: { east: [0, 0, 16, 16], up: [0, 0, 16, 16] },
});
for (const [x0, z0] of [[13.05, 12.25], [14.15, 12.35], [13.6, 14.1]]) {
  box("attachment 4 raised external sensor bump", [x0, 10.45, z0], [x0 + 0.75, 11.45, z0 + 0.75], "sensor_red", "right_sensor_array", {
    faceTextures: { up: "sensor_red" },
    faceUv: { up: [0, 0, 16, 16] },
    shade: false,
  });
}
box("attachment 4 subtle cyan frame glow top", [1.7, 10.85, 1.65], [14.3, 11.15, 5.8], "cyan_lens", "final_glow", {
  shade: false,
});
box("attachment 4 subtle cyan frame glow bottom", [1.7, 4.85, 1.65], [14.3, 5.15, 5.8], "cyan_lens", "final_glow", {
  shade: false,
});

// Optional lens state overlays for in-game warning and overload rendering.
box("warning yellow red left lens edge halo", [3.1, 6.28, 1.48], [7.3, 9.52, 1.55], "warning_glow", "warning_state", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "warning_glow" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("warning yellow red right lens edge halo", [8.7, 6.28, 1.48], [12.9, 9.52, 1.55], "warning_glow", "warning_state", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "warning_glow" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("overload red left lens flash sheet", [3.05, 6.25, 1.38], [7.35, 9.55, 1.46], "overload_red_lens", "overload_state", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "overload_red_lens" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("overload red right lens flash sheet", [8.65, 6.25, 1.38], [12.95, 9.55, 1.46], "overload_red_lens", "overload_state", {
  omit: ["east", "south", "west", "up", "down"],
  faceTextures: { north: "overload_red_lens" },
  faceUv: { north: [0, 0, 16, 16] },
  shade: false,
});
box("overload red jitter upper frame flash", [2.0, 10.85, 1.5], [14.0, 11.25, 5.7], "overload_red_lens", "overload_state", {
  shade: false,
});
box("overload red jitter lower frame flash", [2.0, 4.75, 1.5], [14.0, 5.15, 5.7], "overload_red_lens", "overload_state", {
  shade: false,
});

const display = {
  thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.5, 1.5], scale: [0.42, 0.42, 0.42] },
  thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, 2.5, 1.5], scale: [0.42, 0.42, 0.42] },
  firstperson_righthand: { rotation: [0, 45, 0], translation: [0, 0, 0], scale: [0.42, 0.42, 0.42] },
  firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.42, 0.42, 0.42] },
  ground: { translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
  gui: { rotation: [22, -180, 0], translation: [0, 2.25, 0], scale: [1.32, 1.32, 1.32] },
  head: { rotation: [0, 180, 0], translation: [0, 5.6, 0], scale: [1.72, 1.72, 1.72] },
  fixed: { rotation: [0, 180, 0], translation: [0, 1.5, 2.5], scale: [1.0, 1.0, 1.0] },
};

function modelJson(indices, includeDisplay = true) {
  return {
    credit: "Pressure Goggles concept model for HyperPressure Engineering, generated for Blockbench",
    parent: "block/block",
    render_type: "minecraft:translucent",
    textures: textureRefs,
    elements: indices.map((index) => allElements[index]),
    ...(includeDisplay ? { display } : {}),
  };
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const stateGroups = [
  groups.base,
  [...groups.base, ...groups.left_led],
  [...groups.base, ...groups.left_led, ...groups.left_antenna],
  [...groups.base, ...groups.lens_overlay, ...groups.left_led, ...groups.left_antenna, ...groups.right_data_module],
  [...groups.base, ...groups.lens_overlay, ...groups.left_led, ...groups.left_antenna, ...groups.right_data_module, ...groups.right_sensor_array, ...groups.final_glow],
];

for (let state = 0; state <= 4; state += 1) {
  const name = state === 0 ? "base" : `attachments_${state}`;
  writeJson(path.join(modelDir, `${name}.json`), modelJson(stateGroups[state]));
}
writeJson(path.join(modelDir, "warning.json"), modelJson([...stateGroups[4], ...groups.warning_state]));
writeJson(path.join(modelDir, "overload.json"), modelJson([...stateGroups[4], ...groups.overload_state]));

writeJson(path.join(modelDir, "pressure_goggles_worn.json"), {
  parent: "hyperpressure:item/pressure_goggles/base",
  overrides: [
    { predicate: { custom_model_data: 1 }, model: "hyperpressure:item/pressure_goggles/attachments_1" },
    { predicate: { custom_model_data: 2 }, model: "hyperpressure:item/pressure_goggles/attachments_2" },
    { predicate: { custom_model_data: 3 }, model: "hyperpressure:item/pressure_goggles/attachments_3" },
    { predicate: { custom_model_data: 4 }, model: "hyperpressure:item/pressure_goggles/attachments_4" },
    { predicate: { custom_model_data: 10 }, model: "hyperpressure:item/pressure_goggles/warning" },
    { predicate: { custom_model_data: 11 }, model: "hyperpressure:item/pressure_goggles/overload" },
  ],
});

writeJson(path.join(itemDir, "pressure_goggles.json"), {
  parent: "minecraft:item/generated",
  textures: {
    layer0: "hyperpressure:item/pressure_goggles_icon",
  },
});

writeJson(path.join(itemDir, "super_engineer_goggles.json"), {
  parent: "minecraft:item/generated",
  textures: {
    layer0: "hyperpressure:item/super_engineer_goggles",
  },
});

function bbFaces(faces) {
  return Object.fromEntries(
    Object.entries(faces).map(([face, data]) => [
      face,
      {
        ...data,
        texture: textureId[data.texture.replace("#", "")],
      },
    ]),
  );
}

const elementUuids = allElements.map((element) => uuid(element.name));
const bbElements = allElements.map((element, index) => ({
  ...element,
  autouv: 0,
  color: index % 8,
  locked: false,
  origin: [8, 8, 8],
  faces: bbFaces(element.faces),
  uuid: elementUuids[index],
}));

const outliner = [
  {
    name: "Base Pressure Goggles - cobalt frame, cyan lenses, HPE band",
    origin: [8, 8, 8],
    uuid: uuid("base-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: groups.base.map((index) => elementUuids[index]),
  },
  {
    name: "HUD Grid Overlay - used from attachment count 3",
    origin: [8, 8, 8],
    uuid: uuid("hud-overlay-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: groups.lens_overlay.map((index) => elementUuids[index]),
  },
  {
    name: "Attachment 1 - left temple blue LED",
    origin: [1, 8, 5],
    uuid: uuid("attachment-1-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: groups.left_led.map((index) => elementUuids[index]),
  },
  {
    name: "Attachment 2 - left headband signal antenna",
    origin: [2, 10, 13],
    uuid: uuid("attachment-2-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: groups.left_antenna.map((index) => elementUuids[index]),
  },
  {
    name: "Attachment 3 - right temple data module and denser HUD",
    origin: [15, 8, 9],
    uuid: uuid("attachment-3-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: groups.right_data_module.map((index) => elementUuids[index]),
  },
  {
    name: "Attachment 4 - right sensor array and overall blue glow",
    origin: [14, 10, 13],
    uuid: uuid("attachment-4-group"),
    export: true,
    isOpen: true,
    locked: false,
    visibility: true,
    children: [...groups.right_sensor_array, ...groups.final_glow].map((index) => elementUuids[index]),
  },
  {
    name: "Optional Warning State - yellow red lens edge halo",
    origin: [8, 8, 2],
    uuid: uuid("warning-state-group"),
    export: true,
    isOpen: false,
    locked: false,
    visibility: true,
    children: groups.warning_state.map((index) => elementUuids[index]),
  },
  {
    name: "Optional Overload State - red flashing lens overlay",
    origin: [8, 8, 2],
    uuid: uuid("overload-state-group"),
    export: true,
    isOpen: false,
    locked: false,
    visibility: true,
    children: groups.overload_state.map((index) => elementUuids[index]),
  },
];

writeJson(path.join(modelDir, "pressure_goggles.bbmodel"), {
  meta: {
    format_version: "4.10",
    model_format: "java_block",
    box_uv: false,
  },
  name: "pressure_goggles",
  parent: "block/block",
  ambientocclusion: true,
  front_gui_light: true,
  visible_box: [1, 1, 0],
  resolution: { width: 16, height: 16 },
  elements: bbElements,
  outliner,
  textures: textureKeys.map((key) => ({
    path: `assets/hyperpressure/textures/item/pressure_goggles/${key}.png`,
    name: `${key}.png`,
    folder: "item/pressure_goggles",
    namespace: "hyperpressure",
    id: textureId[key],
    particle: key === "cobalt_frame",
    visible: true,
    mode: "bitmap",
    saved: true,
    uuid: uuid(`texture-${key}`),
    source: textureSources[key].source,
  })),
  display,
});

console.log(`Generated pressure goggles assets in ${assetRoot}`);
