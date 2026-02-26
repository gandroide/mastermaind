'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { getTransactions, deleteTransaction } from '@/services/finance';
import type { Transaction } from '@/types/database';
import TransactionModal from '@/components/finance/TransactionModal';
import TransactionDetailModal from '@/components/finance/TransactionDetailModal';
import {
  WalletCards,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  TrendingUp,
  Activity,
  DollarSign,
  Tag,
  Calendar,
} from 'lucide-react';

export default function FinancePage() {
  const { activeUnit, getActiveConfig } = useAppStore();
  const config = getActiveConfig();

  // We need to resolve the activeUnit string ('brivex' or 'bio-alert') to its business_unit_id UUID
  const [buId, setBuId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Big numbers
  const [metrics, setMetrics] = useState({ revenue: 0, expenses: 0, mrr: 0, cogs: 0 });

  const fetchBuId = useCallback(async () => {
    if (activeUnit === 'all') {
      setBuId(null);
      setTransactions([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('business_units').select('id').eq('slug', activeUnit).single();
    if (data) {
      setBuId(data.id);
      loadTransactions(data.id);
    } else {
      setLoading(false);
    }
  }, [activeUnit]);

  const loadTransactions = async (id: string) => {
    setLoading(true);
    try {
      const data = await getTransactions(id);
      setTransactions(data);
      calculateMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data: Transaction[]) => {
    const income = data.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = data.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    
    // MRR is based on 'Suscripciones / MRR' category
    const mrr = data
      .filter((t) => t.type === 'income' && t.category === 'Suscripciones / MRR')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // COGS is strictly Hardware expenses
    const cogs = data
      .filter((t) => t.type === 'expense' && t.category === 'Hardware')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Operating Expenses (All expenses excluding Hardware)
    const opEx = data
      .filter((t) => t.type === 'expense' && t.category !== 'Hardware')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setMetrics({ revenue: income, expenses: opEx, mrr, cogs });
  };

  useEffect(() => {
    fetchBuId();
  }, [fetchBuId]);

  const handleDelete = async (txId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta transacción?')) return;
    try {
      await deleteTransaction(txId);
      const newData = transactions.filter(t => t.id !== txId);
      setTransactions(newData);
      calculateMetrics(newData);
      setShowDetailModal(false);
      setSelectedTx(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert('Error al eliminar la transacción');
    }
  };

  if (activeUnit === 'all') {
    return (
      <div className="mx-auto max-w-7xl">
        <motion.div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <WalletCards size={56} className="mb-5 text-text-tertiary" />
          <h2 className="text-lg font-bold text-text-primary">Selecciona una Unidad de Negocio</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
            El módulo financiero requiere contexto de unidad (Brivex o Bio-Alert) para operar correctamente.
          </p>
        </motion.div>
      </div>
    );
  }

  // Formatting helper
  const formatMoney = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-7xl">
      {/* ── Header ── */}
      <motion.div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Finanzas & Cash Flow</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Visión económica de <span style={{ color: config.color }}>{config.label}</span>
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} disabled={loading || !buId}
          className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)` }}>
          <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          <Plus size={18} /> Nueva Transacción
        </button>
      </motion.div>

      {/* ── Big Numbers (Metrics) ── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {/* Metric 1: Revenue */}
        <motion.div className="glass-card relative overflow-hidden p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="absolute -right-4 -top-4 text-emerald-500/10">
            <TrendingUp size={100} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <ArrowUpRight size={16} className="text-emerald-400" />
              {activeUnit === 'brivex' ? 'Ingresos por Servicios' : 'Ventas de Hardware'}
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-text-primary">
              {formatMoney(metrics.revenue)}
            </p>
          </div>
        </motion.div>

        {/* Metric 2: MRR or COGS */}
        <motion.div className="glass-card relative overflow-hidden p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="absolute -right-4 -top-4 text-accent-brivex/10">
            <Activity size={100} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <DollarSign size={16} style={{ color: config.color }} />
              {activeUnit === 'brivex' ? 'MRR Estimado' : 'COGS (Costo Hardware)'}
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-text-primary">
              {formatMoney(activeUnit === 'brivex' ? metrics.mrr : metrics.cogs)}
            </p>
          </div>
        </motion.div>

        {/* Metric 3: Expenses */}
        <motion.div className="glass-card relative overflow-hidden p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="absolute -right-4 -top-4 text-rose-500/10">
            <ArrowDownRight size={100} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <ArrowDownRight size={16} className="text-rose-400" />
              Gastos Operativos
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-text-primary">
              {formatMoney(metrics.expenses)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Transactions List ── */}
      <motion.div className="glass-card flex flex-col overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="border-b border-white/[0.06] px-6 py-5">
          <h3 className="text-base font-bold text-text-primary">Operaciones Recientes</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-text-tertiary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <WalletCards size={40} className="mb-3 text-text-tertiary" />
            <p className="text-sm font-medium text-text-secondary">No hay transacciones</p>
            <p className="mt-1 text-xs text-text-tertiary">Registra tu primer ingreso o gasto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Fecha</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Concepto</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Categoría</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <motion.tr 
                      key={tx.id} 
                      onClick={() => {
                        setSelectedTx(tx);
                        setShowDetailModal(true);
                      }}
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="group cursor-pointer border-b border-white/[0.02] last:border-b-0 hover:bg-white/[0.04] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Calendar size={12} className="text-text-tertiary" />
                          {new Date(tx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-primary">{tx.description ?? 'Sin descripción'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                          <Tag size={12} />
                          {tx.category ? (
                            <span className="rounded-md bg-white/5 px-2 py-0.5">{tx.category}</span>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-text-primary'}`}>
                          {isIncome ? '+' : '-'}{formatMoney(Number(tx.amount))}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Create Modal */}
        {showCreateModal && buId && (
          <TransactionModal
            businessUnitId={buId}
            activeColor={config.color}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(tx) => {
              setShowCreateModal(false);
              const newData = [tx, ...transactions];
              setTransactions(newData);
              calculateMetrics(newData);
            }}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTx && (
          <TransactionDetailModal
            transaction={selectedTx}
            activeColor={config.color}
            onClose={() => setShowDetailModal(false)}
            onDelete={() => handleDelete(selectedTx.id)}
            onEdit={() => {
              setShowDetailModal(false);
              setShowEditModal(true);
            }}
          />
        )}

        {/* Edit Modal */}
        {showEditModal && selectedTx && buId && (
          <TransactionModal
            businessUnitId={buId}
            activeColor={config.color}
            initialData={selectedTx}
            onClose={() => setShowEditModal(false)}
            onSuccess={(updatedTx) => {
              setShowEditModal(false);
              const newData = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
              setTransactions(newData);
              calculateMetrics(newData);
              // Update selected tx and reopen detail if desired, but returning to list is also fine
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
