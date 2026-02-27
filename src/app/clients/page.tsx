'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, BUSINESS_UNITS } from '@/lib/store';
import { getClients, deleteClient } from '@/services/clients';
import type { Client } from '@/types/database';
import ClientModal from '@/components/clients/ClientModal';
import ClientDetailModal from '@/components/clients/ClientDetailModal';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Loader2,
  X,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function ClientsPage() {
  const { activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const buSlug = activeUnit === 'all' ? undefined : activeUnit;
      const data = await getClients(buSlug, search || undefined);
      setClients(data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUnit, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close context menu on outside tap/click (iOS-safe, no backdrop overlay)
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
    if (!confirm('¿Desactivar este cliente?')) return;
    setDeleting(id);
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting client:', err);
    } finally {
      setDeleting(null);
      setContextMenu(null);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
    setContextMenu(null);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingClient(null);
  };

  const handleSaved = () => {
    handleModalClose();
    fetchClients();
  };

  return (
    <div className="mx-auto max-w-7xl relative">
      {/* Header */}
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Clientes
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} •{' '}
            <span style={{ color: activeConfig.color }}>{activeConfig.label}</span>
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="touch-target flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)`,
          }}
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </motion.div>

      {/* Search bar */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="glass relative flex items-center rounded-xl px-4">
          <Search size={18} className="text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-transparent py-3 pl-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="p-1 text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Users size={48} className="mb-4 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {search ? 'Sin resultados' : 'No hay clientes aún'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {search
              ? 'Intenta con otro término de búsqueda'
              : 'Añade tu primer cliente para comenzar'}
          </p>
          {!search && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: activeConfig.color }}
            >
              + Añadir cliente
            </button>
          )}
        </motion.div>
      )}

      {/* Client grid */}
      {!loading && clients.length > 0 && (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`clients-${activeUnit}-${search}`}
        >
          <AnimatePresence mode="popLayout">
            {clients.map((client) => {
              const bu = client.business_unit;
              const buConfig = BUSINESS_UNITS.find((u) => u.id === bu?.slug) ?? BUSINESS_UNITS[0];
              const buColor = bu?.color ?? buConfig.color;
              const isMenuOpen = contextMenu === client.id;

              return (
                <motion.div
                  key={client.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-context-menu]')) return;
                    setViewingClient(client);
                  }}
                  variants={rowVariants}
                  exit="exit"
                  layout
                  className={`cursor-pointer glass-card group relative p-5 transition-all hover:border-white/15 hover:scale-[1.01] active:scale-[0.99] ${
                    contextMenu === client.id ? 'z-[60] overflow-visible' : 'overflow-hidden'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                          style={{
                            background: `${buColor}15`,
                            color: buColor,
                          }}
                        >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {client.name}
                        </h3>
                        {client.company && (
                          <div className="flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
                            <Building2 size={11} className="shrink-0" />
                            <span className="truncate">{client.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Context menu */}
                    <div className="relative" data-context-menu>
                      <button
                        onClick={() => setContextMenu(contextMenu === client.id ? null : client.id)}
                        className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg p-3 text-text-tertiary transition-all hover:bg-white/5 hover:text-text-primary md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {contextMenu === client.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-14 z-50 w-48 rounded-xl border border-zinc-700/50 bg-[#1a1a2e]/[0.97] p-2 shadow-2xl shadow-black/60 backdrop-blur-sm"
                          >
                            <button
                              onClick={() => handleEdit(client)}
                              onTouchEnd={(e) => { e.stopPropagation(); handleEdit(client); }}
                              className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              onTouchEnd={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                              disabled={deleting === client.id}
                              className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-danger active:bg-danger/10 hover:bg-danger/5"
                            >
                              {deleting === client.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                              Desactivar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Contact info - Solucionado el bug de texto duplicado */}
                  <div className="mt-4 space-y-2 overflow-hidden">
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Mail size={12} className="shrink-0 text-text-tertiary" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Phone size={12} className="shrink-0 text-text-tertiary" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <p className="mt-3 line-clamp-2 text-xs text-text-tertiary">
                      {client.notes}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: `${buColor}15`,
                        color: buColor,
                      }}
                    >
                      {bu?.name ?? 'Global'}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(client.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Hover glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${buColor}06, transparent 70%)`,
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Context menu is closed via document-level listener (useEffect above) — no backdrop overlay needed */}

      {/* Client Edit/Create Modal */}
      <ClientModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        client={editingClient}
      />

      {/* Client Details Read-Only Modal */}
      <ClientDetailModal
        open={!!viewingClient}
        onClose={() => setViewingClient(null)}
        client={viewingClient}
        onEdit={(client) => {
          setViewingClient(null);
          setTimeout(() => handleEdit(client), 50); // Pequeño delay para evitar choques visuales
        }}
      />
    </div>
  );
}