import { useEffect, useRef } from 'react';
import styles from './Backdrop.module.css';

interface NeuralBackgroundProps {
  className?: string;
}

type RGB = [number, number, number];

interface Palette {
  fibres: RGB[];
  /** The flash when a signal reaches a soma: warm white on dark, deep blue on paper. */
  flash: RGB;
  /** Overall strength; the content sits on a wash above it, so the dark theme can afford full strength. */
  alpha: number;
}

interface Node {
  x: number;
  y: number;
  r: number;
  /** 0..1, decays every frame; set to 1 when a pulse arrives. */
  glow: number;
  phase: number;
}

interface Fibre {
  from: Node;
  to: Node;
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  color: RGB;
  width: number;
  length: number;
}

interface Pulse {
  fibre: Fibre;
  t: number;
  speed: number;
  color: RGB;
}

// There is no light palette on purpose: glowing fibres on paper read as scribbles.
const DARK: Palette = {
  fibres: [[56, 189, 248], [45, 212, 191], [107, 155, 209]],
  flash: [255, 244, 214],
  alpha: 1,
};
const NODES_PER_MEGAPIXEL = 40;
const MAX_PULSES = 36;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function bezier(f: Fibre, t: number) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * f.from.x + b * f.c1.x + c * f.c2.x + d * f.to.x,
    y: a * f.from.y + b * f.c1.y + c * f.c2.y + d * f.to.y,
  };
}

// Somas scattered with a little breathing room, each wired to its three or four nearest
// neighbours by a fibre that bows sideways so the mesh reads as tissue, not a graph.
function buildNetwork(width: number, height: number, palette: Palette): { nodes: Node[]; fibres: Fibre[] } {
  const count = Math.max(10, Math.round((width * height) / 1_000_000 * NODES_PER_MEGAPIXEL));
  const margin = 40;
  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, ok = false;
    for (let tries = 0; tries < 12 && !ok; tries++) {
      x = rand(-margin, width + margin);
      y = rand(-margin, height + margin);
      ok = nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 72);
    }
    nodes.push({ x, y, r: rand(2.6, 5.5), glow: 0, phase: rand(0, Math.PI * 2) });
  }

  const fibres: Fibre[] = [];
  const linked = new Set<string>();
  for (const n of nodes) {
    const near = nodes
      .filter((m) => m !== n)
      .map((m) => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3 + (Math.random() < 0.4 ? 1 : 0));
    for (const { m, d } of near) {
      const key = [nodes.indexOf(n), nodes.indexOf(m)].sort((a, b) => a - b).join('-');
      if (linked.has(key)) continue;
      linked.add(key);
      // Control points offset perpendicular to the chord, in opposite directions: an S-curve.
      const dx = m.x - n.x, dy = m.y - n.y;
      const nx = -dy / d, ny = dx / d;
      const bow = d * rand(0.18, 0.42);
      const side = Math.random() < 0.5 ? 1 : -1;
      fibres.push({
        from: n,
        to: m,
        c1: { x: n.x + dx * 0.3 + nx * bow * side, y: n.y + dy * 0.3 + ny * bow * side },
        c2: { x: n.x + dx * 0.7 - nx * bow * side * 0.6, y: n.y + dy * 0.7 - ny * bow * side * 0.6 },
        color: palette.fibres[Math.floor(Math.random() * palette.fibres.length)],
        width: rand(0.9, 2),
        length: d,
      });
    }
  }
  return { nodes, fibres };
}

// The fibre mesh does not change per frame: render it once with its glow into a layer.
function renderFibreLayer(width: number, height: number, dpr: number, fibres: Fibre[], palette: Palette): HTMLCanvasElement | null {
  const layer = document.createElement('canvas');
  layer.width = Math.round(width * dpr);
  layer.height = Math.round(height * dpr);
  const ctx = layer.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  for (const f of fibres) {
    // Glow by layering: a wide faint stroke, a mid one, and the bright core.
    for (const [w, a] of [[f.width * 10, 0.06], [f.width * 4, 0.18], [f.width * 1.4, 0.75]] as const) {
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(f.color, a * palette.alpha);
      ctx.beginPath();
      ctx.moveTo(f.from.x, f.from.y);
      ctx.bezierCurveTo(f.c1.x, f.c1.y, f.c2.x, f.c2.y, f.to.x, f.to.y);
      ctx.stroke();
    }
  }
  return layer;
}

