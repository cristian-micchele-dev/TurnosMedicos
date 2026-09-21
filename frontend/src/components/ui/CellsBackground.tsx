import { useEffect, useRef } from 'react';
import styles from './CellsBackground.module.css';

interface CellsBackgroundProps {
  /** `soft` sits behind content (dashboard); `strong` is the scene itself (login). */
  intensity?: 'soft' | 'strong';
  className?: string;
}

type RGB = [number, number, number];

interface Palette {
  /** Nucleus: lit side → body → shadow rim. */
  nucleusLight: RGB;
  nucleus: RGB;
  nucleusDark: RGB;
  /** Membrane: the milky, frosted envelope. */
  membrane: RGB;
  membraneRim: RGB;
}

interface Cell {
  x: number;
  y: number;
  r: number;
  /** 0 = far (small, sharp, slow) … 1 = near (large, blurred, fast). */
  depth: number;
  heading: number;
  speed: number;
  wander: number;
  phase: number;
  spin: number;
  membrane: HTMLCanvasElement | null;
  nucleus: HTMLCanvasElement | null;
  nucleusRatio: number;
}

// Cell biology in the brand's blues: cyan light on a deep-blue body, a whitish membrane.
const DARK: Palette = {
  nucleusLight: [170, 225, 255],
  nucleus: [56, 150, 235],
  nucleusDark: [14, 54, 120],
  membrane: [205, 228, 250],
  membraneRim: [235, 245, 255],
};
// On clinical paper the same cells read as ink: deeper blues.
const LIGHT: Palette = {
  nucleusLight: [150, 200, 240],
  nucleus: [46, 110, 180],
  nucleusDark: [20, 48, 100],
  membrane: [74, 111, 165],
  membraneRim: [120, 160, 210],
};

