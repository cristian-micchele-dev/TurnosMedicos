import { render } from '@testing-library/react';
import { NeuralBackground } from './NeuralBackground';

const fakeContext = () => {
  const gradient = { addColorStop: vi.fn() };
  return {
    setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
    beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), bezierCurveTo: vi.fn(),
    drawImage: vi.fn(), createRadialGradient: vi.fn(() => gradient),
    fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: 'butt', globalCompositeOperation: 'source-over', globalAlpha: 1,
  };
};

describe('NeuralBackground', () => {
  it('renders a decorative canvas hidden from assistive tech', () => {
    const { container } = render(<NeuralBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not throw when the canvas context is unavailable (jsdom)', () => {
    expect(() => render(<NeuralBackground />)).not.toThrow();
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

    render(<NeuralBackground />);

    expect(raf).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled(); // the pre-rendered fibre layer was painted once
    raf.mockRestore();
    getContext.mockRestore();
  });
});
