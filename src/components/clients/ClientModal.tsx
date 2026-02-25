'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { createClient, updateClient } from '@/services/clients';
import { getBusinessUnits } from '@/services/business-units';
import type { Client, BusinessUnit, CreateClientPayload } from '@/types/database';
import { X, Loader2, Building2, User, Mail, Phone, FileText, ChevronDown } from 'lucide-react';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: Client | null;
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

export default function ClientModal({ open, onClose, onSaved, client }: ClientModalProps) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());
  const activeUnit = useAppStore((s) => s.activeUnit);

  const isEditing = !!client;
  const isBuLocked = activeUnit !== 'all' && !isEditing;

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');

  // Load business units
  useEffect(() => {
    getBusinessUnits().then(setBusinessUnits).catch(console.error);
  }, []);

  // Auto-assign BU from Master Switch context
  useEffect(() => {
    if (isBuLocked && businessUnits.length > 0) {
      const matchBu = businessUnits.find((bu) => bu.slug === activeUnit);
      if (matchBu) setBusinessUnitId(matchBu.id);
    }
  }, [isBuLocked, activeUnit, businessUnits]);

  // Populate form when editing
  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email ?? '');
      setPhone(client.phone ?? '');
      setCompany(client.company ?? '');
      setNotes(client.notes ?? '');
      setBusinessUnitId(client.business_unit_id);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setNotes('');
      // Auto-set BU if locked
      if (isBuLocked && businessUnits.length > 0) {
        const matchBu = businessUnits.find((bu) => bu.slug === activeUnit);
        if (matchBu) setBusinessUnitId(matchBu.id);
      } else {
        setBusinessUnitId('');
      }
    }
    setError(null);
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!businessUnitId) {
      setError('Selecciona una unidad de negocio');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateClientPayload = {
        business_unit_id: businessUnitId,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing) {
        await updateClient({ id: client.id, ...payload });
      } else {
        await createClient(payload);
      }

      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      setError('Error al guardar el cliente. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="glass relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.08]"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              boxShadow: `0 0 60px ${activeConfig.color}10, 0 25px 50px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
                <p className="text-xs text-text-tertiary">
                  {isEditing
                    ? 'Modifica los datos del cliente'
                    : 'Añade un cliente a tu centro de comando'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="touch-target flex items-center justify-center rounded-xl p-2 text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <User size={12} />
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo del cliente"
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20"
                  autoFocus
                />
              </div>

              {/* Business Unit */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <Building2 size={12} />
                  Unidad de Negocio *
                </label>
                {isBuLocked ? (
                  /* Locked: auto-assigned from Master Switch */
                  <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: activeConfig.color }}
                    />
                    <span className="font-medium text-text-primary">
                      {activeConfig.label}
                    </span>
                    <span className="ml-auto text-[10px] text-text-tertiary">Auto-asignado</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={businessUnitId}
                      onChange={(e) => setBusinessUnitId(e.target.value)}
                      className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-text-primary outline-none focus:border-white/20"
                    >
                      <option value="" className="bg-surface-2">
                        Seleccionar...
                      </option>
                      {businessUnits.map((bu) => (
                        <option key={bu.id} value={bu.id} className="bg-surface-2">
                          {bu.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                    />
                  </div>
                )}
              </div>

              {/* Email & Phone row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <Mail size={12} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <Phone size={12} />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <Building2 size={12} />
                  Empresa
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <FileText size={12} />
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el cliente..."
                  rows={3}
                  className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-white/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="touch-target rounded-xl px-5 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="touch-target flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)`,
                  }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
