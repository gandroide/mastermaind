'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getDictionary, type AppLanguage } from '@/utils/dictionaries';
import { verifyInventorySharePin, getPublicInventory, updatePublicInventoryQuantity } from '@/services/inventory';
import type { InventoryItem } from '@/types/database';
import InventoryDetailView from '@/components/inventory/InventoryDetailView';
import InventoryModal from '@/components/inventory/InventoryModal';
import {
  Lock,
  Package,
  Search,
  Loader2,
  MapPin,
  X,
  ExternalLink,
  Plus
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

export default function SharedInventoryPortal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const lang = searchParams.get('lang') as AppLanguage | null;
  const loc = searchParams.get('loc'); // partner locked region
  const dict = getDictionary(lang);

  // Auth State
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleFetchInventory = useCallback(async () => {
    setLoading(true);
    const data = await getPublicInventory(loc || undefined); // ignores token dynamically, checks bio-alert BU
    if (data) {
      setItems(data);
      setFilteredItems(data);
    } else {
      setItems([]);
      setFilteredItems([]);
    }
    setLoading(false);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setErrorVisible(false);

    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\s/g, '').slice(0, 6);
    if (!/^[a-zA-Z0-9]+$/.test(pastedData)) return;

    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newPin[i] = pastedData[i].toUpperCase();
    }
    setPin(newPin);
    setErrorVisible(false);

    // Focus the next empty input, or the last one if full
    const nextEmptyIndex = newPin.findIndex((val) => val === '');
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    document.getElementById(`pin-${focusIndex}`)?.focus();
  };

  const verifyPin = async () => {
    const pinStr = pin.join('');
    if (pinStr.length !== 6) return; // ensure 6 digits

    setVerifying(true);
    setErrorVisible(false);
    try {
      const isValid = await verifyInventorySharePin(pinStr);
      if (isValid) {
        setUnlocked(true);
        await handleFetchInventory();
      } else {
        setErrorVisible(true);
        setPin(['', '', '', '', '', '']);
        document.getElementById('pin-0')?.focus();
      }
    } catch {
      setErrorVisible(true);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (pin.every((digit) => digit !== '')) {
      verifyPin();
    }
  }, [pin]);

  // --- Filter ---
  useEffect(() => {
    if (!search.trim()) {
      setFilteredItems(items);
      return;
    }
    const term = search.toLowerCase();
    setFilteredItems(
      items.filter(
        (i) =>
          i.item_name.toLowerCase().includes(term) ||
          (i.sku && i.sku.toLowerCase().includes(term)) ||
          (i.location && i.location.toLowerCase().includes(term)) ||
          (i.category && i.category.toLowerCase().includes(term))
      )
    );
  }, [search, items]);

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    // Optimistically update
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)));
    if (viewingItem && viewingItem.id === itemId) {
      setViewingItem({ ...viewingItem, quantity: newQty });
    }
    try {
      await updatePublicInventoryQuantity(itemId, newQty);
    } catch (err) {
      console.error('Failed to update quantity', err);
      await handleFetchInventory(); // revert
    }
  };

  // --- Render PIN Screen ---
  if (!unlocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <motion.div
          className="glass w-full max-w-sm rounded-[2rem] border border-white/[0.08] p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 border border-white/5">
            <Lock size={24} className="text-text-tertiary" />
          </div>

          <h1 className="mb-2 text-xl font-bold tracking-tight text-text-primary">{dict.pinRequired}</h1>
          <p className="mb-8 text-sm text-text-secondary">{dict.enterPin}</p>

          <div className="mb-6 flex justify-center gap-2 sm:gap-3">
            {pin.map((digit, i) => (
              <input
                key={i}
                id={`pin-${i}`}
                type="text"
                inputMode="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(i, e.target.value.toUpperCase())}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                onPaste={handlePinPaste}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-white/[0.08] bg-black/20 text-center font-mono text-xl font-bold text-text-primary uppercase outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.02]"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {errorVisible && (
            <motion.p className="text-sm font-medium text-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {dict.invalidPin}
            </motion.p>
          )}

          {verifying && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-tertiary">
              <Loader2 size={14} className="animate-spin" />
              {dict.loading}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // --- Render Public Portal ---
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Package size={24} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {dict.inventory} {loc ? `- ${loc}` : ''}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                {filteredItems.length} ítem{filteredItems.length !== 1 ? 's' : ''} •{' '}
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98] sm:w-auto"
          >
            <Plus size={18} />
            {dict.newItem}
          </button>
        </motion.div>

        {/* Search */}
        <motion.div className="mb-6 max-w-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="glass relative flex items-center rounded-xl px-4">
            <Search size={18} className="text-text-tertiary" />
            <input
              type="text"
              placeholder={dict.searchInventory}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent py-3 pl-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="cursor-pointer p-1 text-text-tertiary hover:text-text-primary">
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
        {!loading && items.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <Package size={48} className="mb-4 text-text-tertiary" />
            <p className="text-sm font-medium text-text-secondary">
              Sin resultados
            </p>
          </motion.div>
        )}

        {/* Data table */}
        {!loading && filteredItems.length > 0 && (
          <motion.div
            className="glass-card overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Table header */}
            <div className="hidden border-b border-white/[0.06] px-5 py-3 md:grid md:grid-cols-[60px_1fr_1fr_100px_120px] md:gap-4 lg:grid-cols-[60px_1fr_1fr_120px_120px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.img}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.name}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.category}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.location}</span>
              <span className="text-right text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.stock}</span>
            </div>

            {/* Rows */}
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                return (
                  <motion.div
                    key={item.id}
                    variants={rowVariants}
                    onClick={() => setViewingItem(item)}
                    className="group flex cursor-pointer flex-col gap-4 border-b border-white/[0.04] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid md:items-center md:grid-cols-[60px_1fr_1fr_100px_120px] md:py-3 lg:grid-cols-[60px_1fr_1fr_120px_120px]"
                  >
                    <div className="flex items-center gap-4 md:contents">
                      {/* Thumbnail */}
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-3 md:h-11 md:w-11">
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
                    </div>

                    {/* Category (visible via pills on mobile too if not grouped, but hiding to match request exactly) */}
                    <div className="hidden md:block">
                      {item.category && (
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-text-secondary">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="hidden md:block">
                      {item.location && (
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <MapPin size={11} />
                          {item.location}
                        </span>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between md:block md:text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary md:hidden">{dict.stock}</span>
                      <div>
                        <span className="text-sm font-bold text-text-primary">{item.quantity}</span>
                        <span className="ml-1 text-[11px] text-text-tertiary">uds</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Detail view Modal */}
      <AnimatePresence>
        {viewingItem && (
          <InventoryDetailView
            item={viewingItem}
            isPublic={true}
            onClose={() => setViewingItem(null)}
            onUpdateQuantity={handleQuantityChange}
          />
        )}
      </AnimatePresence>

      {/* Create Modal for Partners */}
      <InventoryModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => {
          setIsCreateModalOpen(false);
          handleFetchInventory();
        }}
        isPartnerMode={true}
        lang={lang}
        lockedLocation={loc || undefined}
      />
    </div>
  );
}
