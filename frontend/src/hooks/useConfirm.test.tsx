import { act, renderHook } from '@testing-library/react';
import { useConfirm } from './useConfirm';

describe('useConfirm', () => {
  it('confirm() returns a Promise', () => {
    const { result } = renderHook(() => useConfirm());
    let promise: Promise<boolean> | undefined;

    act(() => {
      promise = result.current.confirm({ title: 'Test', message: 'Are you sure?' });
    });

    expect(promise).toBeInstanceOf(Promise);
  });

  it('dialogProps.isOpen becomes true after confirm() is called', () => {
    const { result } = renderHook(() => useConfirm());

    expect(result.current.dialogProps.isOpen).toBe(false);

    act(() => {
      result.current.confirm({ title: 'Delete', message: 'Sure?' });
    });

    expect(result.current.dialogProps.isOpen).toBe(true);
    expect(result.current.dialogProps.title).toBe('Delete');
    expect(result.current.dialogProps.message).toBe('Sure?');
  });

  it('onConfirm resolves the promise with true and closes dialog', async () => {
    const { result } = renderHook(() => useConfirm());
    let resolved: boolean | undefined;

    act(() => {
      result.current.confirm({ title: 'T', message: 'M' }).then((v) => {
        resolved = v;
      });
    });

    await act(async () => {
      result.current.dialogProps.onConfirm();
    });

    expect(resolved).toBe(true);
    expect(result.current.dialogProps.isOpen).toBe(false);
  });

  it('onClose resolves the promise with false and closes dialog', async () => {
    const { result } = renderHook(() => useConfirm());
    let resolved: boolean | undefined;

    act(() => {
      result.current.confirm({ title: 'T', message: 'M' }).then((v) => {
        resolved = v;
      });
    });

    await act(async () => {
      result.current.dialogProps.onClose();
    });

    expect(resolved).toBe(false);
    expect(result.current.dialogProps.isOpen).toBe(false);
  });

  it('state resets to initial after close', async () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ title: 'Delete', message: 'Sure?' });
    });

    await act(async () => {
      result.current.dialogProps.onClose();
    });

    expect(result.current.dialogProps.isOpen).toBe(false);
    expect(result.current.dialogProps.title).toBe('');
    expect(result.current.dialogProps.message).toBe('');
  });
});
