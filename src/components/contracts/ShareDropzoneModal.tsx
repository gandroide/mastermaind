'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAppStore, BUSINESS_UNITS } from '@/lib/store';
import type { ContractDropzoneLink } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { getActiveDropzoneLinks, createDropzoneLink, deactivateDropzoneLink } from '@/services/contractLinks';
import {
  X,
  Share2,
  Copy,
  Check,
  Link2,
  Loader2,
  Trash2,
  UploadCloud
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ShareDropzoneModal({ onClose }: Props) {
  const { activeUnit } = useAppStore();
  const [links, setLinks] = useState<ContractDropzoneLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Selected BU for the new link
  const defaultBuId = BUSINESS_UNITS.find(bu => bu.slug === (activeUnit === 'all' ? 'brivex' : activeUnit))?.id || '';
  const [selectedBuId, setSelectedBuId] = useState<string>('');

  const confirmModal = useConfirmModal();

  // To keep it simple and safe, we'll fetch the actual BUs from DB to ensure valid UUIDs
  const [dbUnits, setDbUnits] = useState<{id: string, name: string, slug: string}[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch DB Units first to bind the selector
      const { data: buData } = await supabase.from('business_units').select('id, name, slug');
      if (buData) {
        setDbUnits(buData);
        // Default to active unit or first one
        const activeSlug = activeUnit === 'all' ? 'brivex' : activeUnit;
        const defaultBu = buData.find(b => b.slug === activeSlug) || buData[0];
        if (defaultBu) setSelectedBuId(defaultBu.id);
      }

      // 2. Fetch Links using the service function
      const fetchedLinks = await getActiveDropzoneLinks(activeUnit);
      setLinks(fetchedLinks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!selectedBuId) return;
    setCreating(true);
    try {
      // Use the service function
      const newLinkToken = await createDropzoneLink(selectedBuId);
      
      console.log("Link generado con éxito:", newLinkToken);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al crear el enlace.');
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (id: string, name: string) => {
    confirmModal.confirm({
      title: 'Desactivar Enlace de Buzón',
      message: `¿Estás seguro de que deseas desactivar este enlace de ${name}? El enlace actual dejará de funcionar inmediatamente.`,
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      danger: true,
      onConfirm: async () => {
        try {
          // Use the service function
          await deactivateDropzoneLink(id);

          setLinks(links.filter(l => l.id !== id));
        } catch (err) {
          console.error(err);
          alert('Error al desactivar el enlace.');
        }
      }
    });
  };

  const copyToClipboard = async (token: string, id: string) => {
    const url = `${window.location.origin}/portal/contracts/upload/${token}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      
      <motion.div
        className="glass relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#1a1a2e]/95 backdrop-blur-xl"
        style={{ boxShadow: '0 0 60px rgba(167,139,250,0.08), 0 25px 50px rgba(0,0,0,0.5)' }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <UploadCloud size={18} className="text-violet-400" />
            <h3 className="text-base font-bold text-white">Buzón de Contratos</h3>
          </div>
          <button type="button" onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-zinc-400">
            Genera enlaces públicos seguros para que socios externos puedan subir contratos en PDF directamente a tu dashboard.
          </p>

          {/* Creation Area */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <label className="mb-2 block text-xs font-medium text-zinc-300">Unidad de Negocio para recibir contratos</label>
            <div className="flex gap-2">
              <select
                value={selectedBuId}
                onChange={(e) => setSelectedBuId(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
              >
                {dbUnits.map(bu => (
                  <option key={bu.id} value={bu.id}>{bu.name}</option>
                ))}
              </select>
              <button 
                onClick={handleCreate} 
                disabled={creating || !selectedBuId}
                className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Generar Link
              </button>
            </div>
          </div>

          {/* List of active links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Enlaces Activos</h4>
            
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                <p className="text-sm text-zinc-500">No hay enlaces activos en esta vista.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                {links.map((link) => {
                  const buName = Array.isArray(link.business_unit) ? link.business_unit[0]?.name : (link.business_unit as any)?.name;
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/contracts/upload/${link.share_token}`;
                  
                  return (
                    <div key={link.id} className="relative group bg-black/40 border border-white/[0.08] rounded-2xl p-4 transition-colors hover:border-violet-500/30">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                          {buName || 'Desconocido'}
                        </span>
                        
                        <button 
                          onClick={() => handleDisable(link.id, buName || 'esta Unidad')}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
                          title="Desactivar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                        <p className="flex-1 truncate text-[11px] font-mono text-zinc-400">
                          {url}
                        </p>
                        <button onClick={() => copyToClipboard(link.share_token, link.id)}
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/10 transition-all hover:bg-white/20 active:scale-95 text-white">
                          {copiedId === link.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </motion.div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmModal.handleConfirm}
        title={confirmModal.options?.title}
        message={confirmModal.options?.message}
        confirmText={confirmModal.options?.confirmText}
        cancelText={confirmModal.options?.cancelText}
        danger={confirmModal.options?.danger}
      />
    </div>
  );
}
