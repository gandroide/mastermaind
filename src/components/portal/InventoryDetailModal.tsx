'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '@/types/database';
import { X, Package, FileText, ZoomIn, Pencil } from 'lucide-react';
import { useState } from 'react';
import SchematicViewerModal from '@/components/inventory/SchematicViewerModal';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onEdit?: () => void;
}

export default function InventoryDetailModal({ item, onClose, onEdit }: Props) {
  const [imageZoomed, setImageZoomed] = useState(false);
  const [schematicOpen, setSchematicOpen] = useState(false);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-surface-0"
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="glass flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="min-w-0 flex-1 text-sm font-bold text-text-primary line-clamp-1">
            {item.item_name}
          </h2>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary"
                style={{ touchAction: 'manipulation' }}
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-lg space-y-6">
            {/* Reference image */}
            <div className="overflow-hidden rounded-2xl bg-surface-2">
              {item.image_url ? (
                <div className="relative">
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className={`w-full transition-transform duration-300 ${
                      imageZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    style={{ objectFit: 'contain', maxHeight: imageZoomed ? 'none' : '300px' }}
                    onClick={() => setImageZoomed(!imageZoomed)}
                  />
                  <button
                    onClick={() => setImageZoomed(!imageZoomed)}
                    className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <Package size={48} className="text-text-tertiary" />
                </div>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              {item.category && (
                <span className="rounded-lg bg-accent-bioalert/10 px-3 py-1.5 text-xs font-semibold text-accent-bioalert">
                  {item.category}
                </span>
              )}
              {item.location && (
                <span className="rounded-lg bg-accent-brivex/10 px-3 py-1.5 text-xs font-semibold text-accent-brivex">
                  📍 {item.location}
                </span>
              )}
              <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-text-primary">
                {item.quantity} unidades
              </span>
              {item.sku && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-mono text-text-secondary">
                  SKU: {item.sku}
                </span>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Descripción Técnica
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Notas
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {item.notes}
                </p>
              </div>
            )}

            {/* Schematic button — opens inline viewer */}
            {item.schematic_url && (
              <button
                onClick={() => setSchematicOpen(true)}
                className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl text-sm font-semibold text-text-inverse transition-all active:scale-[0.98] hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #34d399, #059669)',
                  touchAction: 'manipulation',
                }}
              >
                <FileText size={20} />
                Ver Esquema Eléctrico
              </button>
            )}

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 text-sm font-medium text-text-secondary transition-all active:scale-[0.98] hover:bg-white/5"
                style={{ touchAction: 'manipulation' }}
              >
                <Pencil size={16} />
                Editar Ítem
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Inline Schematic Viewer */}
      <AnimatePresence>
        {schematicOpen && item.schematic_url && (
          <SchematicViewerModal
            url={item.schematic_url}
            title={`Esquema — ${item.item_name}`}
            onClose={() => setSchematicOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
