'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ArrowUpRight, ArrowDownRight, Activity, Calendar, Tag, DollarSign } from 'lucide-react';
import type { Contract, Transaction } from '@/types/database';
import { getContractProfitability } from '@/services/finance';
import { formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Props {
  contract: Contract;
  onClose: () => void;
}

export default function ContractDetailModal({ contract, onClose }: Props) {
  const activeConfig = useAppStore((s) => s.getActiveConfig());
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ income: 0, expense: 0, netProfit: 0, margin: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getContractProfitability(contract.id);
        setMetrics({
          income: data.income,
          expense: data.expense,
          netProfit: data.netProfit,
          margin: data.margin,
        });
        setTransactions(data.transactions);
      } catch (err) {
        console.error('Failed to load contract profitability', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [contract.id]);

  // Determine profit margin color
  const getMarginColor = (margin: number) => {
    if (margin > 50) return 'text-emerald-400';
    if (margin >= 20) return 'text-amber-400';
    return 'text-rose-400';
  };

  const marginColor = getMarginColor(metrics.margin);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="glass relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/[0.08]"
        style={{ boxShadow: `0 0 80px ${activeConfig.color}15, 0 30px 60px rgba(0,0,0,0.6)` }}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 30, transition: { duration: 0.15 } }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/[0.06] p-6">
          <div className="pr-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                {contract.status}
              </span>
              <span className="text-sm font-semibold text-text-tertiary">
                {(contract as any).client?.name || 'Cliente sin asignar'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              {contract.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Unit Economics Section */}
          <div className="mb-6 flex items-center gap-2">
            <Activity size={18} style={{ color: activeConfig.color }} />
            <h3 className="text-lg font-bold text-text-primary">Unit Economics</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={32} className="animate-spin text-text-tertiary" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Gross Revenue */}
              <div className="glass-card flex flex-col justify-between p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <ArrowUpRight size={14} className="text-emerald-400" />
                  Total Ingresado
                </div>
                <p className="text-2xl font-black tabular-nums tracking-tight text-text-primary">
                  {formatCurrency(metrics.income)}
                </p>
              </div>

              {/* Total Costs */}
              <div className="glass-card flex flex-col justify-between p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <ArrowDownRight size={14} className="text-rose-400" />
                  Total Gastado
                </div>
                <p className="text-2xl font-black tabular-nums tracking-tight text-text-primary">
                  {formatCurrency(metrics.expense)}
                </p>
              </div>

              {/* Net Profit */}
              <div className="glass-card flex flex-col justify-between overflow-hidden p-5 relative">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary relative z-10">
                  <DollarSign size={14} className="text-text-primary" />
                  Beneficio Neto
                </div>
                <p className="text-2xl font-black tabular-nums tracking-tight text-text-primary relative z-10">
                  {formatCurrency(metrics.netProfit)}
                </p>
                {metrics.netProfit > 0 && (
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Activity size={80} className="text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Profit Margin */}
              <div className="glass-card flex flex-col justify-between border-t-2 border-t-white/10 p-5" style={{ borderTopColor: activeConfig.color }}>
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Margen de Ganancia
                </div>
                <div className="flex items-baseline gap-1">
                  <p className={`text-4xl font-black tabular-nums tracking-tighter ${marginColor}`}>
                    {metrics.margin.toFixed(1)}
                  </p>
                  <span className={`text-lg font-bold ${marginColor}`}>%</span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History Section */}
          <div className="mt-10 mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-base font-bold text-text-primary">Historial Operativo</h3>
            <span className="text-xs font-medium text-text-tertiary">{transactions.length} registros</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-text-tertiary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm font-medium text-text-secondary">Sin transacciones registradas</p>
              <p className="mt-1 text-xs text-text-tertiary">Vincula transacciones desde el panel financiero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Fecha</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Concepto</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Categoría</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr key={tx.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <Calendar size={12} className="text-text-tertiary" />
                            {new Date(tx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary max-w-[200px] truncate">
                            {tx.description || 'Sin descripción'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                            <Tag size={12} />
                            {tx.category ? (
                              <span className="rounded-md bg-white/5 px-2 py-0.5">{tx.category}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-text-primary'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
