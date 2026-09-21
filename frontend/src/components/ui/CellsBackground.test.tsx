import { render } from '@testing-library/react';
import { CellsBackground } from './CellsBackground';

// jsdom has no canvas: getContext returns null. The component must still mount
// silently and stay out of the accessibility tree — it is decoration only.
describe('CellsBackground', () => {
  it('renders a decorative canvas hidden from assistive tech and pointer events', () => {
    const { container } = render(<CellsBackground intensity="soft" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not throw when the canvas context is unavailable', () => {
    expect(() => render(<CellsBackground intensity="strong" />)).not.toThrow();
  });

  it('honours prefers-reduced-motion: paints one still frame and schedules no animation frames', () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
      scale: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      createRadialGradient: vi.fn(() => gradient), fillStyle: '', strokeStyle: '', lineWidth: 0,
    };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as unknown as typeof ResizeObserver;

    render(<CellsBackground intensity="soft" />);

    expect(raf).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalled();

    raf.mockRestore();
    getContext.mockRestore();
  });
});
