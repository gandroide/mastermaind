'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, BUSINESS_UNITS } from '@/lib/store';
import { formatCurrency, formatCompact } from '@/lib/utils';
import { getDashboardMetrics, getClientCards } from '@/services/dashboard';
import type { DashboardMetrics, ClientCardData } from '@/types/database';
import {
  TrendingUp,
  Users,
  FileSignature,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
};

export default function DashboardPage() {
  const { activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clientCards, setClientCards] = useState<ClientCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const buSlug = activeUnit === 'all' ? undefined : activeUnit;
      const [metricsData, cardsData] = await Promise.all([
        getDashboardMetrics(buSlug),
        getClientCards(buSlug),
      ]);
      setMetrics(metricsData);
      setClientCards(cardsData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Error al cargar los datos. Verifica la conexión a Supabase.');
    } finally {
      setLoading(false);
    }
  }, [activeUnit]);

  // Re-fetch whenever the Master Switch changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricCards = metrics
    ? [
        {
          title: 'Revenue',
          value: formatCurrency(metrics.totalRevenue),
          icon: TrendingUp,
          subtitle: 'Total facturado',
        },
        {
          title: 'Clients',
          value: formatCompact(metrics.clientCount),
          icon: Users,
          subtitle: 'Clientes activos',
        },
        {
          title: 'Contracts',
          value: formatCompact(metrics.contractCount),
          icon: FileSignature,
          subtitle: `${metrics.activeContractCount} activos`,
        },
        {
          title: 'Inventory',
          value: formatCompact(metrics.inventoryCount),
          icon: Package,
          subtitle: `${metrics.lowStockCount} con stock bajo`,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Dashboard Ejecutivo
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Vista{' '}
          <span className="font-semibold" style={{ color: activeConfig.color }}>
            {activeConfig.label}
          </span>{' '}
          — Resumen en tiempo real
        </p>
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          className="mb-6 flex items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={18} />
          {error}
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Metric cards */}
      {!loading && metrics && (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`metrics-${activeUnit}`}
        >
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={cardVariants}
                className="glass-card group relative cursor-pointer overflow-hidden p-6 transition-all hover:border-white/15"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `${activeConfig.color}15`,
                      color: activeConfig.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight text-text-primary">
                    {card.value}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{card.subtitle}</p>
                </div>

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${activeConfig.color}08, transparent 70%)`,
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Client Dynamic Cards */}
      {!loading && clientCards.length > 0 && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          key={`cards-${activeUnit}`}
        >
          <h3 className="mb-4 text-lg font-semibold text-text-primary">
            Tarjetas de Cliente
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clientCards.map((client) => (
              <motion.div
                key={client.id}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                className="glass-card p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: client.businessUnitColor }}
                  />
                  <h4 className="text-sm font-semibold text-text-primary">
                    {client.name}
                  </h4>
                </div>

                {client.company && (
                  <p className="mt-1 pl-5 text-xs text-text-tertiary">
                    {client.company}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                      Total Facturado
                    </p>
                    <p className="mt-1 text-lg font-bold text-text-primary">
                      {formatCurrency(client.totalBilled)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                      Contratos
                    </p>
                    <p className="mt-1 text-lg font-bold text-text-primary">
                      {client.activeContracts}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                      Inventario
                    </p>
                    <p className="mt-1 text-lg font-bold text-text-primary">
                      {client.inventoryItems}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: `${client.businessUnitColor}15`,
                      color: client.businessUnitColor,
                    }}
                  >
                    {client.businessUnitName}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state when no data */}
      {!loading && !error && metrics && metrics.clientCount === 0 && (
        <motion.div
          className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Users size={40} className="mb-4 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            No hay datos aún
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Añade clientes y registros financieros para ver el dashboard en acción
          </p>
        </motion.div>
      )}

      {/* Quick Stats Row */}
      {!loading && metrics && (
        <motion.div
          className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            {
              label: 'Ingresos netos',
              value: formatCurrency(metrics.netIncome),
              status: metrics.netIncome >= 0 ? 'success' : 'danger',
            },
            {
              label: 'Gastos totales',
              value: formatCurrency(metrics.totalExpenses),
              status: 'warning' as const,
            },
            {
              label: 'Stock bajo',
              value: String(metrics.lowStockCount),
              status: metrics.lowStockCount > 0 ? 'warning' : 'success',
            },
            {
              label: 'Contratos activos',
              value: String(metrics.activeContractCount),
              status: 'info' as const,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-subtle flex items-center gap-4 rounded-2xl p-4"
            >
              <div
                className="h-2.5 w-2.5 rounded-full animate-pulse-subtle"
                style={{
                  backgroundColor: `var(--color-${stat.status})`,
                }}
              />
              <div>
                <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                <p className="text-[11px] text-text-tertiary">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
