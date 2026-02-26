'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createTransaction } from '@/services/finance';
import { useAppStore } from '@/lib/store';
import type { Transaction, TransactionType } from '@/types/database';
import { X, Loader2, DollarSign, Calendar, Tag, FileText } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
  activeColor: string;
  businessUnitId: string | null;
  initialData?: Transaction;
}

export default function TransactionModal({ onClose, onSuccess, activeColor, businessUnitId, initialData }: Props) {
  const isEditing = !!initialData;
  const [type, setType] = useState<TransactionType>(initialData?.type || 'income');
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<Transaction['status']>(initialData?.status || 'paid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Monto inválido');
      return;
    }
    if (!businessUnitId) {
      setError('Unidad de negocio no identificada. Cambia a Brivex o Bio-Alert.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        amount: Number(amount),
        currency: 'USD', // Forced standardization to USD
        category: category.trim() || null,
        description: description.trim() || null,
        date,
        status, // Allow edit status
        business_unit_id: businessUnitId,
      };

      let tx;
      if (isEditing && initialData) {
        // @ts-ignore - The service expects a different import of updateTransaction, but we'll fix that next
        tx = await import('@/services/finance').then(m => m.updateTransaction(initialData.id, payload));
      } else {
        tx = await createTransaction(payload);
      }
      
      onSuccess(tx);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la transacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      
      <motion.div
        className="glass relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08]"
        style={{ boxShadow: `0 0 60px ${activeColor}15, 0 25px 50px rgba(0,0,0,0.5)` }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}>

        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-base font-bold text-text-primary">
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </h3>
          <button type="button" onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-tertiary hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger backdrop-blur-md">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex rounded-xl bg-surface-2 p-1 border border-white/[0.04]">
            <button type="button" onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                type === 'income' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
              }`}>
              + Ingreso
            </button>
            <button type="button" onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                type === 'expense' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
              }`}>
              - Gasto
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <DollarSign size={14} className="text-text-tertiary" /> Monto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-text-tertiary">$</span>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" autoFocus
                  className="glass w-full rounded-xl py-3 pl-7 pr-4 text-sm font-semibold text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Calendar size={14} className="text-text-tertiary" /> Fecha
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none [&::-webkit-calendar-picker-indicator]:invert" />
            </div>
          </div>

          {/* Status (Only on Edit mode for simplicity, defaults to Paid on Create) */}
          {isEditing && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Tag size={14} className="text-text-tertiary" /> Estado
              </label>
              <div className="flex rounded-xl bg-surface-2 p-1 border border-white/[0.04]">
                <button type="button" onClick={() => setStatus('paid')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-text-tertiary'}`}>
                  Pagada
                </button>
                <button type="button" onClick={() => setStatus('pending')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-text-tertiary'}`}>
                  Pendiente
                </button>
                <button type="button" onClick={() => setStatus('overdue')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${status === 'overdue' ? 'bg-rose-500/20 text-rose-400' : 'text-text-tertiary'}`}>
                  Atrasada
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Tag size={14} className="text-text-tertiary" /> Categoría
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass w-full cursor-pointer appearance-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-white/10"
              >
                <option value="" disabled className="bg-zinc-900">Selecciona una categoría...</option>
                {type === 'income' ? (
                  <>
                    <option value="Servicios B2B" className="bg-zinc-900">Servicios B2B</option>
                    <option value="Ventas de Hardware" className="bg-zinc-900">Ventas de Hardware</option>
                    <option value="Suscripciones / MRR" className="bg-zinc-900">Suscripciones / MRR</option>
                    <option value="Otros Ingresos" className="bg-zinc-900">Otros Ingresos</option>
                  </>
                ) : (
                  <>
                    <option value="Hardware" className="bg-zinc-900">Hardware</option>
                    <option value="Operativo" className="bg-zinc-900">Operativo (Servidores, dominios, etc.)</option>
                    <option value="Software y Herramientas" className="bg-zinc-900">Software y Herramientas</option>
                    <option value="Viáticos y Transporte" className="bg-zinc-900">Viáticos y Transporte</option>
                    <option value="Otros Gastos" className="bg-zinc-900">Otros Gastos</option>
                  </>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-tertiary">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <FileText size={14} className="text-text-tertiary" /> Descripción
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Detalles de la transacción..."
              className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 cursor-pointer rounded-xl border border-white/10 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/5">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !businessUnitId}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-text-inverse transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)` }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
