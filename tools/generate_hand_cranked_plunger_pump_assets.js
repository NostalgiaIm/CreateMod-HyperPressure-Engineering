const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "src", "main", "resources", "assets", "hyperpressure");
const modelDir = path.join(assetRoot, "models", "block", "hand_cranked_plunger_pump");
const itemDir = path.join(assetRoot, "models", "item");
const blockstateDir = path.join(assetRoot, "blockstates");
const textureDir = path.join(assetRoot, "textures", "block");
const itemTextureDir = path.join(assetRoot, "textures", "item");

for (const dir of [modelDir, itemDir, blockstateDir, textureDir, itemTextureDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const colors = {
  transparent: [0, 0, 0, 0],
  gunmetal: [47, 58, 70, 255],
  gunmetalDark: [26, 31, 38, 255],
  gunmetalLight: [76, 91, 106, 255],
  cobalt: [26, 59, 92, 255],
  cobaltDark: [13, 30, 50, 255],
  cobaltLight: [45, 98, 141, 255],
  glass: [42, 145, 218, 175],
  glassLight: [163, 235, 255, 220],
  cyan: [62, 221, 255, 255],
  cyanDim: [18, 93, 128, 255],
  red: [198, 67, 46, 255],
  redDark: [109, 38, 34, 255],
  redLight: [236, 111, 73, 255],
  iron: [158, 166, 168, 255],
  ironDark: [87, 94, 99, 255],
  brass: [190, 138, 62, 255],
  cream: [209, 214, 205, 255],
  black: [8, 10, 12, 255],
  white: [235, 244, 241, 255],
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
  if (x === 0 || y === 15) c = mix(base, dark, 0.35);
  if (y === 0 || x === 15) c = mix(base, light, 0.28);
  if (((x * 13 + y * 7) % 23) === 0) c = mix(c, light, 0.22);
  if (((x * 5 + y * 17) % 29) === 0) c = mix(c, dark, 0.18);
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
  return writeNamedTexture(path.join(textureDir, `hand_cranked_plunger_pump_${name}.png`), painter);
}

function writeNamedTexture(file, painter) {
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
      if (dist > r - 1.2 && dist <= r + 0.45) ctx.set(x, y, outline);
    }
  }
}

function writeMaterial(name, base, dark, light) {
  return writeTexture(name, (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        ctx.set(x, y, materialPixel(x, y, base, dark, light));
      }
    }
  });
}

const textureSources = {
  gunmetal: writeMaterial("gunmetal", colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight),
  dark_metal: writeMaterial("dark_metal", colors.gunmetalDark, colors.black, colors.gunmetal),
  cobalt_casing: writeMaterial("cobalt_casing", colors.cobalt, colors.cobaltDark, colors.cobaltLight),
  red_rubber: writeMaterial("red_rubber", colors.red, colors.redDark, colors.redLight),
  iron_ingot: writeMaterial("iron_ingot", colors.iron, colors.ironDark, colors.white),
  plunger_blue: writeMaterial("plunger_blue", rgba("#205D91"), rgba("#0C2237"), colors.cyan),
  cyan_glow: writeMaterial("cyan_glow", colors.cyanDim, rgba("#07202A"), colors.cyan),
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
    ctx.set(7, 7, colors.white);
    ctx.set(8, 8, colors.gunmetalDark);
  }),
  blue_glass: writeTexture("blue_glass", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.cobaltDark);
    }
    drawCircle(ctx, 7.5, 7.5, 6.0, rgba("#2B91D8"), mix(colors.cobaltLight, colors.gunmetalLight, 0.35));
    for (let y = 4; y <= 11; y += 1) {
      ctx.set(7, y, rgba("#53D7FF"));
      ctx.set(8, y, rgba("#1C669D"));
    }
    for (const [x, y] of [[4, 4], [5, 3], [6, 4], [4, 5]]) ctx.set(x, y, colors.glassLight);
    ctx.set(10, 11, colors.cyanDim);
  }),
  pressure_gauge: writeTexture("pressure_gauge", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, colors.gunmetal, colors.gunmetalDark, colors.gunmetalLight));
    }
    drawCircle(ctx, 7.5, 8.5, 5.6, colors.cream, colors.gunmetal);
    drawCircle(ctx, 7.5, 8.5, 4.2, colors.cream, mix(colors.gunmetalLight, colors.cream, 0.35));
    const tickAngles = [-140, -105, -70, -35, 0, 35];
    for (const angle of tickAngles) {
      const rad = (angle * Math.PI) / 180;
      const x0 = Math.round(7.5 + Math.cos(rad) * 3.6);
      const y0 = Math.round(8.5 + Math.sin(rad) * 3.6);
      const x1 = Math.round(7.5 + Math.cos(rad) * 4.8);
      const y1 = Math.round(8.5 + Math.sin(rad) * 4.8);
      drawLine(ctx, x0, y0, x1, y1, colors.gunmetalDark);
    }
    drawLine(ctx, 8, 9, 12, 6, colors.cyan);
    ctx.set(7, 8, colors.black);
    ctx.set(8, 8, colors.black);
    ctx.set(7, 9, colors.black);
    ctx.set(8, 9, colors.cyan);
  }),
  slot_glow: writeTexture("slot_glow", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, colors.gunmetalDark, colors.black, colors.gunmetal));
    }
    for (let y = 5; y <= 10; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        const edge = x === 3 || x === 12 || y === 5 || y === 10;
        ctx.set(x, y, edge ? colors.cyanDim : colors.cyan);
      }
    }
    ctx.set(5, 4, colors.cyanDim);
    ctx.set(10, 11, colors.cyanDim);
  }),
  pipe_port: writeTexture("pipe_port", (ctx) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, materialPixel(x, y, colors.gunmetalLight, colors.gunmetal, colors.white));
    }
    drawCircle(ctx, 7.5, 7.5, 6.9, colors.gunmetal, colors.gunmetalLight);
    drawCircle(ctx, 7.5, 7.5, 4.7, colors.gunmetalDark, colors.gunmetal);
    drawCircle(ctx, 7.5, 7.5, 2.8, rgba("#143C5C"), colors.cyanDim);
    drawLine(ctx, 4, 7, 11, 7, colors.cyan);
    drawLine(ctx, 4, 8, 11, 8, colors.cyanDim);
  }),
};

