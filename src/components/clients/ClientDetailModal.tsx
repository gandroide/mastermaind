import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, BUSINESS_UNITS } from '@/lib/store';
import type { Client } from '@/types/database';
import {
  X,
  Building2,
  Mail,
  Phone,
  FileText,
  Pencil,
  Briefcase,
  Calendar,
} from 'lucide-react';

interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onEdit: (client: Client) => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export default function ClientDetailModal({ open, onClose, client, onEdit }: ClientDetailModalProps) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  if (!client) return null;

  const bu = client.business_unit;
  const buConfig = BUSINESS_UNITS.find((u) => u.id === bu?.slug) ?? BUSINESS_UNITS[0];
  const buColor = bu?.color ?? buConfig.color;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="glass relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              boxShadow: `0 0 60px ${activeConfig.color}15, 0 25px 50px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Header / Avatar Area */}
            <div className="relative flex flex-col items-center justify-center border-b border-white/[0.06] p-8 pt-10 text-center">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
              >
                <X size={16} />
              </button>

              {/* Avatar Initial */}
              <div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${buColor}25, ${buColor}10)`,
                  color: buColor,
                  border: `1px solid ${buColor}30`,
                }}
              >
                {client.name.charAt(0).toUpperCase()}
              </div>

              <h2 className="text-xl font-bold text-text-primary">{client.name}</h2>
              {client.company && (
                <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-text-secondary">
                  <Building2 size={14} className="text-text-tertiary" />
                  {client.company}
                </p>
              )}

              {/* BU Badge */}
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider shadow-sm"
                  style={{
                    background: `${buColor}15`,
                    color: buColor,
                    border: `1px solid ${buColor}30`,
                  }}
                >
                  {bu?.name ?? 'Global'}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Email */}
                <div className="glass flex items-center gap-3 rounded-2xl p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-tertiary">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      Correo Electrónico
                    </p>
                    <p className="break-words text-sm font-medium text-text-primary">
                      {client.email || 'No especificado'}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="glass flex items-center gap-3 rounded-2xl p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-tertiary">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      Teléfono
                    </p>
                    <p className="break-words text-sm font-medium text-text-primary">
                      {client.phone || 'No especificado'}
                    </p>
                  </div>
                </div>

                {/* Created At */}
                <div className="glass flex items-center gap-3 rounded-2xl p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-tertiary">
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      Alta en el Sistema
                    </p>
                    <p className="break-words text-sm font-medium text-text-primary">
                      {new Date(client.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Role/Type generic block */}
                <div className="glass flex items-center gap-3 rounded-2xl p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-tertiary">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      Tipo de Entidad
                    </p>
                    <p className="break-words text-sm font-medium text-text-primary">
                      Cliente Corporativo
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="glass relative rounded-2xl p-5 border border-white/5">
                  <div className="absolute -top-3 left-4 bg-surface px-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      <FileText size={12} />
                      Notas Adicionales
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 border-t border-white/[0.06] p-6 bg-black/20">
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary active:scale-[0.98]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // Short delay to let the close animation start before opening edit modal
                  setTimeout(() => onEdit(client), 150);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)`,
                }}
              >
                <Pencil size={16} />
                Editar Cliente
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
