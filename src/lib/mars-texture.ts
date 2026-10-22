// Procedural Mars-like surface painted on a canvas (equirectangular).
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const rnd = mulberry(seed);
  const N = 256;
  const g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const s = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = s(x - xi), yf = s(y - yi);
    const at = (i: number, j: number) => g[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number, oct = 5) => {
    let sum = 0, amp = 0.5, f = 1;
    for (let o = 0; o < oct; o++) {
      sum += v(x * f, y * f) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };
}

export interface MarsMaps {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
}

export function paintMars(width = 1024, seed = 2089): MarsMaps {
  const height = width / 2;
  const fbm = makeNoise(seed);
  const rnd = mulberry(seed * 3);
  const h = new Float32Array(width * height);
  const wrap = 8; // noise period for seamless wrap in x
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x / width) * wrap, v = (y / height) * (wrap / 2);
      // blend for horizontal seamlessness
      const t = x / width;
      const n = fbm(u, v) * (1 - t) + fbm(u - wrap, v) * t;
      const big = fbm(u * 0.25 + 31, v * 0.25 + 7, 3);
      h[y * width + x] = n * 0.6 + big * 0.6;
    }
  }
  // craters
  for (let c = 0; c < 220; c++) {
    const cx = rnd() * width, cy = height * 0.1 + rnd() * height * 0.8;
    const r = Math.pow(rnd(), 3) * 26 + 2;
    for (let dy = -r * 1.4; dy <= r * 1.4; dy++) {
      for (let dx = -r * 1.4; dx <= r * 1.4; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1.4) continue;
        const x = Math.round((cx + dx + width) % width), y = Math.round(cy + dy);
        if (y < 0 || y >= height) continue;
        const k = d < 1 ? -0.18 * (1 - d * d) : 0.08 * (1 - (d - 1) / 0.4);
        h[y * width + x] += k * Math.min(1, r / 10);
      }
    }
  }
  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  color.width = bump.width = width;
  color.height = bump.height = height;
  const ci = color.getContext("2d")!.createImageData(width, height);
  const bi = bump.getContext("2d")!.createImageData(width, height);
  const dark = [70, 28, 18], mid = [168, 74, 42], light = [222, 140, 92];
  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y / height - 0.5) * 2;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = Math.max(0, Math.min(1, (h[i] - 0.35) * 1.6));
      const t = v < 0.5 ? v * 2 : (v - 0.5) * 2;
      const A = v < 0.5 ? dark : mid, B = v < 0.5 ? mid : light;
      let r = A[0] + (B[0] - A[0]) * t, g = A[1] + (B[1] - A[1]) * t, b = A[2] + (B[2] - A[2]) * t;
      // polar caps
      const cap = Math.max(0, (lat - 0.88) / 0.12);
      if (cap > 0) {
        const m = Math.min(1, cap * 1.4 + fbm(x * 0.02, y * 0.02, 2) * 0.3);
        r += (236 - r) * m; g += (226 - g) * m; b += (214 - b) * m;
      }
      const o = i * 4;
      ci.data[o] = r; ci.data[o + 1] = g; ci.data[o + 2] = b; ci.data[o + 3] = 255;
      const bv = Math.max(0, Math.min(255, h[i] * 200));
      bi.data[o] = bi.data[o + 1] = bi.data[o + 2] = bv; bi.data[o + 3] = 255;
    }
  }
  color.getContext("2d")!.putImageData(ci, 0, 0);
  bump.getContext("2d")!.putImageData(bi, 0, 0);
  return { color, bump };
}

/** Small topographic thumbnail for a region card. */
export function paintRegion(seed: number, w = 480, h = 300): string {
  const fbm = makeNoise(seed);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x / 70, y / 70, 5);
      const contour = Math.abs(((n * 14) % 1) - 0.5) < 0.04;
      const o = (y * w + x) * 4;
      const base = 40 + n * 190;
      img.data[o] = base * 1.15 + (contour ? 60 : 0);
      img.data[o + 1] = base * 0.48 + (contour ? 30 : 0);
      img.data[o + 2] = base * 0.32 + (contour ? 18 : 0);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.82);
}