writeNamedTexture(path.join(itemTextureDir, "hand_cranked_plunger_pump.png"), (ctx) => {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) ctx.set(x, y, colors.transparent);
  }

  const rect = (x0, y0, x1, y1, color) => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) ctx.set(x, y, color);
    }
  };

  rect(3, 13, 12, 15, colors.gunmetal);
  rect(4, 12, 11, 12, colors.gunmetalLight);
  for (const [x, y] of [[3, 13], [12, 13], [3, 15], [12, 15]]) ctx.set(x, y, colors.gunmetalDark);

  rect(5, 4, 10, 11, colors.cobalt);
  rect(5, 4, 10, 4, colors.cobaltLight);
  rect(5, 11, 10, 11, colors.cobaltDark);
  rect(4, 5, 4, 10, colors.gunmetal);
  rect(11, 5, 11, 10, colors.gunmetal);

  drawCircle(ctx, 7.5, 8, 2.6, colors.glass, colors.gunmetalLight);
  rect(7, 6, 8, 9, colors.cyanDim);
  ctx.set(6, 7, colors.glassLight);

  drawCircle(ctx, 7.5, 12.8, 2.2, colors.cream, colors.gunmetalDark);
  drawLine(ctx, 8, 13, 10, 12, colors.cyan);

  rect(7, 2, 8, 4, colors.gunmetal);
  rect(3, 1, 12, 2, colors.gunmetal);
  rect(2, 1, 3, 2, colors.red);
  rect(12, 1, 13, 2, colors.red);
  rect(11, 6, 14, 8, colors.gunmetalDark);
  rect(13, 5, 15, 9, colors.gunmetal);
  rect(14, 6, 15, 8, colors.cyanDim);
  ctx.set(15, 7, colors.cyan);

  drawLine(ctx, 1, 15, 14, 15, colors.black);
});

const textureKeys = Object.keys(textureSources);
const textureId = Object.fromEntries(textureKeys.map((key, index) => [key, index.toString()]));
const textureRefs = Object.fromEntries(textureKeys.map((key) => [key, `hyperpressure:block/hand_cranked_plunger_pump_${key}`]));
textureRefs.particle = "hyperpressure:block/hand_cranked_plunger_pump_gunmetal";

