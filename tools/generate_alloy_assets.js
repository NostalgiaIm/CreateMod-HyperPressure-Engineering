const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "src", "main", "resources", "assets", "hyperpressure");
const itemTextureDir = path.join(assetRoot, "textures", "item");
const itemModelDir = path.join(assetRoot, "models", "item");

for (const dir of [itemTextureDir, itemModelDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const transparent = [0, 0, 0, 0];
const colors = {
  outline: [16, 31, 49, 255],
  cobaltDark: [14, 31, 52, 255],
  cobalt: [26, 59, 92, 255],
  cobaltLight: [45, 106, 153, 255],
  cyan: [0, 229, 255, 255],
  cyanSoft: [91, 242, 255, 255],
  purple: [123, 47, 190, 255],
  purpleLight: [190, 118, 255, 255],
  copper: [196, 120, 54, 255],
  copperLight: [239, 171, 83, 255],
  plateDark: [8, 28, 50, 255],
  plateLight: [92, 172, 220, 255],
  white: [238, 251, 255, 255],
};

function mix(a, b, amount) {
  return [
    Math.round(a[0] * (1 - amount) + b[0] * amount),
    Math.round(a[1] * (1 - amount) + b[1] * amount),
    Math.round(a[2] * (1 - amount) + b[2] * amount),
    Math.round(a[3] * (1 - amount) + b[3] * amount),
  ];
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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

function makeFrameContext(pixels, width, height, frameIndex) {
  const frameOffset = frameIndex * 16;
  return {
    set(x, y, color) {
      const yy = frameOffset + y;
      if (x < 0 || y < 0 || x >= width || yy < 0 || yy >= height) return;
      const i = (yy * width + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    },
    get(x, y) {
      const yy = frameOffset + y;
      const i = (yy * width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    },
  };
}

function writeTexture(name, frameCount, frameTime, painter) {
  const width = 16;
  const height = 16 * frameCount;
  const pixels = Buffer.alloc(width * height * 4);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const ctx = makeFrameContext(pixels, width, height, frame);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) ctx.set(x, y, transparent);
    }
    painter(ctx, frame, frameCount);
  }
  fs.writeFileSync(path.join(itemTextureDir, `${name}.png`), encodePng(width, height, pixels));
  const mcmetaPath = path.join(itemTextureDir, `${name}.png.mcmeta`);
  if (frameCount > 1) {
    fs.writeFileSync(mcmetaPath, `${JSON.stringify({ animation: { frametime: frameTime } }, null, 2)}\n`);
  } else if (fs.existsSync(mcmetaPath)) {
    fs.unlinkSync(mcmetaPath);
  }
}

function writeModel(name) {
  const model = {
    parent: "minecraft:item/generated",
    textures: {
      layer0: `hyperpressure:item/${name}`,
    },
  };
  fs.writeFileSync(path.join(itemModelDir, `${name}.json`), `${JSON.stringify(model, null, 2)}\n`);
}

function drawIngot(ctx, palette, overlays) {
  // Match the vanilla iron ingot silhouette exactly; material effects are layered after it.
  const rows = [
    [10, 11],
    [7, 12],
    [4, 13],
    [1, 14],
    [0, 15],
    [0, 15],
    [0, 15],
    [0, 15],
    [0, 14],
    [1, 12],
    [2, 9],
    [3, 6],
  ];
  for (let row = 0; row < rows.length; row += 1) {
    const y = row + 2;
    const [minX, maxX] = rows[row];
    for (let x = minX; x <= maxX; x += 1) {
      const edge = x === minX || x === maxX || row === 0 || row === rows.length - 1;
      let color = edge ? mix(palette.dark, palette.base, 0.35) : palette.base;
      if (!edge) {
        const shade = (x + y) % 5 === 0 ? 0.16 : (x * 7 + y * 11) % 13 === 0 ? -0.15 : 0;
        if (shade > 0) color = mix(color, palette.light, shade);
        if (shade < 0) color = mix(color, palette.dark, -shade);
        if (row <= 4 || x <= minX + 1) color = mix(color, palette.light, 0.22);
        if (row >= 8 || x >= maxX - 1) color = mix(color, palette.dark, 0.2);
      } else {
        if (row === 0) color = mix(color, palette.light, 0.32);
        if (row >= rows.length - 2) color = mix(color, palette.dark, 0.22);
      }
      ctx.set(x, y, color);
    }
  }

  overlays(ctx);
}

function withSweep(base, phase, span) {
  return base + ((phase % span) + span) % span;
}

function line(ctx, x0, y0, x1, y1, color) {
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

const basePalette = {
  outline: colors.outline,
  dark: colors.cobaltDark,
  base: colors.cobalt,
  light: colors.cobaltLight,
};

writeTexture("high_pressure_alloy", 4, 4, (ctx, frame) => {
  drawIngot(ctx, basePalette, c => {
    const sweep = frame;
    line(c, withSweep(4, sweep, 2), 7, withSweep(11, sweep, 2), 6, mix(colors.cobaltLight, colors.cobalt, 0.24));
    line(c, withSweep(3, sweep, 2), 9, withSweep(12, sweep, 2), 8, mix(colors.cobaltLight, colors.cobalt, 0.38));
    line(c, 5, 10, 10, 10, mix(colors.cobaltDark, colors.cobaltLight, 0.2));
    if (frame % 2 === 0) c.set(6, 7, colors.cobaltLight);
    if (frame % 2 === 1) c.set(9, 8, colors.cobaltLight);
  });
});

writeTexture("reinforced_high_pressure_alloy", 4, 4, (ctx, frame) => {
  drawIngot(ctx, {
    ...basePalette,
    dark: mix(colors.copper, colors.cobaltDark, 0.35),
    base: mix(colors.cobalt, colors.copper, 0.2),
    light: mix(colors.copperLight, colors.cobaltLight, 0.15),
  }, c => {
    for (let x = 4; x <= 11; x += 3) line(c, x + (frame % 2), 6, x + 1 + (frame % 2), 11, colors.copper);
    line(c, 3, 8 + (frame % 2), 12, 8 + (frame % 2), colors.copperLight);
    c.set(5 + (frame % 2), 7, colors.copperLight);
    c.set(10 - (frame % 2), 9, colors.copperLight);
  });
});

writeTexture("resonant_alloy", 4, 4, (ctx, frame) => {
  drawIngot(ctx, {
    ...basePalette,
    base: mix(colors.cobalt, colors.purple, 0.3),
    light: mix(colors.cobaltLight, colors.purpleLight, 0.35),
  }, c => {
    const phase = frame % 4;
    line(c, 4 + phase, 10, 7 + phase, 6, colors.purpleLight);
    line(c, 8 - phase, 6, 11 - phase, 10, colors.purple);
    c.set(7, 5 + (phase % 2), colors.white);
    c.set(9, 7, colors.purpleLight);
    c.set(6, 11 - (phase % 2), mix(colors.purpleLight, colors.white, 0.25));
    if (phase === 1) c.set(5, 8, colors.purpleLight);
    if (phase === 3) c.set(10, 8, colors.purpleLight);
  });
});

writeTexture("ultra_pressure_alloy", 4, 3, (ctx, frame) => {
  drawIngot(ctx, {
    ...basePalette,
    dark: mix(colors.cobaltDark, colors.outline, 0.25),
    light: mix(colors.cobaltLight, colors.cyan, 0.25),
  }, c => {
    const phase = frame % 4;
    line(c, 3 + phase, 10, 6 + phase, 7, colors.cyan);
    line(c, 6, 7, 9 + phase, 9, colors.cyanSoft);
    line(c, 9, 9, 12 - phase, 6, colors.cyan);
    c.set(5 + phase, 8, colors.white);
    c.set(10 - phase, 8, colors.white);
    c.set(12, 5 + (phase % 2), colors.cyanSoft);
    if (phase === 2) c.set(7, 6, colors.cyanSoft);
  });
});

writeTexture("dense_ultra_pressure_plate", 4, 5, (ctx, frame) => {
  const pulse = [0.16, 0.28, 0.22, 0.12][frame];
  for (let y = 4; y <= 12; y += 1) {
    for (let x = 2; x <= 13; x += 1) {
      const edge = x === 2 || x === 13 || y === 4 || y === 12;
      let color = edge ? mix(colors.cobaltDark, colors.cobalt, 0.35) : mix(colors.cobalt, colors.plateDark, 0.2);
      if (!edge && y < 7) color = mix(color, colors.plateLight, pulse);
      if (!edge && (x + y + frame) % 5 === 0) color = mix(color, colors.cyan, 0.14 + pulse * 0.4);
      ctx.set(x, y, color);
    }
  }

  const hexes = [
    [5, 7],
    [9, 7],
    [7, 10],
    [11, 10],
  ];
  for (const [cx, cy] of hexes) {
    ctx.set(cx, cy - 1, frame % 2 === 0 ? colors.cyan : colors.cyanSoft);
    ctx.set(cx + 1, cy, colors.cyanSoft);
    ctx.set(cx + 1, cy + 1, frame % 2 === 0 ? colors.cyan : colors.cyanSoft);
    ctx.set(cx, cy + 2, mix(colors.cyan, colors.cobalt, 0.25));
    ctx.set(cx - 1, cy + 1, mix(colors.cyan, colors.cobalt, 0.4));
    ctx.set(cx - 1, cy, colors.cyan);
  }

  line(ctx, 3, 5, 12, 5, mix(colors.plateLight, colors.white, 0.2));
  line(ctx, 3, 12, 12, 12, colors.cyan);
  ctx.set(2, 3, [0, 229, 255, 72 + frame * 4]);
  ctx.set(13, 3, [0, 229, 255, 72 + frame * 4]);
  ctx.set(1, 8, [0, 229, 255, 52 + frame * 3]);
  ctx.set(14, 8, [0, 229, 255, 52 + frame * 3]);
});

for (const name of [
  "high_pressure_alloy",
  "reinforced_high_pressure_alloy",
  "resonant_alloy",
  "ultra_pressure_alloy",
  "dense_ultra_pressure_plate",
]) {
  writeModel(name);
}

console.log(`Generated alloy item assets in ${assetRoot}`);
