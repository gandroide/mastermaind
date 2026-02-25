'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { createContract, updateContract, uploadContractPdf, type CreateContractPayload } from '@/services/contracts';
import { getBusinessUnits } from '@/services/business-units';
import { getClients } from '@/services/clients';
import type { Contract, BusinessUnit, Client, ContractStatus } from '@/types/database';
import { X, Loader2, FileSignature, ChevronDown, DollarSign, User, Upload, FileCheck, AlertCircle } from 'lucide-react';

interface ContractModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contract?: Contract | null;
}

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export default function ContractModal({ open, onClose, onSaved, contract }: ContractModalProps) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());
  const activeUnit = useAppStore((s) => s.activeUnit);
  const isEditing = !!contract;
  const isBuLocked = activeUnit !== 'all' && !isEditing;

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [clientId, setClientId] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<ContractStatus>('draft');
  const [pdfUrl, setPdfUrl] = useState('');
  const [notes, setNotes] = useState('');

  // PDF upload state
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBusinessUnits().then(setBusinessUnits).catch(console.error);
  }, []);

  // Load clients filtered by active BU
  useEffect(() => {
    const buSlug = activeUnit === 'all' ? undefined : activeUnit;
    getClients(buSlug).then(setClients).catch(console.error);
  }, [activeUnit]);

  // Auto-assign BU from Master Switch
  useEffect(() => {
    if (isBuLocked && businessUnits.length > 0) {
      const matchBu = businessUnits.find((bu) => bu.slug === activeUnit);
      if (matchBu) setBusinessUnitId(matchBu.id);
    }
  }, [isBuLocked, activeUnit, businessUnits]);

  useEffect(() => {
    if (contract) {
      setTitle(contract.title);
      setBusinessUnitId(contract.business_unit_id);
      setClientId(contract.client_id ?? '');
      setValue(String(contract.value ?? ''));
      setCurrency(contract.currency);
      setStatus(contract.status);
      setPdfUrl(contract.pdf_url ?? '');
      setNotes(contract.notes ?? '');
    } else {
      setTitle(''); setClientId('');
      setValue(''); setCurrency('USD'); setStatus('draft');
      setPdfUrl(''); setNotes('');
      setUploadStatus('idle'); setUploadFileName(''); setUploadError('');
      // Auto-set BU if locked
      if (isBuLocked && businessUnits.length > 0) {
        const matchBu = businessUnits.find((bu) => bu.slug === activeUnit);
        if (matchBu) setBusinessUnitId(matchBu.id);
      } else {
        setBusinessUnitId('');
      }
    }
    setError(null);
  }, [contract, open]);

  // ── PDF file upload handler ──
  const handleFileUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setUploadError('Solo se aceptan archivos PDF');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadStatus('error');
      setUploadError('El archivo no debe superar los 20 MB');
      return;
    }

    setUploadStatus('uploading');
    setUploadFileName(file.name);
    setUploadError('');

    try {
      const publicUrl = await uploadContractPdf(file);
      setPdfUrl(publicUrl);
      setUploadStatus('done');
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setUploadError('Error al subir el archivo. Intenta de nuevo.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    if (!businessUnitId) { setError('Selecciona una unidad de negocio'); return; }

    setSaving(true);
    try {
      const payload: CreateContractPayload = {
        business_unit_id: businessUnitId,
        title: title.trim(),
        client_id: clientId || undefined,
        value: value ? parseFloat(value) : undefined,
        currency,
        status,
        pdf_url: pdfUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing) {
        await updateContract({ id: contract.id, ...payload });
      } else {
        await createContract(payload);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose} />
          <motion.div
            className="glass relative z-10 w-full max-w-lg overflow-y-auto rounded-3xl border border-white/[0.08]"
            style={{ maxHeight: '90dvh', boxShadow: `0 0 60px ${activeConfig.color}10, 0 25px 50px rgba(0,0,0,0.5)` }}
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">{isEditing ? 'Editar Contrato' : 'Nuevo Contrato'}</h3>
                <p className="text-xs text-text-tertiary">Registra los datos del contrato</p>
              </div>
              <button onClick={onClose} className="touch-target flex items-center justify-center rounded-xl p-2 text-text-tertiary hover:bg-white/5 hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error && <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

              {/* Title */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary"><FileSignature size={12} />Título *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contrato de servicio..." className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20" autoFocus />
              </div>

              {/* BU */}
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
                    <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                      <option value="" className="bg-surface-2">Seleccionar...</option>
                      {businessUnits.map((bu) => <option key={bu.id} value={bu.id} className="bg-surface-2">{bu.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  </div>
                )}
              </div>

              {/* Cliente */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary"><User size={12} />Cliente</label>
                <div className="relative">
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none">
                    <option value="" className="bg-surface-2">Sin cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface-2">{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                </div>
              </div>

              {/* Value + Currency */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary"><DollarSign size={12} />Valor</label>
                  <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-medium text-text-secondary">Moneda</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="glass w-full appearance-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none">
                    <option value="USD" className="bg-surface-2">USD</option>
                    <option value="EUR" className="bg-surface-2">EUR</option>
                    <option value="MXN" className="bg-surface-2">MXN</option>
                    <option value="ARS" className="bg-surface-2">ARS</option>
                  </select>
                </div>
              </div>

              {/* PDF Upload Dropzone */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <Upload size={12} />Documento PDF
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {uploadStatus === 'done' && pdfUrl ? (
                  /* ── Success state ── */
                  <div className="glass flex items-center gap-3 rounded-xl border border-emerald-500/20 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <FileCheck size={18} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{uploadFileName}</p>
                      <p className="text-[10px] text-emerald-400">Subido con éxito</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfUrl(''); setUploadStatus('idle'); setUploadFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-white/5 hover:text-text-primary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : uploadStatus === 'uploading' ? (
                  /* ── Uploading state ── */
                  <div className="glass flex items-center gap-3 rounded-xl px-4 py-4">
                    <Loader2 size={20} className="shrink-0 animate-spin text-text-tertiary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-secondary">{uploadFileName}</p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: activeConfig.color }}
                          initial={{ width: '10%' }}
                          animate={{ width: '85%' }}
                          transition={{ duration: 3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Idle / Error dropzone ── */
                  <div
                    className={`glass cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                      isDragOver
                        ? 'border-white/30 bg-white/[0.03]'
                        : uploadStatus === 'error'
                          ? 'border-red-500/30'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file?.type === 'application/pdf') handleFileUpload(file);
                      else { setUploadStatus('error'); setUploadError('Solo se aceptan archivos PDF'); }
                    }}
                  >
                    <Upload size={24} className="mx-auto mb-2 text-text-tertiary" />
                    <p className="text-sm text-text-secondary">
                      Arrastra un PDF aquí o <span style={{ color: activeConfig.color }} className="font-medium">haz clic para seleccionar</span>
                    </p>
                    <p className="mt-1 text-[10px] text-text-tertiary">Máximo 20 MB • Solo .pdf</p>
                    {uploadStatus === 'error' && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs text-red-400">
                        <AlertCircle size={12} />
                        {uploadError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas del contrato..." className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="touch-target rounded-xl px-5 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary">Cancelar</button>
                <button
                  type="submit" disabled={saving}
                  className="touch-target flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)` }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isEditing ? 'Guardar' : 'Crear Contrato'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
