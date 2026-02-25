'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, BUSINESS_UNITS } from '@/lib/store';
import { getContracts, deleteContract } from '@/services/contracts';
import { getClients } from '@/services/clients';
import { formatCurrency } from '@/lib/utils';
import type { Contract, ContractStatus, Client } from '@/types/database';
import ContractModal from '@/components/contracts/ContractModal';
import ContractSigner from '@/components/contracts/ContractSigner';
import {
  Plus,
  Search,
  FileSignature,
  MoreVertical,
  Pencil,
  Trash2,
  PenTool,
  Loader2,
  X,
  Filter,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string }> = {
  draft:     { label: 'Borrador',     color: '#8888a0' },
  sent:      { label: 'Enviado',      color: '#60a5fa' },
  viewed:    { label: 'Visto',        color: '#a78bfa' },
  signed:    { label: 'Firmado',      color: '#34d399' },
  active:    { label: 'Activo',       color: '#38bdf8' },
  expired:   { label: 'Expirado',     color: '#fbbf24' },
  cancelled: { label: 'Cancelado',    color: '#f87171' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function ContractsPage() {
  const { activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [clientFilter, setClientFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [signerContract, setSignerContract] = useState<Contract | null>(null);
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const buSlug = activeUnit === 'all' ? undefined : activeUnit;
      const data = await getContracts(
        buSlug,
        statusFilter || undefined,
        clientFilter || undefined,
        search || undefined
      );
      setContracts(data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUnit, statusFilter, clientFilter, search]);

  // Fetch clients for the filter dropdown
  useEffect(() => {
    const buSlug = activeUnit === 'all' ? undefined : activeUnit;
    getClients(buSlug).then(setClients).catch(console.error);
  }, [activeUnit]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close context menu on outside tap/click (iOS-safe, no backdrop overlay)
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!contextMenu) return;

    const handleOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      // If tap/click is inside the menu or kebab button, let it through
      if (target.closest('[data-context-menu]')) return;
      setContextMenu(null);
    };

    // Small delay so the opening tap doesn't immediately close the menu
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutside, true);
      document.addEventListener('touchend', handleOutside, true);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('touchend', handleOutside, true);
    };
  }, [contextMenu]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este contrato?')) return;
    setDeleting(id);
    try {
      await deleteContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeleting(null); setContextMenu(null); }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setModalOpen(true);
    setContextMenu(null);
  };

  const handleSign = (contract: Contract) => {
    setSignerContract(contract);
    setContextMenu(null);
  };

  const handleModalClose = () => { setModalOpen(false); setEditingContract(null); };
  const handleSaved = () => { handleModalClose(); fetchContracts(); };
  const handleSignerClose = () => { setSignerContract(null); fetchContracts(); };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Contratos</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {contracts.length} contrato{contracts.length !== 1 ? 's' : ''} •{' '}
            <span style={{ color: activeConfig.color }}>{activeConfig.label}</span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="touch-target flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)` }}
        >
          <Plus size={18} />
          Nuevo Contrato
        </button>
      </motion.div>

      {/* Search + Filters */}
      <motion.div className="mb-6 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-3">
          <div className="glass relative flex flex-1 items-center rounded-xl px-4">
            <Search size={18} className="text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar contratos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent py-3 pl-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="p-1 text-text-tertiary hover:text-text-primary">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`touch-target glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${showFilters ? 'text-text-primary' : 'text-text-secondary'}`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {/* Filter row */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-3 overflow-hidden"
            >
              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')}
                  className="glass appearance-none rounded-xl px-4 py-2.5 pr-8 text-sm text-text-primary outline-none"
                >
                  <option value="" className="bg-surface-2">Todos los estados</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key} className="bg-surface-2">{cfg.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>

              {/* Client filter */}
              <div className="relative">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="glass appearance-none rounded-xl px-4 py-2.5 pr-8 text-sm text-text-primary outline-none"
                >
                  <option value="" className="bg-surface-2">Todos los clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface-2">{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>

              {/* Clear filters */}
              {(statusFilter || clientFilter) && (
                <button
                  onClick={() => { setStatusFilter(''); setClientFilter(''); }}
                  className="text-xs text-text-tertiary hover:text-text-primary"
                >
                  Limpiar
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && contracts.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <FileSignature size={48} className="mb-4 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {search || statusFilter || clientFilter ? 'Sin resultados' : 'No hay contratos aún'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {search || statusFilter || clientFilter
              ? 'Intenta ajustar los filtros'
              : 'Crea tu primer contrato para comenzar'}
          </p>
        </motion.div>
      )}

      {/* Contracts grid */}
      {!loading && contracts.length > 0 && (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`contracts-${activeUnit}-${statusFilter}-${clientFilter}-${search}`}
        >
          <AnimatePresence mode="popLayout">
            {contracts.map((contract) => {
              const bu = contract.business_unit;
              const buColor = bu?.color ?? '#a78bfa';
              const statusCfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.draft;
              const client = contract.client as unknown as { id: string; name: string; company: string } | null;

              return (
                <motion.div
                  key={contract.id}
                  variants={rowVariants}
                  exit="exit"
                  layout
                  className={`glass-card group relative p-5 transition-all hover:border-white/15 ${
                    contextMenu === contract.id ? 'z-[60] overflow-visible' : 'overflow-hidden'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                        {contract.title}
                      </h3>
                      {client && (
                        <p className="mt-1 text-xs text-text-tertiary">
                          {client.name}
                        </p>
                      )}
                    </div>

                    {/* Context menu */}
                    <div className="relative" data-context-menu>
                      <button
                        onClick={() => setContextMenu(contextMenu === contract.id ? null : contract.id)}
                        className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg p-3 text-text-tertiary transition-all hover:bg-white/5 hover:text-text-primary"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {contextMenu === contract.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-14 z-50 w-48 rounded-xl border border-zinc-700/50 bg-[#1a1a2e]/[0.97] p-2 shadow-2xl shadow-black/60 backdrop-blur-sm"
                          >
                            {contract.pdf_url && ['draft', 'sent', 'viewed'].includes(contract.status) && (
                              <button
                                onClick={() => handleSign(contract)}
                                onTouchEnd={(e) => { e.stopPropagation(); handleSign(contract); }}
                                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                              >
                                <PenTool size={16} />
                                Firmar
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(contract)}
                              onTouchEnd={(e) => { e.stopPropagation(); handleEdit(contract); }}
                              className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>
                            {contract.signed_pdf_url && (
                              <a
                                href={contract.signed_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                              >
                                <ExternalLink size={16} />
                                Ver Firmado
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(contract.id)}
                              onTouchEnd={(e) => { e.stopPropagation(); handleDelete(contract.id); }}
                              disabled={deleting === contract.id}
                              className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-danger active:bg-danger/10 hover:bg-danger/5"
                            >
                              {deleting === contract.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              Eliminar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Value + Status */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Valor</p>
                      <p className="mt-1 text-xl font-bold text-text-primary">
                        {formatCurrency(contract.value, contract.currency)}
                      </p>
                    </div>

                    <span
                      className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: `${statusCfg.color}15`,
                        color: statusCfg.color,
                      }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: `${buColor}15`, color: buColor }}
                    >
                      {bu?.name ?? 'Global'}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(contract.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Sign button for pending contracts */}
                  {contract.pdf_url && ['draft', 'sent', 'viewed'].includes(contract.status) && (
                    <button
                      onClick={() => handleSign(contract)}
                      className="mt-3 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs font-medium text-text-secondary transition-all active:bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.03] hover:text-text-primary"
                    >
                      <PenTool size={14} />
                      Firmar con Apple Pencil
                    </button>
                  )}

                  {/* Hover glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${buColor}06, transparent 70%)` }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Context menu is closed via document-level listener (useEffect above) — no backdrop overlay needed */}

      {/* Modals */}
      <ContractModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        contract={editingContract}
      />

      {signerContract && (
        <ContractSigner
          contract={signerContract}
          onClose={handleSignerClose}
        />
      )}
    </div>
  );
}
