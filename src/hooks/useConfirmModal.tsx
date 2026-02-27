import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}

export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Add small delay before clearing options so exit animation doesn't pop
    setTimeout(() => setOptions(null), 200);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (options?.onConfirm) {
      await options.onConfirm();
    }
    close();
  }, [options, close]);

  return {
    isOpen,
    options,
    confirm,
    close,
    handleConfirm,
  };
}
