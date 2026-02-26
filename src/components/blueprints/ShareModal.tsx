'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { enableShare, disableShare } from '@/services/blueprints';
import type { Blueprint } from '@/types/database';
import {
  X,
  Share2,
  Copy,
  Check,
  Link2,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Unlink,
} from 'lucide-react';

interface Props {
  blueprint: Blueprint;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ShareModal({ blueprint, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [shareToken, setShareToken] = useState(blueprint.share_token);
  const [sharePin, setSharePin] = useState(blueprint.share_pin);
  const [customPin, setCustomPin] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  const isActive = !!shareToken;
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/blueprint/${shareToken}`
    : '';

  const handleEnable = async () => {
    setLoading(true);
    try {
      const pin = customPin.trim() || undefined;
      const result = await enableShare(blueprint.id, pin);
      setShareToken(result.token);
      setSharePin(result.pin);
      setCustomPin('');
      onUpdated();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDisable = async () => {
    if (!confirm('¿Desactivar el enlace público? Los técnicos ya no podrán acceder.')) return;
    setLoading(true);
    try {
      await disableShare(blueprint.id);
      setShareToken(null);
      setSharePin(null);
      onUpdated();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRegenerate = async () => {
    if (!confirm('¿Regenerar token y PIN? El enlace anterior dejará de funcionar.')) return;
    setLoading(true);
    try {
      const result = await enableShare(blueprint.id);
      setShareToken(result.token);
      setSharePin(result.pin);
      onUpdated();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Robust clipboard (iOS-safe)
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="glass relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08]"
        style={{ boxShadow: '0 0 60px rgba(139,92,246,0.08), 0 25px 50px rgba(0,0,0,0.5)' }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-text-tertiary" />
            <h3 className="text-base font-bold text-text-primary">Compartir Blueprint</h3>
          </div>
          <button type="button" onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-tertiary hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-text-tertiary">
            <span className="font-semibold text-text-secondary">{blueprint.name}</span> — genera un enlace protegido por
            PIN para compartir la documentación con técnicos externos.
          </p>

          {!isActive ? (
            /* ── Inactive state ── */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">PIN personalizado (opcional)</label>
                <input type="text" value={customPin} onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Dejar vacío para autogenerar"
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary font-mono tracking-widest" maxLength={6} />
                <p className="mt-1 text-[10px] text-text-tertiary">6 dígitos numéricos</p>
              </div>

              <button onClick={handleEnable} disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-text-inverse transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Activar Enlace Público
              </button>
            </div>
          ) : (
            /* ── Active state ── */
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400">Enlace activo</span>
              </div>

              {/* URL */}
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Enlace</label>
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
                  <p className="flex-1 truncate text-xs font-mono text-text-secondary">{shareUrl}</p>
                  <button onClick={() => copyToClipboard(shareUrl, 'url')}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all hover:bg-white/5"
                    style={{ touchAction: 'manipulation' }}>
                    {copiedField === 'url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-text-tertiary" />}
                  </button>
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">PIN de acceso</label>
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
                  <Lock size={14} className="text-text-tertiary shrink-0" />
                  <p className="flex-1 text-sm font-mono font-bold tracking-[0.3em] text-text-primary">
                    {showPin ? sharePin : '••••••'}
                  </p>
                  <button onClick={() => setShowPin(!showPin)}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all hover:bg-white/5">
                    {showPin ? <EyeOff size={14} className="text-text-tertiary" /> : <Eye size={14} className="text-text-tertiary" />}
                  </button>
                  <button onClick={() => copyToClipboard(sharePin ?? '', 'pin')}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all hover:bg-white/5"
                    style={{ touchAction: 'manipulation' }}>
                    {copiedField === 'pin' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-text-tertiary" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleRegenerate} disabled={loading}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs font-medium text-text-secondary transition-all hover:bg-white/5">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Regenerar
                </button>
                <button onClick={handleDisable} disabled={loading}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-danger/20 py-2.5 text-xs font-medium text-danger transition-all hover:bg-danger/5">
                  <Unlink size={12} />
                  Desactivar
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
