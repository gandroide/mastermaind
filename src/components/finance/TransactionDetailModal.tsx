'use client';

import { motion } from 'framer-motion';
import type { Transaction } from '@/types/database';
import { 
  X, 
  Trash2, 
  Edit2, 
  Calendar, 
  Tag, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  transaction: Transaction;
  activeColor: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TransactionDetailModal({ transaction, activeColor, onClose, onEdit, onDelete }: Props) {
  const isIncome = transaction.type === 'income';
  
  // Formatters
  const formatMoney = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'paid':
        return { icon: CheckCircle2, text: 'Pagada', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'overdue':
        return { icon: AlertCircle, text: 'Atrasada', color: 'text-rose-400', bg: 'bg-rose-500/10' };
      default:
        return { icon: Clock, text: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    }
  };

  const statusInfo = getStatusDisplay(transaction.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      
      <motion.div
        className="glass relative z-10 w-full max-w-lg rounded-3xl border border-white/[0.08]"
        style={{ boxShadow: `0 0 80px ${activeColor}15, 0 30px 60px rgba(0,0,0,0.6)` }}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 30, transition: { duration: 0.15 } }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-white/[0.06] p-6 lg:p-8">
          <div className="pr-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-text-secondary">
                <Tag size={12} />
                {transaction.category || 'Sin categoría'}
              </span>
              <span className={`flex items-center gap-1.5 rounded-full ${statusInfo.bg} px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
                <StatusIcon size={12} />
                {statusInfo.text}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary leading-snug">
              {transaction.description || 'Transacción sin descripción'}
            </h2>
          </div>
          
          <button type="button" onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 lg:p-8">
          {/* Amount Display */}
          <div className="mb-8 flex flex-col items-center justify-center rounded-2xl bg-surface-2 py-8 text-center border border-white/[0.04]">
            <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isIncome ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
            </div>
            <p className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-1">
              {isIncome ? 'Ingreso' : 'Egreso'}
            </p>
            <p className={`text-4xl lg:text-5xl font-black tabular-nums tracking-tighter ${isIncome ? 'text-emerald-400' : 'text-text-primary'}`}>
              {isIncome ? '+' : '-'}{formatMoney(Number(transaction.amount))}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-tertiary">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">Fecha Operación</p>
                <p className="text-sm font-semibold text-text-primary capitalize">
                  {formatDate(transaction.date)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 p-6 lg:p-8 rounded-b-3xl">
          <button onClick={onDelete}
            className="group flex h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold text-text-tertiary transition-all hover:bg-rose-500/10 hover:text-rose-400">
            <Trash2 size={16} className="transition-transform group-hover:scale-110" />
            <span>Eliminar</span>
          </button>

          <button onClick={onEdit}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.98] hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)` }}>
            <Edit2 size={16} />
            <span>Editar Transacción</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
