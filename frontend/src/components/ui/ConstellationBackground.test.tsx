import { render } from '@testing-library/react';
import { ConstellationBackground } from './ConstellationBackground';

const fakeContext = () => {
  const gradient = { addColorStop: vi.fn() };
  return {
    setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
    beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    drawImage: vi.fn(), createRadialGradient: vi.fn(() => gradient),
    fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: 'butt', globalCompositeOperation: 'source-over', globalAlpha: 1,
  };
};

describe('ConstellationBackground', () => {
  it('renders a decorative canvas hidden from assistive tech', () => {
    const { container } = render(<ConstellationBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not throw when the canvas context is unavailable (jsdom)', () => {
    expect(() => render(<ConstellationBackground />)).not.toThrow();
  });

  it('honours prefers-reduced-motion: one still frame, no animation frames', () => {
    const ctx = fakeContext();
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as unknown as typeof ResizeObserver;

    render(<ConstellationBackground />);

    expect(raf).not.toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled(); // the still frame was painted
    raf.mockRestore();
    getContext.mockRestore();
  });
});
