"use client";

const colorCache = new Map<string, string>();

interface HSL {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

function hslToHex({ h, s, l: lightness }: HSL): string {
  const l = lightness;
  s *= 100;
  l * 100;

  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hueToRgb(p, q, h / 360 + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h / 360) * 255);
  const b = Math.round(hueToRgb(p, q, h / 360 - 1 / 3) * 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getVibrantColorFromImage(img: HTMLImageElement): string | null {
  try {
    const size = Math.min(64, img.naturalWidth || 64, img.naturalHeight || 64);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    const candidates: { h: number; s: number; l: number; index: number }[] = [];

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a < 128) continue;

      const hsl = rgbToHsl(r, g, b);
      if (hsl.s >= 0.3 && hsl.l >= 0.3 && hsl.l <= 0.8) {
        candidates.push({ ...hsl, index: i });
      }
    }

    if (candidates.length === 0) {
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        if (a < 128) continue;
        const hsl = rgbToHsl(r, g, b);
        if (hsl.l > 0.1 && hsl.l < 0.95) {
          candidates.push({ ...hsl, index: i });
        }
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const satDiff = b.s - a.s;
      if (Math.abs(satDiff) > 0.01) return satDiff;
      return Math.abs(a.l - 0.5) - Math.abs(b.l - 0.5);
    });

    return hslToHex(candidates[0]);
  } catch {
    return null;
  }
}

export function extractVibrantColor(imageUrl: string): Promise<string | null> {
  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const color = getVibrantColorFromImage(img);
      if (color) colorCache.set(imageUrl, color);
      resolve(color);
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUrl;
  });
}

export function applyVibrantColor(color: string, isDark = true) {
  const root = document.documentElement;
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  let adjustedR = r;
  let adjustedG = g;
  let adjustedB = b;

  if (isDark) {
    while (brightness < 80) {
      adjustedR = Math.min(255, Math.round(adjustedR * 1.15));
      adjustedG = Math.min(255, Math.round(adjustedG * 1.15));
      adjustedB = Math.min(255, Math.round(adjustedB * 1.15));
      break;
    }
  } else {
    const darkBrightness = (adjustedR * 299 + adjustedG * 587 + adjustedB * 114) / 1000;
    if (darkBrightness > 150) {
      adjustedR = Math.round(adjustedR * 0.9);
      adjustedG = Math.round(adjustedG * 0.9);
      adjustedB = Math.round(adjustedB * 0.9);
    }
  }

  const adjustedColor = `#${((1 << 24) + (adjustedR << 16) + (adjustedG << 8) + adjustedB).toString(16).slice(1)}`;
  const adjustedColorRgb = `${adjustedR}, ${adjustedG}, ${adjustedB}`;

  const foreground = brightness > 128 ? "#000000" : "#ffffff";

  root.style.setProperty("--primary", adjustedColor);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--highlight", adjustedColor);
  root.style.setProperty("--highlight-rgb", adjustedColorRgb);
  root.style.setProperty("--active-highlight", adjustedColor);
  root.style.setProperty("--ring", adjustedColor);
  root.style.setProperty("--track-hover-bg", `rgba(${adjustedColorRgb}, 0.15)`);

  const fsBrightness = (r * 299 + g * 587 + b * 114) / 1000;
  let fsR = r;
  let fsG = g;
  let fsB = b;
  if (fsBrightness < 80) {
    fsR = Math.min(255, Math.round(r * 1.35));
    fsG = Math.min(255, Math.round(g * 1.35));
    fsB = Math.min(255, Math.round(b * 1.35));
  } else if (fsBrightness > 180) {
    fsR = Math.round(r * 0.85);
    fsG = Math.round(g * 0.85);
    fsB = Math.round(b * 0.85);
  }
  const fsColor = `#${((1 << 24) + (fsR << 16) + (fsG << 8) + fsB).toString(16).slice(1)}`;
  root.style.setProperty("--fs-accent", fsColor);
  root.style.setProperty("--fs-accent-rgb", `${fsR}, ${fsG}, ${fsB}`);
}

export function resetVibrantColor() {
  const root = document.documentElement;
  const vars = [
    "--primary",
    "--primary-foreground",
    "--highlight",
    "--highlight-rgb",
    "--active-highlight",
    "--ring",
    "--track-hover-bg",
    "--fs-accent",
    "--fs-accent-rgb",
  ];
  vars.forEach((v) => root.style.removeProperty(v));
}

export function clearColorCache() {
  colorCache.clear();
}
