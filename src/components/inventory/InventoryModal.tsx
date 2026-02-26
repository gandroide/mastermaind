'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { createInventoryItem, updateInventoryItem, uploadInventoryFile, createPublicInventoryItem } from '@/services/inventory';
import { getBusinessUnits } from '@/services/business-units';
import type { InventoryItem, BusinessUnit, CreateInventoryPayload } from '@/types/database';
import { getDictionary, type AppLanguage } from '@/utils/dictionaries';
import {
  X, Loader2, Package, ChevronDown, Upload, FileCheck, AlertCircle, Image, FileText, MapPin,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: InventoryItem | null;
  isPartnerMode?: boolean;
  lang?: AppLanguage | null;
  lockedLocation?: string;
}

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

const LOCATION_OPTIONS = ['Dominicana', 'Portugal', 'Argentina'];

export default function InventoryModal({ open, onClose, onSaved, item, isPartnerMode = false, lang = 'es', lockedLocation }: Props) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());
  const activeUnit = useAppStore((s) => s.activeUnit);
  const isEditing = !!item;
  // Partner mode is fundamentally locked, it ignores standard activeUnit logic
  const isBuLocked = (activeUnit !== 'all' && !isEditing) || isPartnerMode;
  
  const dict = getDictionary(lang);

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [itemName, setItemName] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [schematicUrl, setSchematicUrl] = useState('');
  const [notes, setNotes] = useState('');

  // File uploads
  const [imageUpload, setImageUpload] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [imageFileName, setImageFileName] = useState('');
  const [schematicUpload, setSchematicUpload] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [schematicFileName, setSchematicFileName] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const schematicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBusinessUnits().then(setBusinessUnits).catch(console.error);
  }, []);

  // Auto-assign BU
  useEffect(() => {
    if (isBuLocked && businessUnits.length > 0) {
      const matchBu = businessUnits.find((bu) => bu.slug === activeUnit);
      if (matchBu) setBusinessUnitId(matchBu.id);
    }
  }, [isBuLocked, activeUnit, businessUnits]);

  // Populate form on open
  useEffect(() => {
    if (item) {
      setItemName(item.item_name);
      setBusinessUnitId(item.business_unit_id);
      setSku(item.sku ?? '');
      setCategory(item.category ?? '');
      setQuantity(String(item.quantity));
      setLocation(item.location ?? '');
      setDescription(item.description ?? '');
      setImageUrl(item.image_url ?? '');
      setSchematicUrl(item.schematic_url ?? '');
      setNotes(item.notes ?? '');
      if (item.image_url) { setImageUpload('done'); setImageFileName('Imagen existente'); }
      if (item.schematic_url) { setSchematicUpload('done'); setSchematicFileName('Esquema existente'); }
    } else {
      setItemName(''); setSku(''); setCategory(''); setQuantity('');
      setLocation(''); setDescription(''); setImageUrl('');
      setSchematicUrl(''); setNotes('');
      setImageUpload('idle'); setImageFileName('');
      setSchematicUpload('idle'); setSchematicFileName('');
      if (isBuLocked && businessUnits.length > 0) {
        const m = businessUnits.find((bu) => bu.slug === activeUnit);
        if (m) setBusinessUnitId(m.id);
      } else { setBusinessUnitId(''); }
    }
    setError(null);
  }, [item, open]);

  // ── Upload handlers ──
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setImageUpload('error'); return; }
    setImageUpload('uploading'); setImageFileName(file.name);
    try {
      const url = await uploadInventoryFile('inventory_images', file);
      setImageUrl(url); setImageUpload('done');
    } catch { setImageUpload('error'); }
  }, []);

  const handleSchematicUpload = useCallback(async (file: File) => {
    setSchematicUpload('uploading'); setSchematicFileName(file.name);
    try {
      const url = await uploadInventoryFile('inventory_schematics', file);
      setSchematicUrl(url); setSchematicUpload('done');
    } catch { setSchematicUpload('error'); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!itemName.trim()) { setError('El nombre es obligatorio'); return; }
    if (!businessUnitId) { setError('Selecciona una unidad de negocio'); return; }
    if (!quantity || parseInt(quantity) < 0) { setError('Cantidad inválida'); return; }

    setSaving(true);
    try {
      if (isPartnerMode) {
        // Partners can only create items
        const publicPayload: Omit<CreateInventoryPayload, 'business_unit_id'> = {
          item_name: itemName.trim(),
          sku: sku.trim() || undefined,
          category: category.trim() || undefined,
          quantity: parseInt(quantity),
          location: lockedLocation || location || undefined,
          description: description.trim() || undefined,
          image_url: imageUrl || undefined,
          schematic_url: schematicUrl || undefined,
          notes: notes.trim() || undefined,
        };
        await createPublicInventoryItem(publicPayload);
      } else {
        const payload: CreateInventoryPayload = {
          business_unit_id: businessUnitId,
          item_name: itemName.trim(),
          sku: sku.trim() || undefined,
          category: category.trim() || undefined,
          quantity: parseInt(quantity),
          location: location || undefined,
          description: description.trim() || undefined,
          image_url: imageUrl || undefined,
          schematic_url: schematicUrl || undefined,
          notes: notes.trim() || undefined,
        };
        if (isEditing) {
          await updateInventoryItem({ id: item.id, ...payload });
        } else {
          await createInventoryItem(payload);
        }
      }
      onSaved();
    } catch (err) {
      console.error(err); setError('Error al guardar. Intenta de nuevo.');
    } finally { setSaving(false); }
  };

  const renderUploadZone = (
    label: string,
    icon: React.ReactNode,
    status: 'idle' | 'uploading' | 'done' | 'error',
    fileName: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    accept: string,
    onFile: (f: File) => void,
    url: string,
    onClear: () => void,
    dict: Record<string, string>
  ) => (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
        {icon}{label}
      </label>
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {status === 'done' && url ? (
        <div className="glass flex items-center gap-3 rounded-xl border border-emerald-500/20 px-4 py-3">
          <FileCheck size={18} className="shrink-0 text-emerald-400" />
          <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{fileName}</p>
          <button type="button" onClick={() => { onClear(); if (inputRef.current) inputRef.current.value = ''; }}
            className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-white/5 hover:text-text-primary">
            <X size={14} />
          </button>
        </div>
      ) : status === 'uploading' ? (
        <div className="glass flex items-center gap-3 rounded-xl px-4 py-4">
          <Loader2 size={20} className="shrink-0 animate-spin text-text-tertiary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-text-secondary">{fileName}</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full" style={{ background: activeConfig.color }}
                initial={{ width: '10%' }} animate={{ width: '85%' }} transition={{ duration: 3, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`glass cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
            status === 'error' ? 'border-red-500/30' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={20} className="mx-auto mb-1.5 text-text-tertiary" />
          <p className="text-sm text-text-secondary">
            <span style={{ color: activeConfig.color }} className="font-medium">{dict.uploadFile}</span>
          </p>
          {status === 'error' && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> Error al subir
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" variants={overlayVariants}
            initial="hidden" animate="visible" exit="hidden" onClick={onClose} />
          <motion.div
            className="glass relative z-10 w-full max-w-lg overflow-y-auto rounded-3xl border border-white/[0.08]"
            style={{ maxHeight: '90dvh', boxShadow: `0 0 60px ${activeConfig.color}10, 0 25px 50px rgba(0,0,0,0.5)` }}
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">{isEditing ? 'Editar Ítem' : dict.newItem}</h3>
                <p className="text-xs text-text-tertiary">Inventario técnico distribuido</p>
              </div>
              <button onClick={onClose} className="touch-target flex items-center justify-center rounded-xl p-2 text-text-tertiary hover:bg-white/5 hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error && <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

              {/* Name */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary"><Package size={12} />{dict.itemName} *</label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
                  placeholder="ESP32-WROOM-32..." className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20" autoFocus />
              </div>

              {/* BU */}
              {!isPartnerMode && (
                <div>
                  <label className="mb-1.5 text-xs font-medium text-text-secondary">Unidad de Negocio *</label>
                  {isBuLocked ? (
                    <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: activeConfig.color }} />
                      <span className="font-medium text-text-primary">{activeConfig.label}</span>
                      <span className="ml-auto text-[10px] text-text-tertiary">Auto-asignado</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)}
                        className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                        <option value="" className="bg-surface-2">{dict.select}</option>
                        {businessUnits.map((bu) => <option key={bu.id} value={bu.id} className="bg-surface-2">{bu.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    </div>
                  )}
                </div>
              )}

              {/* Category + SKU */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 text-xs font-medium text-text-secondary">{dict.itemCategory}</label>
                  <div className="relative">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="glass w-full cursor-pointer appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                      <option value="" className="bg-surface-2">{dict.select}</option>
                      <option value="Componente Electrónico" className="bg-surface-2">Componente Electrónico</option>
                      <option value="Sensor" className="bg-surface-2">Sensor</option>
                      <option value="Accesorio" className="bg-surface-2">Accesorio</option>
                      <option value="Otro" className="bg-surface-2">Otro</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-medium text-text-secondary">SKU</label>
                  <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
                    placeholder="BA-ESP32-001..." className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
                </div>
              </div>

              {/* Quantity + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 text-xs font-medium text-text-secondary">{dict.quantityUnits} *</label>
                  <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0" className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
                </div>
                {(!isPartnerMode || !lockedLocation) && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary"><MapPin size={12} />{dict.location}</label>
                    <div className="relative">
                      <select value={location} onChange={(e) => setLocation(e.target.value)}
                        className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                        <option value="" className="bg-surface-2">{dict.select}</option>
                        {LOCATION_OPTIONS.map((l) => <option key={l} value={l} className="bg-surface-2">{l}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">{dict.technicalDescription}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Especificaciones, voltajes, conexiones..." className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>

              {/* Image upload */}
              {renderUploadZone(dict.imageRef, <Image size={12} />, imageUpload, imageFileName,
                imageInputRef, 'image/*', handleImageUpload, imageUrl,
                () => { setImageUrl(''); setImageUpload('idle'); setImageFileName(''); }, dict)}

              {/* Schematic upload */}
              {renderUploadZone(dict.schematicRef, <FileText size={12} />, schematicUpload, schematicFileName,
                schematicInputRef, 'image/*,.pdf', handleSchematicUpload, schematicUrl,
                () => { setSchematicUrl(''); setSchematicUpload('idle'); setSchematicFileName(''); }, dict)}

              {/* Notes */}
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">{dict.notes}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="..." className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="touch-target rounded-xl px-5 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="touch-target flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)` }}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isEditing ? 'Guardar' : dict.createItem}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
