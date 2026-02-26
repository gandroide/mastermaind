'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '@/types/database';
import SchematicViewerModal from '@/components/inventory/SchematicViewerModal';
import { X, Package, MapPin, ZoomIn, FileText } from 'lucide-react';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

export default function InventoryDetailView({ item, onClose }: Props) {
  const [imageZoomed, setImageZoomed] = useState(false);
  const [schematicOpen, setSchematicOpen] = useState(false);

  return (
    <>
      {/* Overlay + Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="glass relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/[0.08]"
          style={{ maxHeight: '90dvh', boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 25px 50px rgba(0,0,0,0.4)' }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
          exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-text-primary md:text-2xl">
                {item.item_name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.category && (
                  <span className="rounded-lg bg-accent-bioalert/10 px-3 py-1 text-xs font-semibold text-accent-bioalert">
                    {item.category}
                  </span>
                )}
                {item.sku && (
                  <span className="rounded-lg bg-white/5 px-3 py-1 text-xs font-mono text-text-tertiary">
                    {item.sku}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-text-tertiary hover:bg-white/5 hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
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
                      style={{ objectFit: 'contain', maxHeight: imageZoomed ? 'none' : '320px' }}
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
                  <div className="flex h-40 items-center justify-center">
                    <Package size={48} className="text-text-tertiary" />
                  </div>
                )}
              </div>

              {/* Key metrics row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="glass rounded-xl px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Cantidad</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">
                    {item.quantity} <span className="text-sm font-normal text-text-tertiary">uds</span>
                  </p>
                </div>
                {item.location && (
                  <div className="glass rounded-xl px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Ubicación</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                      <MapPin size={13} className="text-text-tertiary" />
                      {item.location}
                    </p>
                  </div>
                )}
                {item.business_unit && (
                  <div className="glass rounded-xl px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Unidad</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{item.business_unit.name}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
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
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Notas
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                    {item.notes}
                  </p>
                </div>
              )}

              {/* Schematic button */}
              {item.schematic_url && (
                <button
                  onClick={() => setSchematicOpen(true)}
                  className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl text-sm font-semibold text-text-inverse transition-all active:scale-[0.98] hover:scale-[1.01]"
                  style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
                >
                  <FileText size={20} />
                  Ver Esquema
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

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
