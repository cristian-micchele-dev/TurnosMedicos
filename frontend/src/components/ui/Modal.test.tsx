import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const noop = () => {};

describe('Modal', () => {
  it('renders children when open=true', () => {
    render(
      <Modal isOpen={true} onClose={noop} title="My Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.getByText('My Modal')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(
      <Modal isOpen={false} onClose={noop} title="My Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="My Modal">
        <p>Content</p>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the close button', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="My Modal">
        <p>Content</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop overlay', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="My Modal">
        <p>Content</p>
      </Modal>,
    );
    // The backdrop has role="dialog". We click it directly.
    const backdrop = screen.getByRole('dialog');
    await userEvent.click(backdrop, { skipHover: true });
    expect(onClose).toHaveBeenCalled();
  });
});
