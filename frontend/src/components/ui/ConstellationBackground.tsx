import { useEffect, useRef } from 'react';
import styles from './Backdrop.module.css';

interface ConstellationBackgroundProps {
  /** `soft` sits behind data (dashboard); `strong` is the login scene — same sky, more of it. */
  intensity?: 'soft' | 'strong';
  className?: string;
}

type RGB = [number, number, number];

interface Palette {
  star: RGB;
  line: RGB;
  /** Overall strength: the whole point of this backdrop is to stay near silence. */
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  /** Twinkle phase; brightness breathes very slowly. */
  phase: number;
}

// A cyan so faint it reads as a memory of the brand, not a highlight.
const DARK: Palette = { star: [125, 211, 252], line: [125, 211, 252], alpha: 1 };
const LIGHT: Palette = { star: [46, 78, 128], line: [46, 78, 128], alpha: 0.8 };

// One sky, two intensities: the same look reads as one product across screens.
const SETTINGS = {
  soft: { starsPerMegapixel: 14, linkDistance: 190, drift: 0.12, alpha: 1 },
  strong: { starsPerMegapixel: 26, linkDistance: 230, drift: 0.16, alpha: 1.6 },
};
type Intensity = keyof typeof SETTINGS;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Stars scattered with breathing room so the sky never clumps.
function seed(width: number, height: number, intensity: Intensity): Star[] {
  const s = SETTINGS[intensity];
  const count = Math.max(8, Math.round((width * height) / 1_000_000 * s.starsPerMegapixel));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, ok = false;
    for (let tries = 0; tries < 16 && !ok; tries++) {
      x = rand(0, width);
      y = rand(0, height);
      ok = stars.every((s) => Math.hypot(s.x - x, s.y - y) > 80);
    }
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.5, 1) * s.drift;
    stars.push({ x, y, r: rand(1.4, 2.4), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, phase: rand(0, Math.PI * 2) });
  }
  return stars;
}

function paint(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, t: number, p: Palette, intensity: Intensity) {
  const linkDistance = SETTINGS[intensity].linkDistance;
  // May exceed 1 on the strong sky; the canvas clamps colour alpha, so cores saturate and halos widen.
  const alpha = p.alpha * SETTINGS[intensity].alpha;
  ctx.clearRect(0, 0, width, height);

  // Lines first, under the stars. Opacity falls off with distance, so a link fades in
  // as two stars approach and fades out as they part — the only motion that matters here.
  ctx.lineWidth = 1;
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i], b = stars[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > linkDistance) continue;
      const strength = 1 - d / linkDistance;
      ctx.strokeStyle = rgba(p.line, 0.18 * strength * alpha);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (const s of stars) {
    const twinkle = 0.7 + Math.sin(t * 0.0006 + s.phase) * 0.3;
    // A soft halo and a crisp core: the star reads even at 2px.
    const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
    halo.addColorStop(0, rgba(p.star, 0.35 * twinkle * alpha));
    halo.addColorStop(1, rgba(p.star, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.star, 0.9 * twinkle * alpha);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A quiet constellation in the brand's blue: a few small stars drifting so slowly that
 * the faint lines between them form and dissolve over seconds. Decoration only:
 * aria-hidden, no pointer, paused when the tab is hidden, a still frame under reduced motion.
 */
export function ConstellationBackground({ intensity = 'soft', className }: ConstellationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let palette = isLightTheme() ? LIGHT : DARK;
    let stars: Star[] = [];
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
      if (stars.length === 0) stars = seed(width, height, intensity);
    };

    const step = (t: number) => {
      const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
      last = t;
      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // Bounce softly off the edges so the sky never empties.
        if (s.x < 0 || s.x > width) s.vx = -s.vx;
        if (s.y < 0 || s.y > height) s.vy = -s.vy;
      }
      paint(ctx, stars, width, height, t, palette, intensity);
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

    const themeWatcher = new MutationObserver(() => {
      palette = isLightTheme() ? LIGHT : DARK;
      if (still) paint(ctx, stars, width, height, 0, palette, intensity);
    });

    resize();
    if (still) paint(ctx, stars, width, height, 0, palette, intensity);
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
