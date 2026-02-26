'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  getBlueprints,
  getBlueprintWithDetails,
  createBlueprint,
  updatePhaseContent,
  addBlueprintMaterial,
  deleteBlueprintMaterial,
} from '@/services/blueprints';
import { getInventory } from '@/services/inventory';
import type { Blueprint, BlueprintWithDetails, BlueprintMaterial, BlueprintPhase, InventoryItem } from '@/types/database';
import SchematicViewerModal from '@/components/inventory/SchematicViewerModal';
import ShareModal from '@/components/blueprints/ShareModal';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Package,
  Cpu,
  Wrench,
  Zap,
  Box,
  Loader2,
  FileText,
  ListChecks,
  Plus,
  Pencil,
  Eye,
  Save,
  Trash2,
  X,
  Search,
  Check,
  Share2,
} from 'lucide-react';

// ── Phase definitions ──
const PHASE_DEFS = [
  { number: 1, title: 'BOM & Esquemáticos',              icon: ListChecks,  color: '#8b5cf6' },
  { number: 2, title: 'Ensamblaje en Protoboard',        icon: Cpu,         color: '#06b6d4' },
  { number: 3, title: 'Flash de Firmware & Testing',     icon: Zap,         color: '#f59e0b' },
  { number: 4, title: 'Soldadura y PCB',                 icon: Wrench,      color: '#ef4444' },
  { number: 5, title: 'Enclosure (Carcasa) y QA Final',  icon: Box,         color: '#22c55e' },
];

