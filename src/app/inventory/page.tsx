'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { getInventory, deleteInventoryItem, getInventoryCategories, getInventoryLocations } from '@/services/inventory';
import type { InventoryItem } from '@/types/database';
import InventoryModal from '@/components/inventory/InventoryModal';
import SchematicViewerModal from '@/components/inventory/SchematicViewerModal';
import InventoryDetailView from '@/components/inventory/InventoryDetailView';
import ShareInventoryModal from '@/components/inventory/ShareInventoryModal';
import {
  Plus,
  Search,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  ChevronDown,
  MapPin,
  Share2,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

const LOCATIONS = ['Dominicana', 'Portugal', 'Argentina'];

export default function InventoryPage() {
  const { activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  const [schematicViewer, setSchematicViewer] = useState<{ url: string; title: string } | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);

  // Route guard flag (early return AFTER all hooks)
  const inventoryAllowed = activeUnit === 'all' || activeUnit === 'bio-alert';

  const fetchItems = useCallback(async () => {
    if (!inventoryAllowed) return;
    setLoading(true);
    try {
      const buSlug = activeUnit === 'all' ? undefined : activeUnit;
      const data = await getInventory(buSlug, locationFilter || undefined, categoryFilter || undefined, search || undefined);
      setItems(data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUnit, locationFilter, categoryFilter, search, inventoryAllowed]);

  // Fetch categories
  useEffect(() => {
    if (!inventoryAllowed) return;
    getInventoryCategories().then(setCategories).catch(console.error);
  }, [inventoryAllowed]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close context menu on outside click (iOS-safe)
  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu]')) return;
      setContextMenu(null);
    };
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

  // ── Route guard render (AFTER all hooks) ──
  if (!inventoryAllowed) {
    return (
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Package size={56} className="mb-5 text-text-tertiary" />
          <h2 className="text-lg font-bold text-text-primary">Módulo no disponible</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
            El módulo de inventario no aplica para operaciones digitales.
            Cambia a <span className="font-semibold text-accent-bioalert">Bio-Alert</span> para gestionar hardware.
          </p>
        </motion.div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ítem?')) return;
    setDeleting(id);
    try {
      await deleteInventoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeleting(null); setContextMenu(null); }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setModalOpen(true);
    setContextMenu(null);
  };

  const handleModalClose = () => { setModalOpen(false); setEditingItem(null); };
  const handleSaved = () => { handleModalClose(); fetchItems(); };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Inventario</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {items.length} ítem{items.length !== 1 ? 's' : ''} •{' '}
            <span style={{ color: activeConfig.color }}>{activeConfig.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShareModalOpen(true)}
            className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Accesos de Socios</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)` }}
          >
            <Plus size={18} />
            Nuevo Ítem
          </button>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div className="mb-6 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-3">
          <div className="glass relative flex flex-1 items-center rounded-xl px-4">
            <Search size={18} className="text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar ítems..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent py-3 pl-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="cursor-pointer p-1 text-text-tertiary hover:text-text-primary">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter row: Location segmented + Category dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Location segmented control */}
          <div className="glass flex items-center gap-1 rounded-xl p-1">
            <button
              onClick={() => setLocationFilter('')}
              className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                !locationFilter ? 'bg-white/10 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Todas
            </button>
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocationFilter(locationFilter === loc ? '' : loc)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  locationFilter === loc ? 'bg-white/10 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <MapPin size={12} />
                {loc}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="glass cursor-pointer appearance-none rounded-xl px-4 py-2.5 pr-8 text-xs text-text-primary outline-none"
              >
                <option value="" className="bg-surface-2">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-surface-2">{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
            </div>
          )}

          {/* Clear filters */}
          {(locationFilter || categoryFilter) && (
            <button
              onClick={() => { setLocationFilter(''); setCategoryFilter(''); }}
              className="cursor-pointer text-xs text-text-tertiary hover:text-text-primary"
            >
              Limpiar filtros
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
      {!loading && items.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <Package size={48} className="mb-4 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {search || locationFilter || categoryFilter ? 'Sin resultados' : 'No hay ítems en inventario'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {search || locationFilter || categoryFilter ? 'Intenta ajustar los filtros' : 'Crea tu primer ítem para comenzar'}
          </p>
        </motion.div>
      )}

      {/* Data table */}
      {!loading && items.length > 0 && (
        <motion.div
          className={`glass-card ${contextMenu ? 'overflow-visible' : 'overflow-hidden'}`}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Table header */}
          <div className="hidden border-b border-white/[0.06] px-5 py-3 md:grid md:grid-cols-[60px_1fr_1fr_100px_120px_50px] md:gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Img</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Nombre</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Categoría</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Ubicación</span>
            <span className="text-right text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Cantidad</span>
            <span />
          </div>

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const bu = item.business_unit;
              const buColor = bu?.color ?? '#a78bfa';

              return (
                <motion.div
                  key={item.id}
                  variants={rowVariants}
                  onClick={() => setViewingItem(item)}
                  className={`group flex cursor-pointer items-center gap-4 border-b border-white/[0.04] px-5 py-3 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid md:grid-cols-[60px_1fr_1fr_100px_120px_50px] ${
                    contextMenu === item.id ? 'relative z-[60] overflow-visible' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-3 md:h-11 md:w-11">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={16} className="text-text-tertiary" />
                      </div>
                    )}
                  </div>

                  {/* Name + SKU */}
                  <div className="min-w-0 flex-1 md:flex-initial">
                    <p className="truncate text-sm font-semibold text-text-primary">{item.item_name}</p>
                    {item.sku && <p className="truncate text-[11px] font-mono text-text-tertiary">{item.sku}</p>}
                  </div>

                  {/* Category (hidden on mobile) */}
                  <div className="hidden md:block">
                    {item.category && (
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-text-secondary">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Location (hidden on mobile) */}
                  <div className="hidden md:block">
                    {item.location && (
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin size={11} />
                        {item.location}
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="hidden text-right md:block">
                    <span className="text-sm font-bold text-text-primary">{item.quantity}</span>
                    <span className="ml-1 text-[11px] text-text-tertiary">uds</span>
                  </div>

                  {/* Context menu */}
                  <div className="relative" data-context-menu
                    onClick={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu(contextMenu === item.id ? null : item.id);
                      }}
                      className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg p-3 text-text-tertiary transition-all hover:bg-white/5 hover:text-text-primary"
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {contextMenu === item.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          className="absolute right-0 top-14 z-50 w-48 rounded-xl border border-zinc-700/50 bg-[#1a1a2e]/[0.97] p-2 shadow-2xl shadow-black/60 backdrop-blur-sm"
                        >
                          <button
                            onClick={() => handleEdit(item)}
                            onTouchEnd={(e) => { e.stopPropagation(); handleEdit(item); }}
                            className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>
                          {item.schematic_url && (
                            <button
                              onClick={() => {
                                setSchematicViewer({ url: item.schematic_url!, title: `Esquema — ${item.item_name}` });
                                setContextMenu(null);
                              }}
                              onTouchEnd={(e) => {
                                e.stopPropagation();
                                setSchematicViewer({ url: item.schematic_url!, title: `Esquema — ${item.item_name}` });
                                setContextMenu(null);
                              }}
                              className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary active:bg-white/10 hover:bg-white/5 hover:text-text-primary"
                            >
                              <ExternalLink size={16} />
                              Ver Esquema
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            onTouchEnd={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            disabled={deleting === item.id}
                            className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-danger active:bg-danger/10 hover:bg-danger/5"
                          >
                            {deleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Eliminar
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create/Edit modal */}
      <InventoryModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        item={editingItem}
      />

      {/* Detail view (read-only) */}
      <AnimatePresence>
        {viewingItem && (
          <InventoryDetailView
            item={viewingItem}
            onClose={() => setViewingItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <ShareInventoryModal
            activeUnit={activeUnit === 'all' ? 'bio-alert' : activeUnit}
            onClose={() => setShareModalOpen(false)}
            defaultLocation={locationFilter}
          />
        )}
      </AnimatePresence>

      {/* Schematic Viewer */}
      <AnimatePresence>
        {schematicViewer && (
          <SchematicViewerModal
            url={schematicViewer.url}
            title={schematicViewer.title}
            onClose={() => setSchematicViewer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}