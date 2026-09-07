import { useState, useCallback } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

const INITIAL_STATE: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  resolve: null,
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, ...options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState(INITIAL_STATE);
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(INITIAL_STATE);
  }, [state]);

  const dialogProps: Omit<ConfirmDialogProps, 'loading'> = {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
    onClose: handleClose,
    onConfirm: handleConfirm,
  };

  return { confirm, dialogProps, ConfirmDialog };
}