function drawNodes(ctx: CanvasRenderingContext2D, nodes: Node[], t: number, palette: Palette) {
  for (const n of nodes) {
    const breathe = 0.85 + Math.sin(t * 0.0012 + n.phase) * 0.15;
    const r = n.r * breathe;
    const halo = r * (4 + n.glow * 8);
    const color = n.glow > 0.05 ? palette.flash : palette.fibres[0];
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, halo);
    g.addColorStop(0, rgba(color, (0.55 + n.glow * 0.45) * palette.alpha));
    g.addColorStop(0.35, rgba(color, (0.16 + n.glow * 0.3) * palette.alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(n.x, n.y, halo, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(color, (0.8 + n.glow * 0.2) * palette.alpha);
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();
    n.glow *= 0.955;
  }
}

function drawPulse(ctx: CanvasRenderingContext2D, p: Pulse, palette: Palette) {
  // A bright head with a comet tail of fading beads behind it.
  for (let k = 0; k < 10; k++) {
    const tt = p.t - k * 0.014;
    if (tt < 0) break;
    const { x, y } = bezier(p.fibre, tt);
    const a = (1 - k / 10) * palette.alpha;
    const r = 3.4 - k * 0.28;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, rgba(palette.flash, 0.9 * a));
    g.addColorStop(0.3, rgba(p.color, 0.5 * a));
    g.addColorStop(1, rgba(p.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A resting neural mesh in the brand's blues: glowing fibres between somas, signals
 * travelling along them and lighting up the cell they reach. The fibre layer renders
 * once; per frame only pulses and node halos are drawn. Decoration only: aria-hidden,
 * no pointer, paused when the tab is hidden, a single still frame under reduced motion.
 */
export function NeuralBackground({ className }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const palette = DARK;
    let nodes: Node[] = [];
    let fibres: Fibre[] = [];
    let layer: HTMLCanvasElement | null = null;
    let pulses: Pulse[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = false;
    let last = 0;
    const still = prefersReducedMotion();

    const rebuild = () => {
      ({ nodes, fibres } = buildNetwork(width, height, palette));
      layer = renderFibreLayer(width, height, dpr, fibres, palette);
      pulses = [];
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    };

    const spawnPulse = () => {
      if (pulses.length >= MAX_PULSES || fibres.length === 0) return;
      const fibre = fibres[Math.floor(Math.random() * fibres.length)];
      const forward = Math.random() < 0.5;
      pulses.push({
        fibre: forward ? fibre : { ...fibre, from: fibre.to, to: fibre.from, c1: fibre.c2, c2: fibre.c1 },
        t: 0,
        // Longer fibres take longer to cross: roughly constant px per second.
        speed: (130 / fibre.length) * rand(0.8, 1.3) / 60,
        color: fibre.color,
      });
    };

    const paint = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      if (layer) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      }
      drawNodes(ctx, nodes, t, palette);
      for (const p of pulses) drawPulse(ctx, p, palette);
    };

    const step = (t: number) => {
      const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
      last = t;
      if (Math.random() < 0.14 * dt) spawnPulse();
      for (const p of pulses) p.t += p.speed * dt;
      // A pulse that reaches its soma lights it up and is spent.
      for (const p of pulses) if (p.t >= 1) p.fibre.to.glow = 1;
      pulses = pulses.filter((p) => p.t < 1);
      paint(t);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || still || isLightTheme()) return;
      running = true;
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      last = 0;
      cancelAnimationFrame(frame);
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    // Paper by day, tissue by night: the theme switch turns the mesh on and off live.
    const paintStill = () => {
      // A still frame still shows life: a few somas lit.
      nodes.slice(0, 3).forEach((n) => { n.glow = 1; });
      paint(0);
    };
    const sync = () => {
      if (isLightTheme()) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else if (still) {
        paintStill();
      } else {
        start();
      }
    };
    const themeWatcher = new MutationObserver(sync);

    resize();
    sync();

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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={[styles.canvas, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