export default function BlueprintsPage() {
  const { activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BlueprintWithDetails | null>(null);
  const [activePhase, setActivePhase] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [schematicViewer, setSchematicViewer] = useState<{ url: string; title: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const allowed = activeUnit === 'all' || activeUnit === 'bio-alert';

  // ── Fetch blueprints ──
  const fetchBlueprints = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const data = await getBlueprints();
      setBlueprints(data);
    } catch { setBlueprints([]); }
    finally { setLoading(false); }
  }, [allowed]);

  useEffect(() => { fetchBlueprints(); }, [fetchBlueprints]);

  // ── Load details when selecting a device ──
  const loadDetails = useCallback(async (id: string) => {
    const d = await getBlueprintWithDetails(id);
    if (d) { setDetail(d); setActivePhase(1); setIsEditing(false); }
  }, []);

  useEffect(() => {
    if (selectedId) loadDetails(selectedId);
    else { setDetail(null); setIsEditing(false); }
  }, [selectedId, loadDetails]);

  // ── Route guard ──
  if (!allowed) {
    return (
      <div className="mx-auto max-w-7xl">
        <motion.div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <BookOpen size={56} className="mb-5 text-text-tertiary" />
          <h2 className="text-lg font-bold text-text-primary">Módulo no disponible</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
            Los blueprints de hardware no aplican para operaciones digitales.
            Cambia a <span className="font-semibold text-accent-bioalert">Bio-Alert</span>.
          </p>
        </motion.div>
      </div>
    );
  }

  const currentPhase = detail?.phases.find((p) => p.phase_number === activePhase);
  const currentPhaseDef = PHASE_DEFS.find((p) => p.number === activePhase)!;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <motion.div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Hardware Blueprints</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Guías de ensamblaje y documentación técnica •{' '}
            <span style={{ color: activeConfig.color }}>{activeConfig.label}</span>
          </p>
        </div>
        {!selectedId && (
          <button onClick={() => setShowNewModal(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)` }}>
            <Plus size={18} /> Nuevo Dispositivo
          </button>
        )}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !selectedId && blueprints.length === 0 && (
        <motion.div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BookOpen size={48} className="mb-4 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">No hay dispositivos</p>
          <p className="mt-1 text-xs text-text-tertiary">Crea tu primer blueprint para comenzar</p>
        </motion.div>
      )}

      {/* ── Device selector ── */}
      {!loading && !selectedId && blueprints.length > 0 && (
        <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {blueprints.map((bp) => {
            let glyphUrl = '/glyphs/base_node_glyph_1772133744314.png'; // default fallback base node
            const nm = bp.name.toLowerCase();
            if (nm.includes('bread')) {
              glyphUrl = '/glyphs/edge_processing_glyph_1772133756791.png';
            } else if (nm.includes('health') || nm === 'bio-alert') {
              glyphUrl = '/glyphs/base_node_glyph_1772133744314.png';
            } else if (nm.includes('net') || nm.includes('red') || nm.includes('mesh')) {
              glyphUrl = '/glyphs/mesh_network_glyph_1772133768410.png';
            } else if (nm.includes('power') || nm.includes('potencia')) {
              glyphUrl = '/glyphs/power_node_glyph_1772133780491.png';
            }

            return (
              <motion.button key={bp.id} onClick={() => setSelectedId(bp.id)}
                className="glass-card group flex cursor-pointer flex-col items-start p-6 text-left transition-all active:scale-[0.98] hover:border-white/15"
                whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${activeConfig.color}20, ${activeConfig.color}08)`, border: `1px solid ${activeConfig.color}30` }}>
                  <img src={glyphUrl} alt={`${bp.name} Glyph`} className="h-full w-full object-cover scale-[1.2] opacity-90 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                </div>
                <h3 className="text-base font-bold text-text-primary">{bp.name}</h3>
                {bp.description && <p className="mt-1.5 text-xs leading-relaxed text-text-tertiary line-clamp-2">{bp.description}</p>}
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-text-tertiary group-hover:text-text-secondary">
                  <span>5 fases</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* ── Split-view: Timeline + Content ── */}
      {!loading && selectedId && detail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Back + device name + edit toggle */}
          <div className="mb-6 flex items-center gap-3">
            <button onClick={() => { setSelectedId(null); setIsEditing(false); }}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary transition-all hover:bg-white/5 hover:text-text-primary">
              ← Dispositivos
            </button>
            <span className="flex-1 text-sm font-bold text-text-primary">{detail.name}</span>
            <button onClick={() => setShowShareModal(true)}
              className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary">
              <Share2 size={14} /> Compartir
            </button>
            <button onClick={() => setIsEditing(!isEditing)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                isEditing
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'glass text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}>
              {isEditing ? <><Eye size={14} /> Vista previa</> : <><Pencil size={14} /> Editar</>}
            </button>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left — Timeline */}
            <div className="w-full shrink-0 lg:w-64">
              <div className="glass-card p-3">
                {PHASE_DEFS.map((phase, idx) => {
                  const isActive = activePhase === phase.number;
                  const Icon = phase.icon;
                  const isLast = idx === PHASE_DEFS.length - 1;
                  return (
                    <div key={phase.number} className="relative">
                      <button onClick={() => setActivePhase(phase.number)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all ${
                          isActive ? 'bg-white/[0.06] font-semibold text-text-primary' : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                        }`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${isActive ? 'shadow-lg' : 'opacity-50'}`}
                          style={{ background: isActive ? `${phase.color}25` : 'transparent', border: `2px solid ${isActive ? phase.color : 'rgba(255,255,255,0.1)'}` }}>
                          <Icon size={14} style={{ color: isActive ? phase.color : 'var(--color-text-tertiary)' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Fase {phase.number}</p>
                          <p className="truncate text-xs">{phase.title}</p>
                        </div>
                        {isActive && (
                          <motion.div layoutId="phase-indicator" className="h-5 w-[3px] rounded-full"
                            style={{ backgroundColor: phase.color }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                        )}
                      </button>
                      {!isLast && <div className="ml-[22px] h-2 w-px bg-white/[0.08]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — Content */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div key={activePhase} className="glass-card overflow-hidden"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                  {/* Phase header */}
                  <div className="border-b border-white/[0.06] px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: `${currentPhaseDef.color}20`, border: `1px solid ${currentPhaseDef.color}30` }}>
                        {(() => { const Icon = currentPhaseDef.icon; return <Icon size={18} style={{ color: currentPhaseDef.color }} />; })()}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Fase {activePhase}</p>
                        <h3 className="text-base font-bold text-text-primary">{currentPhaseDef.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Phase content */}
                  <div className="p-6">
                    {activePhase === 1 ? (
                      <BOMView
                        blueprintId={detail.id}
                        materials={detail.materials}
                        isEditing={isEditing}
                        onMaterialsChanged={() => loadDetails(detail.id)}
                        onViewSchematic={(url, title) => setSchematicViewer({ url, title })}
                      />
                    ) : (
                      <DocumentationView
                        phase={currentPhase ?? null}
                        isEditing={isEditing}
                        onSaved={() => loadDetails(detail.id)}
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* New Device Modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewBlueprintModal
            onClose={() => setShowNewModal(false)}
            onCreated={(bp) => {
              setShowNewModal(false);
              fetchBlueprints();
              setSelectedId(bp.id);
            }}
            activeColor={activeConfig.color}
          />
        )}
      </AnimatePresence>

      {/* Schematic Viewer */}
      <AnimatePresence>
        {schematicViewer && (
          <SchematicViewerModal url={schematicViewer.url} title={schematicViewer.title} onClose={() => setSchematicViewer(null)} />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && detail && (
          <ShareModal
            blueprint={detail}
            onClose={() => setShowShareModal(false)}
            onUpdated={() => loadDetails(detail.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════
// New Blueprint Modal
// ══════════════════════════════════════════════════

function NewBlueprintModal({ onClose, onCreated, activeColor }: {
  onClose: () => void;
  onCreated: (bp: Blueprint) => void;
  activeColor: string;
}) {
  const [name, setName] = useState('');
  const [namePt, setNamePt] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionPt, setDescriptionPt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [langTab, setLangTab] = useState<'es' | 'pt'>('es');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError(null);
    try {
      const bp = await createBlueprint({
        name: name.trim(),
        name_pt: namePt.trim() || undefined,
        description: description.trim() || undefined,
        description_pt: descriptionPt.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
      });
      onCreated(bp);
    } catch { setError('Error al crear el dispositivo'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.form onSubmit={handleSubmit}
        className="glass relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08]"
        style={{ boxShadow: `0 0 60px ${activeColor}10, 0 25px 50px rgba(0,0,0,0.5)` }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
        exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}>

        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-base font-bold text-text-primary">Nuevo Dispositivo</h3>
          <button type="button" onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-tertiary hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

          {/* Lang Tabs */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setLangTab('es')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${langTab === 'es' ? 'bg-white/10 text-white shadow-sm' : 'bg-transparent text-text-tertiary hover:bg-white/5'}`}>
              Español (ES)
            </button>
            <button type="button" onClick={() => setLangTab('pt')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${langTab === 'pt' ? 'bg-white/10 text-white shadow-sm' : 'bg-transparent text-text-tertiary hover:bg-white/5'}`}>
              Português (PT)
            </button>
          </div>

          {langTab === 'es' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Nombre del Dispositivo (ES) *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nodo Bio-Alert Health..."
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" autoFocus />
              </div>
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Descripción (ES)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Sensor multivariable para..."
                  className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Nombre del Dispositivo (PT)</label>
                <input type="text" value={namePt} onChange={(e) => setNamePt(e.target.value)}
                  placeholder="Nó Bio-Alert Health..."
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" autoFocus />
              </div>
              <div>
                <label className="mb-1.5 text-xs font-medium text-text-secondary">Descripción (PT)</label>
                <textarea value={descriptionPt} onChange={(e) => setDescriptionPt(e.target.value)} rows={3}
                  placeholder="Sensor multivariável para..."
                  className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">Imagen de Portada (URL compartida)</label>
            <input type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="glass w-full rounded-xl px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/[0.06] px-6 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-text-secondary">Cancelar</button>
          <button type="submit" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-text-inverse transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)` }}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            Crear Dispositivo
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// ══════════════════════════════════════════════════
// BOM View — with editing
// ══════════════════════════════════════════════════

function BOMView({ blueprintId, materials, isEditing, onMaterialsChanged, onViewSchematic }: {
  blueprintId: string;
  materials: BlueprintMaterial[];
  isEditing: boolean;
  onMaterialsChanged: () => void;
  onViewSchematic: (url: string, title: string) => void;
}) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteMaterial = async (id: string) => {
    setDeleting(id);
    try {
      await deleteBlueprintMaterial(id);
      onMaterialsChanged();
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          {materials.length} componente{materials.length !== 1 ? 's' : ''} necesarios
        </p>
        {isEditing && (
          <button onClick={() => setShowAddRow(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20">
            <Plus size={12} /> Añadir Componente
          </button>
        )}
      </div>

      {materials.length === 0 && !showAddRow && (
        <div className="flex flex-col items-center py-10 text-center">
          <Package size={40} className="mb-3 text-text-tertiary" />
          <p className="text-sm text-text-secondary">Sin materiales</p>
          {isEditing && <p className="mt-1 text-xs text-text-tertiary">Usa &quot;Añadir Componente&quot; para crear el BOM</p>}
        </div>
      )}

      {(materials.length > 0 || showAddRow) && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Componente</th>
                <th className="pb-2 pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Qty</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Notas</th>
                {isEditing && <th className="pb-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {materials.map((mat) => {
                const inv = mat.inventory_item;
                return (
                  <tr key={mat.id} className="border-b border-white/[0.04] last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 overflow-hidden">
                          {inv?.image_url ? <img src={inv.image_url} alt={mat.part_name} className="h-full w-full object-cover" />
                            : <Package size={12} className="text-text-tertiary" />}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{mat.part_name}</p>
                          {inv?.sku && <p className="text-[10px] font-mono text-text-tertiary">{inv.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-bold text-text-primary">{mat.quantity_needed}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">{mat.notes ?? '—'}</span>
                        {inv?.schematic_url && (
                          <button onClick={() => onViewSchematic(inv.schematic_url!, `Esquema — ${mat.part_name}`)}
                            className="shrink-0 cursor-pointer rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20">
                            <FileText size={10} className="mr-1 inline" />Esquema
                          </button>
                        )}
                      </div>
                    </td>
                    {isEditing && (
                      <td className="py-3 text-right">
                        <button onClick={() => handleDeleteMaterial(mat.id)} disabled={deleting === mat.id}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-all hover:bg-danger/10 hover:text-danger">
                          {deleting === mat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Material inline form */}
      <AnimatePresence>
        {showAddRow && (
          <AddMaterialForm
            blueprintId={blueprintId}
            onAdded={() => { setShowAddRow(false); onMaterialsChanged(); }}
            onCancel={() => setShowAddRow(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Material Form ──

function AddMaterialForm({ blueprintId, onAdded, onCancel }: {
  blueprintId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [partName, setPartName] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Inventory search
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [showInvDropdown, setShowInvDropdown] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);

  useEffect(() => {
    if (invSearch.length >= 2) {
      getInventory(undefined, undefined, undefined, invSearch).then((items) => {
        setInventoryItems(items);
        setShowInvDropdown(true);
      });
    } else {
      setShowInvDropdown(false);
    }
  }, [invSearch]);

  const handleSelectInv = (item: InventoryItem) => {
    setSelectedInvId(item.id);
    setPartName(item.item_name);
    setShowInvDropdown(false);
    setInvSearch('');
  };

  const handleSubmit = async () => {
    if (!partName.trim()) return;
    setSaving(true);
    try {
      await addBlueprintMaterial({
        blueprint_id: blueprintId,
        inventory_item_id: selectedInvId,
        part_name: partName.trim(),
        quantity_needed: parseInt(qty) || 1,
        notes: notes.trim() || undefined,
      });
      onAdded();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <motion.div className="glass rounded-xl border border-white/[0.08] p-4 space-y-3"
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <p className="text-xs font-semibold text-text-secondary">Nuevo componente</p>

      {/* Inventory search */}
      <div className="relative">
        <div className="glass flex items-center rounded-xl px-3">
          <Search size={14} className="text-text-tertiary" />
          <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)}
            placeholder="Buscar en inventario (opcional)..."
            className="w-full bg-transparent py-2.5 pl-2 text-xs text-text-primary outline-none placeholder:text-text-tertiary" />
        </div>
        {showInvDropdown && inventoryItems.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#1a1a2e]/95 p-1 backdrop-blur-sm shadow-xl">
            {inventoryItems.map((item) => (
              <button key={item.id} onClick={() => handleSelectInv(item)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5">
                <Package size={12} className="text-text-tertiary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">{item.item_name}</p>
                  {item.sku && <p className="truncate text-[10px] text-text-tertiary">{item.sku}</p>}
                </div>
                <span className="shrink-0 text-[10px] text-text-tertiary">{item.quantity} uds</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedInvId && (
        <div className="flex items-center gap-2 text-xs">
          <Check size={12} className="text-emerald-400" />
          <span className="text-emerald-400">Vinculado a inventario</span>
          <button onClick={() => { setSelectedInvId(null); setPartName(''); }}
            className="ml-auto cursor-pointer text-text-tertiary hover:text-text-primary"><X size={12} /></button>
        </div>
      )}

      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div>
          <label className="mb-1 text-[10px] font-medium text-text-tertiary">Nombre *</label>
          <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)}
            placeholder="ESP32-WROOM-32..."
            className="glass w-full rounded-lg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-text-tertiary" />
        </div>
        <div>
          <label className="mb-1 text-[10px] font-medium text-text-tertiary">Cantidad</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
            className="glass w-full rounded-lg px-3 py-2 text-xs text-text-primary outline-none" />
        </div>
      </div>

      <div>
        <label className="mb-1 text-[10px] font-medium text-text-tertiary">Notas</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Pull-up para I2C..."
          className="glass w-full rounded-lg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-text-tertiary" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 cursor-pointer rounded-lg border border-white/10 py-2 text-xs font-medium text-text-secondary">Cancelar</button>
        <button type="button" onClick={handleSubmit} disabled={saving || !partName.trim()}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-60">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Añadir
        </button>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════
// Documentation View — Read/Edit
// ══════════════════════════════════════════════════

function DocumentationView({ phase, isEditing, onSaved }: {
  phase: BlueprintPhase | null;
  isEditing: boolean;
  onSaved: () => void;
}) {
  const [langTab, setLangTab] = useState<'es' | 'pt'>('es');
  const [draftEs, setDraftEs] = useState('');
  const [draftPt, setDraftPt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync draft with phase content
  useEffect(() => {
    setDraftEs(phase?.content_markdown ?? '');
    setDraftPt(phase?.content_pt ?? '');
    setSaved(false);
  }, [phase?.id, phase?.content_markdown, phase?.content_pt]);

  const handleSave = async () => {
    if (!phase) return;
    setSaving(true);
    try {
      await updatePhaseContent(phase.id, {
        content_markdown: draftEs,
        content_pt: draftPt,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (!phase) return null;

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Header and Lang Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-1 border border-white/5">
            <button onClick={() => setLangTab('es')}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${langTab === 'es' ? 'bg-white/10 text-white shadow' : 'text-text-tertiary hover:text-text-secondary'}`}>
              Español
            </button>
            <button onClick={() => setLangTab('pt')}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${langTab === 'pt' ? 'bg-white/10 text-white shadow' : 'text-text-tertiary hover:text-text-secondary'}`}>
              Português
            </button>
          </div>
          
          <button onClick={handleSave} disabled={saving}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              saved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-text-primary hover:bg-white/10'
            }`}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
            {saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>

        <textarea
          value={langTab === 'es' ? draftEs : draftPt}
          onChange={(e) => langTab === 'es' ? setDraftEs(e.target.value) : setDraftPt(e.target.value)}
          className="glass w-full resize-none rounded-xl px-4 py-3 font-mono text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary"
          style={{ minHeight: '400px' }}
          placeholder={langTab === 'es' ? '## Título de la sección\n\nEscribe el contenido en Markdown...' : '## Título da seção\n\nEscreva o conteúdo em Markdown...'}
          spellCheck={false}
        />
      </div>
    );
  }

  // Read mode
  if (!phase.content_markdown) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <FileText size={40} className="mb-3 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Sin documentación</p>
        <p className="mt-1 text-xs text-text-tertiary">Activa el modo edición para añadir contenido</p>
      </div>
    );
  }

  const html = markdownToHtml(phase.content_markdown);
  return (
    <div
      className="prose prose-invert prose-sm max-w-none
        prose-headings:text-text-primary prose-headings:font-bold prose-headings:tracking-tight
        prose-h2:text-lg prose-h2:mt-0 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/[0.06]
        prose-h3:text-sm prose-h3:mt-6 prose-h3:mb-2
        prose-p:text-text-secondary prose-p:leading-relaxed
        prose-strong:text-text-primary
        prose-code:rounded prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-accent-bioalert prose-code:text-xs
        prose-pre:rounded-xl prose-pre:bg-surface-2 prose-pre:border prose-pre:border-white/[0.06]
        prose-table:text-xs
        prose-th:border-b prose-th:border-white/[0.06] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-text-tertiary
        prose-td:border-b prose-td:border-white/[0.04] prose-td:px-3 prose-td:py-2 prose-td:text-text-secondary
        prose-li:text-text-secondary prose-li:text-sm
        prose-blockquote:border-l-accent-bioalert/40 prose-blockquote:text-text-secondary prose-blockquote:bg-white/[0.02] prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Markdown → HTML ──
function markdownToHtml(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2"><span class="inline-block h-3.5 w-3.5 rounded border border-white/20"></span>$1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2"><span class="inline-block h-3.5 w-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-center leading-[14px] text-[10px]">✓</span>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) return '<!-- sep -->';
      return cells.map((c) => `<td>${c}</td>`).join('');
    });

  const lines = html.split('\n');
  let inTable = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.startsWith('<td>') && !inTable) {
      inTable = true;
      result.push('<table><thead><tr>' + line.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr></thead><tbody>');
    } else if (line === '<!-- sep -->') {
      // skip
    } else if (line.startsWith('<td>') && inTable) {
      result.push('<tr>' + line + '</tr>');
    } else {
      if (inTable) { result.push('</tbody></table>'); inTable = false; }
      if (line.startsWith('<li')) {
        if (!result[result.length - 1]?.startsWith('<li') && !result[result.length - 1]?.endsWith('</ul>')) {
          result.push('<ul>');
        }
        result.push(line);
      } else {
        if (result[result.length - 1]?.startsWith('<li') || result[result.length - 1]?.endsWith('</li>')) {
          result.push('</ul>');
        }
        if (line.trim() && !line.startsWith('<')) {
          result.push(`<p>${line}</p>`);
        } else {
          result.push(line);
        }
      }
    }
  }
  if (inTable) result.push('</tbody></table>');
  if (result[result.length - 1]?.endsWith('</li>')) result.push('</ul>');
  return result.join('\n');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