// speed is px per 60fps-frame; near cells move faster (parallax) and cross a screen in ~40 s.
const SETTINGS = {
  soft: { count: 12, alpha: 0.5, minR: 22, maxR: 120, speed: 0.45 },
  strong: { count: 22, alpha: 1, minR: 18, maxR: 170, speed: 0.6 },
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const blurFor = (depth: number) => (depth > 0.72 ? ((depth - 0.72) / 0.28) * 5 : 0);

function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sprite(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  return ctx ? [c, ctx] : null;
}

// A lumpy closed outline: the radius wobbles with a few sine harmonics so no two membranes match.
function lumpyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seedA: number, seedB: number, amount: number) {
  const steps = 96;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble = 1 + amount * (0.55 * Math.sin(7 * a + seedA) + 0.3 * Math.sin(13 * a + seedB) + 0.15 * Math.sin(23 * a + seedA * 2));
    const x = cx + Math.cos(a) * r * wobble;
    const y = cy + Math.sin(a) * r * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// The frosted envelope: milky fill that brightens toward a rugged rim, plus a soft outer haze.
function membraneSprite(r: number, p: Palette, alpha: number, blur: number, seedA: number, seedB: number): HTMLCanvasElement | null {
  const pad = Math.ceil(r * 0.35 + blur * 3);
  const size = Math.ceil(r * 2 + pad * 2);
  const made = sprite(size);
  if (!made) return null;
  const [canvas, ctx] = made;
  const c = size / 2;

  if (blur > 0) ctx.filter = `blur(${blur}px)`;

  // Outer haze.
  const haze = ctx.createRadialGradient(c, c, r * 0.9, c, c, r * 1.25);
  haze.addColorStop(0, rgba(p.membrane, 0.16 * alpha));
  haze.addColorStop(1, rgba(p.membrane, 0));
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(c, c, r * 1.25, 0, Math.PI * 2);
  ctx.fill();

  // Body: translucent in the middle, denser and lighter toward the edge.
  const body = ctx.createRadialGradient(c - r * 0.15, c - r * 0.15, r * 0.2, c, c, r);
  body.addColorStop(0, rgba(p.membrane, 0.06 * alpha));
  body.addColorStop(0.7, rgba(p.membrane, 0.14 * alpha));
  body.addColorStop(0.92, rgba(p.membraneRim, 0.34 * alpha));
  body.addColorStop(1, rgba(p.membraneRim, 0.10 * alpha));
  lumpyPath(ctx, c, c, r, seedA, seedB, 0.05);
  ctx.fillStyle = body;
  ctx.fill();

  // Rugged rim: two lumpy strokes, the inner one fainter — the "cauliflower" edge.
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.strokeStyle = rgba(p.membraneRim, 0.55 * alpha);
  lumpyPath(ctx, c, c, r * 0.97, seedA, seedB, 0.05);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.6, r * 0.02);
  ctx.strokeStyle = rgba(p.membraneRim, 0.25 * alpha);
  lumpyPath(ctx, c, c, r * 0.86, seedB, seedA, 0.06);
  ctx.stroke();

  // Frosted texture: a scatter of tiny pale flecks inside the envelope.
  ctx.fillStyle = rgba(p.membraneRim, 0.18 * alpha);
  const flecks = Math.round(r * 1.2);
  for (let i = 0; i < flecks; i++) {
    const a = rand(0, Math.PI * 2);
    const d = Math.sqrt(Math.random()) * r * 0.95;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, rand(0.4, r * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

// The nucleus: a lit sphere with a granular skin and a dark rim.
function nucleusSprite(r: number, p: Palette, alpha: number, blur: number): HTMLCanvasElement | null {
  const pad = Math.ceil(blur * 3 + 2);
  const size = Math.ceil(r * 2 + pad * 2);
  const made = sprite(size);
  if (!made) return null;
  const [canvas, ctx] = made;
  const c = size / 2;

  if (blur > 0) ctx.filter = `blur(${blur}px)`;

  // Sphere shading: light from the upper left.
  const shade = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.05, c, c, r);
  shade.addColorStop(0, rgba(p.nucleusLight, 0.95 * alpha));
  shade.addColorStop(0.35, rgba(p.nucleus, 0.95 * alpha));
  shade.addColorStop(0.85, rgba(p.nucleusDark, 0.95 * alpha));
  shade.addColorStop(1, rgba(p.nucleusDark, 0.6 * alpha));
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  // Granular skin: clipped speckles, lighter on the lit side, darker on the shadow side.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  const grains = Math.round(r * 2.2);
  for (let i = 0; i < grains; i++) {
    const a = rand(0, Math.PI * 2);
    const d = Math.sqrt(Math.random()) * r;
    const x = c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    const lit = c - x + (c - y) > 0;
    ctx.fillStyle = lit ? rgba(p.nucleusLight, 0.22 * alpha) : rgba(p.nucleusDark, 0.28 * alpha);
    ctx.beginPath();
    ctx.arc(x, y, rand(0.5, r * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Specular highlight and a thin dark rim.
  const glint = ctx.createRadialGradient(c - r * 0.4, c - r * 0.45, 0, c - r * 0.4, c - r * 0.45, r * 0.45);
  glint.addColorStop(0, rgba([255, 255, 255], 0.45 * alpha));
  glint.addColorStop(1, rgba([255, 255, 255], 0));
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.arc(c - r * 0.4, c - r * 0.45, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.strokeStyle = rgba(p.nucleusDark, 0.55 * alpha);
  ctx.beginPath();
  ctx.arc(c, c, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function seed(width: number, height: number, intensity: 'soft' | 'strong', p: Palette): Cell[] {
  const s = SETTINGS[intensity];
  const cells = Array.from({ length: s.count }, () => {
    // Skew toward small, far cells; the few near ones dominate the frame like in a micrograph.
    const depth = Math.random() ** 1.8;
    const r = s.minR + (s.maxR - s.minR) * depth;
    const blur = blurFor(depth);
    const nucleusRatio = rand(0.42, 0.6);
    const phase = rand(0, Math.PI * 2);
    const wander = rand(0.5, 1.5);
    return {
      x: rand(0, width),
      y: rand(0, height),
      r,
      depth,
      heading: rand(0, Math.PI * 2),
      // Parallax: near cells sweep past, far ones creep.
      speed: rand(0.7, 1.1) * s.speed * (0.35 + depth * 1.1),
      wander,
      phase,
      spin: rand(-0.0025, 0.0025),
      membrane: membraneSprite(r, p, s.alpha, blur, phase, wander),
      nucleus: nucleusSprite(r * nucleusRatio, p, s.alpha, blur * 0.8),
      nucleusRatio,
    };
  });
  // Far cells first so the near, blurred ones overlap them.
  return cells.sort((a, b) => a.depth - b.depth);
}

function drawCell(ctx: CanvasRenderingContext2D, c: Cell, t: number) {
  // A slow breath and a lazy roll; the nucleus drifts inside on its own rhythm.
  const breathe = 1 + Math.sin(t * 0.0008 + c.phase) * 0.04;
  const roll = t * c.spin * 0.05 + c.phase;
  const nx = Math.cos(t * 0.00035 + c.phase) * c.r * 0.16;
  const ny = Math.sin(t * 0.00045 + c.phase) * c.r * 0.12;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(breathe, breathe);
  ctx.rotate(roll);
  if (c.membrane) ctx.drawImage(c.membrane, -c.membrane.width / 2, -c.membrane.height / 2);
  ctx.rotate(-roll); // the nucleus keeps its light from the upper left
  if (c.nucleus) ctx.drawImage(c.nucleus, nx - c.nucleus.width / 2, ny - c.nucleus.height / 2);
  ctx.restore();
}

/**
 * Cells under a microscope, in the brand's blues: frosted lumpy membranes, granular lit
 * nuclei, near ones large and out of focus, far ones small and sharp. Each cell is
 * rendered once into a sprite; per frame it is only moved and scaled. Pure decoration:
 * hidden from assistive tech, ignores the pointer, stops when the tab is hidden, and
 * draws a single still frame when the visitor prefers reduced motion.
 */
export function CellsBackground({ intensity = 'soft', className }: CellsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let palette = isLightTheme() ? LIGHT : DARK;
    let cells: Cell[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let last = 0;
    const still = prefersReducedMotion();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cells.length === 0) cells = seed(width, height, intensity, palette);
    };

    const paint = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const c of cells) drawCell(ctx, c, t);
    };

    const step = (t: number) => {
      // Frame-rate independent: 1 = one 60 fps frame; capped so a background tab does not teleport cells.
      const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
      last = t;
      for (const c of cells) {
        // Meander: the heading swings slowly so paths curve instead of running straight.
        c.heading += Math.sin(t * 0.0004 * c.wander + c.phase) * 0.012 * dt;
        c.x += Math.cos(c.heading) * c.speed * dt;
        c.y += Math.sin(c.heading) * c.speed * dt;
        // Wrap around with a margin so a cell never pops in at the edge.
        const m = c.r * 1.4;
        if (c.x < -m) c.x = width + m;
        if (c.x > width + m) c.x = -m;
        if (c.y < -m) c.y = height + m;
        if (c.y > height + m) c.y = -m;
      }
      paint(t);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || still) return;
      running = true;
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      last = 0;
      cancelAnimationFrame(frame);
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    // Theme toggled: re-render the sprites in the other palette; positions are kept.
    const themeWatcher = new MutationObserver(() => {
      palette = isLightTheme() ? LIGHT : DARK;
      const s = SETTINGS[intensity];
      for (const c of cells) {
        const blur = blurFor(c.depth);
        c.membrane = membraneSprite(c.r, palette, s.alpha, blur, c.phase, c.wander);
        c.nucleus = nucleusSprite(c.r * c.nucleusRatio, palette, s.alpha, blur * 0.8);
      }
      if (still) paint(0);
    });

    resize();
    if (still) paint(0);
    else start();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      observer.disconnect();
      themeWatcher.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={[styles.canvas, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
