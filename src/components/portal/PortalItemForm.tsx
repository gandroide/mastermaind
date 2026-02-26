'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createInventoryItem, updateInventoryItem, uploadInventoryFile } from '@/services/inventory';
import { getBusinessUnits } from '@/services/business-units';
import type { InventoryItem, CreateInventoryPayload, BusinessUnit } from '@/types/database';
import { X, Loader2, Package, Upload, FileCheck, AlertCircle, Image, FileText } from 'lucide-react';

interface Props {
  location: string;            // Locked from token
  item?: InventoryItem | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

export default function PortalItemForm({ location, item, onClose, onSaved }: Props) {
  const isEditing = !!item;

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [schematicUrl, setSchematicUrl] = useState('');

  // Uploads
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [imageName, setImageName] = useState('');
  const [schematicStatus, setSchematicStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [schematicName, setSchematicName] = useState('');
  const imageRef = useRef<HTMLInputElement>(null);
  const schematicRef = useRef<HTMLInputElement>(null);

  // Load BUs for auto-assigning (we pick the first one — Bio-Alert)
  useEffect(() => {
    getBusinessUnits().then(setBusinessUnits).catch(console.error);
  }, []);

  // Populate on edit
  useEffect(() => {
    if (item) {
      setItemName(item.item_name);
      setCategory(item.category ?? '');
      setQuantity(String(item.quantity));
      setDescription(item.description ?? '');
      setImageUrl(item.image_url ?? '');
      setSchematicUrl(item.schematic_url ?? '');
      if (item.image_url) { setImageStatus('done'); setImageName('Imagen existente'); }
      if (item.schematic_url) { setSchematicStatus('done'); setSchematicName('Esquema existente'); }
    } else {
      setItemName(''); setCategory(''); setQuantity('');
      setDescription(''); setImageUrl(''); setSchematicUrl('');
      setImageStatus('idle'); setImageName('');
      setSchematicStatus('idle'); setSchematicName('');
    }
    setError(null);
  }, [item]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setImageStatus('error'); return; }
    setImageStatus('uploading'); setImageName(file.name);
    try {
      const url = await uploadInventoryFile('inventory_images', file);
      setImageUrl(url); setImageStatus('done');
    } catch { setImageStatus('error'); }
  }, []);

  const handleSchematicUpload = useCallback(async (file: File) => {
    setSchematicStatus('uploading'); setSchematicName(file.name);
    try {
      const url = await uploadInventoryFile('inventory_schematics', file);
      setSchematicUrl(url); setSchematicStatus('done');
    } catch { setSchematicStatus('error'); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!itemName.trim()) { setError('El nombre es obligatorio'); return; }
    if (!quantity || parseInt(quantity) < 0) { setError('Cantidad inválida'); return; }

    // Auto-assign Bio-Alert BU (or first available)
    const buId = item?.business_unit_id
      ?? businessUnits.find((bu) => bu.slug === 'bio-alert')?.id
      ?? businessUnits[0]?.id;
    if (!buId) { setError('Error de configuración — no se encontró unidad de negocio'); return; }

    setSaving(true);
    try {
      const payload: CreateInventoryPayload = {
        business_unit_id: buId,
        item_name: itemName.trim(),
        category: category.trim() || undefined,
        quantity: parseInt(quantity),
        location,  // Locked from token!
        description: description.trim() || undefined,
        image_url: imageUrl || undefined,
        schematic_url: schematicUrl || undefined,
      };

      if (isEditing) {
        await updateInventoryItem({ id: item.id, ...payload });
      } else {
        await createInventoryItem(payload);
      }
      onSaved();
    } catch (err) {
      console.error(err); setError('Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-surface-0"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="glass flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-bold text-text-primary">
          {isEditing ? 'Editar Ítem' : 'Nuevo Ítem'}
        </h2>
        <button onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-secondary hover:bg-white/5">
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg space-y-4">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          {/* Location badge (locked) */}
          <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <span>📍</span>
            <span className="font-medium text-text-primary">{location}</span>
            <span className="ml-auto text-[10px] text-text-tertiary">Auto-asignado</span>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <Package size={12} /> Nombre *
            </label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
              placeholder="ESP32-WROOM-32..."
              className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              autoFocus />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">Categoría</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="glass w-full cursor-pointer appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                <option value="" className="bg-surface-2">Seleccionar...</option>
                <option value="Componente Electrónico" className="bg-surface-2">Componente Electrónico</option>
                <option value="Sensor" className="bg-surface-2">Sensor</option>
                <option value="Accesorio" className="bg-surface-2">Accesorio</option>
                <option value="Otro" className="bg-surface-2">Otro</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">Cantidad (unidades) *</label>
            <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">Descripción Técnica</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Especificaciones, voltajes..."
              className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>

          {/* Image upload */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <Image size={12} /> Imagen
            </label>
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            {imageStatus === 'done' && imageUrl ? (
              <div className="glass flex items-center gap-3 rounded-xl border border-emerald-500/20 px-4 py-3">
                <FileCheck size={18} className="shrink-0 text-emerald-400" />
                <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{imageName}</p>
                <button type="button" onClick={() => { setImageUrl(''); setImageStatus('idle'); }}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary"><X size={14} /></button>
              </div>
            ) : imageStatus === 'uploading' ? (
              <div className="glass flex items-center gap-3 rounded-xl px-4 py-4">
                <Loader2 size={20} className="animate-spin text-text-tertiary" />
                <p className="truncate text-sm text-text-secondary">{imageName}</p>
              </div>
            ) : (
              <div onClick={() => imageRef.current?.click()}
                className={`glass cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                  imageStatus === 'error' ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'}`}>
                <Upload size={20} className="mx-auto mb-1.5 text-text-tertiary" />
                <p className="text-sm text-accent-bioalert font-medium">Seleccionar imagen</p>
                {imageStatus === 'error' && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs text-red-400">
                    <AlertCircle size={12} /> Error al subir</p>
                )}
              </div>
            )}
          </div>

          {/* Schematic upload */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <FileText size={12} /> Esquema Eléctrico
            </label>
            <input ref={schematicRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSchematicUpload(f); }} />
            {schematicStatus === 'done' && schematicUrl ? (
              <div className="glass flex items-center gap-3 rounded-xl border border-emerald-500/20 px-4 py-3">
                <FileCheck size={18} className="shrink-0 text-emerald-400" />
                <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{schematicName}</p>
                <button type="button" onClick={() => { setSchematicUrl(''); setSchematicStatus('idle'); }}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary"><X size={14} /></button>
              </div>
            ) : schematicStatus === 'uploading' ? (
              <div className="glass flex items-center gap-3 rounded-xl px-4 py-4">
                <Loader2 size={20} className="animate-spin text-text-tertiary" />
                <p className="truncate text-sm text-text-secondary">{schematicName}</p>
              </div>
            ) : (
              <div onClick={() => schematicRef.current?.click()}
                className={`glass cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                  schematicStatus === 'error' ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'}`}>
                <Upload size={20} className="mx-auto mb-1.5 text-text-tertiary" />
                <p className="text-sm text-accent-bioalert font-medium">Seleccionar archivo</p>
                {schematicStatus === 'error' && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs text-red-400">
                    <AlertCircle size={12} /> Error al subir</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-8">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-text-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-text-inverse transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? 'Guardar' : 'Crear Ítem'}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
