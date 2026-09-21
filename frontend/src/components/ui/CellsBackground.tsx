import { useEffect, useRef } from 'react';
import styles from './CellsBackground.module.css';

interface CellsBackgroundProps {
  /** `soft` sits behind content (dashboard); `strong` is the scene itself (login). */
  intensity?: 'soft' | 'strong';
  className?: string;
}

interface Cell {
  x: number;
  y: number;
  r: number;
  heading: number;
  speed: number;
  wander: number;
  phase: number;
  spin: number;
  color: [number, number, number];
}

// Brand hues: cyan (primary), teal accent and the deeper brand blue.
const DARK_PALETTE: [number, number, number][] = [[56, 189, 248], [45, 212, 191], [107, 155, 209]];
const LIGHT_PALETTE: [number, number, number][] = [[74, 111, 165], [13, 148, 136], [46, 78, 128]];

// speed is px per frame at 60 fps: a cell crosses a 1400px screen in roughly 40–60 s,
// slow enough to feel alive, fast enough that every cell visibly travels the whole screen.
const SETTINGS = {
  soft: { count: 14, alpha: 0.55, minR: 28, maxR: 70, speed: 0.5 },
  strong: { count: 26, alpha: 1, minR: 34, maxR: 110, speed: 0.65 },
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function seed(width: number, height: number, intensity: 'soft' | 'strong', palette: [number, number, number][]): Cell[] {
  const s = SETTINGS[intensity];
  return Array.from({ length: s.count }, () => {
    const r = rand(s.minR, s.maxR);
    return {
      x: rand(0, width),
      y: rand(0, height),
      r,
      heading: rand(0, Math.PI * 2),
      // Small cells are nimble, big ones lumber: speed scales inversely with size.
      speed: rand(0.6, 1.1) * s.speed * (s.maxR / r) ** 0.35,
      wander: rand(0.5, 1.5),
      phase: rand(0, Math.PI * 2),
      spin: rand(-0.004, 0.004),
      color: palette[Math.floor(Math.random() * palette.length)],
    };
  });
}

function drawCell(ctx: CanvasRenderingContext2D, c: Cell, t: number, alpha: number) {
  const [r, g, b] = c.color;
  // A slow "breath": the membrane swells and settles, slightly out of round.
  const breathe = 1 + Math.sin(t * 0.0009 + c.phase) * 0.06;
  const radius = c.r * breathe;
  const squash = 1 + Math.sin(t * 0.0006 + c.phase * 1.7) * 0.08;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.phase + t * c.spin * 0.05);
  ctx.scale(squash, 1 / squash);

  // Cytoplasm: soft fill, brighter toward the edge like a lit membrane.
  const body = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
  body.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.02 * alpha})`);
  body.addColorStop(0.78, `rgba(${r}, ${g}, ${b}, ${0.07 * alpha})`);
  body.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Membrane: a thin ring with a faint inner echo.
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.22 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.10 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  ctx.stroke();

  // Nucleus: off-centre, drifting on its own rhythm.
  const nx = Math.cos(t * 0.0004 + c.phase) * radius * 0.22;
  const ny = Math.sin(t * 0.0005 + c.phase) * radius * 0.18;
  const nucleus = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius * 0.28);
  nucleus.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.32 * alpha})`);
  nucleus.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = nucleus;
  ctx.beginPath();
  ctx.arc(nx, ny, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Drifting, breathing cells in the brand palette. Pure decoration: hidden from
 * assistive tech, ignores the pointer, stops when the tab is hidden, and draws a
 * single still frame when the visitor prefers reduced motion.
 */
export function CellsBackground({ intensity = 'soft', className }: CellsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const settings = SETTINGS[intensity];
    let palette = isLightTheme() ? LIGHT_PALETTE : DARK_PALETTE;
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
      for (const c of cells) drawCell(ctx, c, t, settings.alpha);
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
        const m = c.r * 1.2;
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

    // Recolour when the theme toggles; the cells keep their positions.
    const themeWatcher = new MutationObserver(() => {
      palette = isLightTheme() ? LIGHT_PALETTE : DARK_PALETTE;
      cells.forEach((c, i) => { c.color = palette[i % palette.length]; });
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