const allElements = [];
const groups = {
  body: [],
  crank: [],
  plunger: [],
  needle: [],
  inputIron: [],
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

box("gunmetal weighted base", [1, 0, 1], [15, 3, 15], "gunmetal", "body");
box("recessed top plate", [2, 3, 2], [14, 4, 14], "dark_metal", "body");
box("front pressure gauge panel", [4, 2.2, 0.1], [12, 7.8, 0.8], "gunmetal", "body", {
  faceTextures: { north: "pressure_gauge" },
  faceUv: { north: [0, 0, 16, 16] },
});
box("rear high pressure pipe neck", [6, 1, 12.4], [10, 5, 16], "dark_metal", "body", {
  faceTextures: { south: "pipe_port" },
  faceUv: { south: [0, 0, 16, 16] },
});
box("rear pipe clamp", [5, 2.1, 12], [11, 4.9, 13.7], "gunmetal", "body");

for (const [x0, z0] of [[2, 2], [12.5, 2], [2, 12.5], [12.5, 12.5]]) {
  box("exposed hex bolt", [x0, 3.9, z0], [x0 + 1.5, 4.7, z0 + 1.5], "bolt", "body", {
    faceTextures: { up: "bolt" },
    faceUv: { up: [0, 0, 16, 16] },
  });
}

box("deep cobalt pressure cylinder", [4, 4.1, 3.5], [12, 13, 12.5], "cobalt_casing", "body");
box("front cobalt machine face", [4, 4.1, 2.9], [12, 13, 4.05], "cobalt_casing", "body");
box("back cylinder face", [4, 4.1, 12], [12, 13, 13], "cobalt_casing", "body");
box("lower cylinder clamp", [3.2, 3.7, 3.2], [12.8, 4.8, 12.8], "gunmetal", "body");
box("upper cylinder clamp", [3.2, 12.4, 3.2], [12.8, 13.5, 12.8], "gunmetal", "body");
box("left vertical reinforcement rib", [3.4, 4.5, 3.0], [4.5, 12.6, 4.1], "gunmetal", "body");
box("right vertical reinforcement rib", [11.5, 4.5, 3.0], [12.6, 12.6, 4.1], "gunmetal", "body");
box("front round glass sight window", [6, 7, 0.15], [10, 11, 0.42], "blue_glass", "body", {
  faceTextures: { north: "blue_glass" },
  faceUv: { north: [0, 0, 16, 16] },
});

box("top handle stem", [7.25, 13.1, 7.25], [8.75, 15.4, 8.75], "gunmetal", "crank");
box("top T handle bar", [4.3, 14.85, 7], [11.7, 15.95, 9], "gunmetal", "crank");
box("left red top grip", [2.7, 14.75, 6.6], [4.5, 15.95, 9.4], "red_rubber", "crank");
box("right red top grip", [11.5, 14.75, 6.6], [13.3, 15.95, 9.4], "red_rubber", "crank");

box("visible blue plunger head", [7.05, 7.2, 0.25], [8.95, 10.8, 0.55], "plunger_blue", "plunger");
box("plunger rod", [7.55, 11, 7.55], [8.45, 14.8, 8.45], "plunger_blue", "plunger");

box("east axle hub", [12, 8, 6], [16, 10, 10], "gunmetal", "body", {
  faceTextures: { east: "pipe_port" },
  faceUv: { east: [0, 0, 16, 16] },
});
box("side crank arm", [14.6, 9.5, 7.25], [15.6, 13.7, 8.75], "gunmetal", "crank");
box("red crank grip", [13.8, 13.25, 6.2], [16, 15.25, 9.8], "red_rubber", "crank");

box("east ingot feed neck", [11.6, 6, 6], [14, 8.4, 10], "gunmetal", "body");
box("east funnel mouth", [13.6, 5.2, 5], [16, 9.2, 11], "dark_metal", "body", {
  faceTextures: { east: "slot_glow" },
  faceUv: { east: [0, 0, 16, 16] },
});
box("inserted iron ingot cue", [14.5, 6.15, 6.35], [16, 7.65, 10.65], "iron_ingot", "inputIron");

box("cyan pressure needle", [7.75, 5.05, 0.12], [8.25, 7.55, 0.28], "cyan_glow", "needle");

function modelJson(indices, includeDisplay = false) {
  const json = {
    credit: "Made with Blockbench for HyperPressure Engineering",
    parent: "block/block",
    render_type: "minecraft:cutout",
    textures: textureRefs,
    elements: indices.map((index) => allElements[index]),
  };
  if (includeDisplay) {
    json.display = {
      thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: [0.38, 0.38, 0.38] },
      thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: [0.38, 0.38, 0.38] },
      firstperson_righthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.4, 0.4, 0.4] },
      firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.4, 0.4, 0.4] },
      gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.68, 0.68, 0.68] },
      ground: { rotation: [0, 0, 0], translation: [0, 3, 0], scale: [0.32, 0.32, 0.32] },
      fixed: { rotation: [0, 180, 0], translation: [0, 0, 0], scale: [0.58, 0.58, 0.58] },
    };
  }
  return json;
}

