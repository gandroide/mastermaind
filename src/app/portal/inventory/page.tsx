'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getPortalLocation } from '../layout';
import { getInventory } from '@/services/inventory';
import type { InventoryItem } from '@/types/database';
import InventoryDetailModal from '@/components/portal/InventoryDetailModal';
import PortalItemForm from '@/components/portal/PortalItemForm';
import { Search, Package, Loader2, X, ChevronDown, Plus } from 'lucide-react';

export default function PortalInventoryPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const { location } = getPortalLocation(token);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory(
        undefined,
        location || undefined,
        categoryFilter || undefined,
        search || undefined
      );
      setItems(data);

      // Extract categories from results
      const cats = [...new Set(data.map((d) => d.category).filter(Boolean))] as string[];
      setCategories(cats.sort());
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [location, categoryFilter, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(null); // close detail modal
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = () => { setFormOpen(false); setEditingItem(null); };
  const handleFormSaved = () => { handleFormClose(); fetchItems(); };

  return (
    <>
      {/* Add button + Search */}
      <div className="mb-4 space-y-3">
        {/* Add item button */}
        {location && (
          <button
            onClick={() => { setEditingItem(null); setFormOpen(true); }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-text-inverse transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #34d399, #059669)', touchAction: 'manipulation' }}
          >
            <Plus size={18} />
            Añadir Ítem
          </button>
        )}

        <div className="glass relative flex items-center rounded-xl px-4">
          <Search size={18} className="text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar componente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-transparent py-3 pl-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="cursor-pointer p-1 text-text-tertiary">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="glass w-full cursor-pointer appearance-none rounded-xl px-4 py-2.5 pr-8 text-sm text-text-primary outline-none"
            >
              <option value="" className="bg-surface-2">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-surface-2">{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Package size={40} className="mb-3 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {search || categoryFilter ? 'Sin resultados' : 'No hay ítems en inventario'}
          </p>
          {!search && !categoryFilter && location && (
            <p className="mt-2 text-xs text-text-tertiary">
              Toca &quot;Añadir Ítem&quot; para comenzar
            </p>
          )}
        </div>
      )}

      {/* Items list */}
      {!loading && items.length > 0 && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {items.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="glass-card flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-all active:scale-[0.98] hover:border-white/15"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Thumbnail */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package size={20} className="text-text-tertiary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 overflow-hidden">
                <h3 className="truncate text-sm font-semibold text-text-primary">{item.item_name}</h3>
                {item.category && (
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">{item.category}</p>
                )}
              </div>

              {/* Quantity badge */}
              <div className="flex-shrink-0 rounded-lg bg-surface-3 px-3 py-1.5">
                <p className="text-xs font-bold text-text-primary">{item.quantity}</p>
                <p className="text-[10px] text-text-tertiary">uds</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <InventoryDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onEdit={() => handleEdit(selectedItem)}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit form */}
      <AnimatePresence>
        {formOpen && location && (
          <PortalItemForm
            location={location}
            item={editingItem}
            onClose={handleFormClose}
            onSaved={handleFormSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}
