'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continuar',
  cancelText = 'Cancelar',
  danger = false,
}: ConfirmModalProps) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-danger/10 text-danger' : 'bg-white/5 text-text-primary'}`}>
                <AlertCircle size={20} />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{title || 'Confirmar Acción'}</h3>
            </div>
            
            <p className="mb-6 text-sm text-text-secondary leading-relaxed">
              {message || '¿Estás seguro de que deseas realizar esta acción?'}
            </p>

            <div className="flex w-full items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary active:scale-[0.98]"
              >
                {cancelText}
              </button>
              
              <button
                type="button"
                onClick={onConfirm}
                className={`cursor-pointer rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all active:scale-[0.98] ${
                  danger 
                    ? 'bg-danger text-white shadow-danger/20 hover:bg-danger/90'
                    : 'text-text-inverse hover:brightness-110'
                }`}
                style={!danger ? { backgroundColor: activeConfig.color, boxShadow: `0 4px 20px ${activeConfig.color}40` } : {}}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