const machineDisplay = {
  thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 1.5, 0], scale: [0.36, 0.36, 0.36] },
  thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, 1.5, 0], scale: [0.36, 0.36, 0.36] },
  firstperson_righthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.42, 0.42, 0.42] },
  firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.42, 0.42, 0.42] },
  gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.58, 0.58, 0.58] },
  ground: { rotation: [0, 0, 0], translation: [0, 2.5, 0], scale: [0.28, 0.28, 0.28] },
  fixed: { rotation: [0, 180, 0], translation: [0, 0, 0], scale: [0.52, 0.52, 0.52] },
};

const bodyIndices = groups.body;
const fullIndices = [...groups.body, ...groups.plunger, ...groups.crank, ...groups.needle];

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

writeJson(path.join(modelDir, "block.json"), modelJson(fullIndices, true));
writeJson(path.join(modelDir, "body.json"), modelJson(bodyIndices));
writeJson(path.join(modelDir, "crank.json"), modelJson(groups.crank));
writeJson(path.join(modelDir, "plunger.json"), modelJson(groups.plunger));
writeJson(path.join(modelDir, "gauge_needle.json"), modelJson(groups.needle));
writeJson(path.join(modelDir, "input_iron.json"), modelJson(groups.inputIron));
writeJson(path.join(itemDir, "hand_cranked_plunger_pump.json"), {
  parent: "hyperpressure:block/hand_cranked_plunger_pump/block",
  display: machineDisplay,
});
writeJson(path.join(blockstateDir, "hand_cranked_plunger_pump.json"), {
  variants: {
    "facing=north,glowing=false": { model: "hyperpressure:block/hand_cranked_plunger_pump/body" },
    "facing=east,glowing=false": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 90 },
    "facing=south,glowing=false": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 180 },
    "facing=west,glowing=false": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 270 },
    "facing=north,glowing=true": { model: "hyperpressure:block/hand_cranked_plunger_pump/body" },
    "facing=east,glowing=true": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 90 },
    "facing=south,glowing=true": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 180 },
    "facing=west,glowing=true": { model: "hyperpressure:block/hand_cranked_plunger_pump/body", y: 270 },
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

const bbModel = {
  meta: {
    format_version: "4.10",
    model_format: "java_block",
    box_uv: false,
  },
  name: "hand_cranked_plunger_pump",
  parent: "block/block",
  ambientocclusion: true,
  front_gui_light: false,
  visible_box: [1, 1, 1],
  resolution: { width: 16, height: 16 },
  elements: bbElements,
  outliner: [
    {
      name: "Static Body - gunmetal base, cobalt cylinder, feed port, pipe connector",
      origin: [8, 8, 8],
      uuid: uuid("body-group"),
      export: true,
      isOpen: true,
      locked: false,
      visibility: true,
      children: groups.body.map((index) => elementUuids[index]),
    },
    {
      name: "Animated Plunger - slide up and down behind the glass",
      origin: [8, 9, 8],
      uuid: uuid("plunger-group"),
      export: true,
      isOpen: true,
      locked: false,
      visibility: true,
      children: groups.plunger.map((index) => elementUuids[index]),
    },
    {
      name: "Input Iron - sinks into the side feed slot",
      origin: [15.9, 6.9, 8.5],
      uuid: uuid("input-iron-group"),
      export: true,
      isOpen: true,
      locked: false,
      visibility: true,
      children: groups.inputIron.map((index) => elementUuids[index]),
    },
    {
      name: "Crank Handle - rotate around east axle",
      origin: [15.15, 9, 8],
      uuid: uuid("crank-group"),
      export: true,
      isOpen: true,
      locked: false,
      visibility: true,
      children: groups.crank.map((index) => elementUuids[index]),
    },
    {
      name: "Gauge Needle - rotate on front dial",
      origin: [8, 5.15, -0.7],
      uuid: uuid("needle-group"),
      export: true,
      isOpen: true,
      locked: false,
      visibility: true,
      children: groups.needle.map((index) => elementUuids[index]),
    },
  ],
  textures: textureKeys.map((key) => ({
    path: `assets/hyperpressure/textures/block/hand_cranked_plunger_pump_${key}.png`,
    name: `hand_cranked_plunger_pump_${key}.png`,
    folder: "block",
    namespace: "hyperpressure",
    id: textureId[key],
    particle: key === "gunmetal",
    visible: true,
    mode: "bitmap",
    saved: true,
    uuid: uuid(`texture-${key}`),
    source: textureSources[key].source,
  })),
};

writeJson(path.join(modelDir, "hand_cranked_plunger_pump.bbmodel"), bbModel);

console.log(`Generated hand-cranked plunger pump assets in ${assetRoot}`);
