'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { verifySharePin, getPublicBlueprint } from '@/services/blueprints';
import { getDictionary, type AppLanguage } from '@/utils/dictionaries';
import type { BlueprintWithDetails, BlueprintMaterial, BlueprintPhase } from '@/types/database';
import SchematicViewerModal from '@/components/inventory/SchematicViewerModal';
import {
  Lock,
  Loader2,
  BookOpen,
  ListChecks,
  Cpu,
  Zap,
  Wrench,
  Box,
  Package,
  FileText,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react';

// ── Phase definitions ──
const PHASE_DEFS = [
  { number: 1, title: 'BOM & Esquemáticos',              icon: ListChecks,  color: '#8b5cf6' },
  { number: 2, title: 'Ensamblaje en Protoboard',        icon: Cpu,         color: '#06b6d4' },
  { number: 3, title: 'Flash de Firmware & Testing',     icon: Zap,         color: '#f59e0b' },
  { number: 4, title: 'Soldadura y PCB',                 icon: Wrench,      color: '#ef4444' },
  { number: 5, title: 'Enclosure (Carcasa) y QA Final',  icon: Box,         color: '#22c55e' },
];

type ViewState = 'loading' | 'not_found' | 'pin' | 'unlocked';

export default function ShareBlueprintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const lang = searchParams.get('lang') as AppLanguage | null;
  const dict = getDictionary(lang);

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [blueprint, setBlueprint] = useState<BlueprintWithDetails | null>(null);
  const [activePhase, setActivePhase] = useState(1);
  const [schematicViewer, setSchematicViewer] = useState<{ url: string; title: string } | null>(null);

  // PIN state
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Check if token exists
  useEffect(() => {
    async function check() {
      try {
        // Quick check: try to verify with empty pin — will fail but confirms token exists
        const result = await verifySharePin(token, '__check__');
        // If it returns false, the token exists but PIN is wrong → show PIN screen
        // If the function throws, token doesn't exist
        setViewState(result ? 'unlocked' : 'pin');
      } catch {
        setViewState('not_found');
      }
    }
    check();
  }, [token]);

  // Handle PIN input
  const handlePinChange = (idx: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[idx] = value;
    setPinDigits(newDigits);
    setPinError(false);

    // Auto-advance to next input
    if (value && idx < 5) {
      const next = document.getElementById(`pin-${idx + 1}`);
      next?.focus();
    }

    // Auto-submit when complete
    if (value && idx === 5 && newDigits.every((d) => d !== '')) {
      submitPin(newDigits.join(''));
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      const prev = document.getElementById(`pin-${idx - 1}`);
      prev?.focus();
      const newDigits = [...pinDigits];
      newDigits[idx - 1] = '';
      setPinDigits(newDigits);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setPinDigits(digits);
      submitPin(pasted);
    }
  };

  const submitPin = async (pin: string) => {
    setVerifying(true);
    setPinError(false);
    try {
      const valid = await verifySharePin(token, pin);
      if (valid) {
        // Load full blueprint
        const data = await getPublicBlueprint(token);
        if (data) {
          setBlueprint(data);
          setViewState('unlocked');
        } else {
          setViewState('not_found');
        }
      } else {
        setPinError(true);
        setPinDigits(['', '', '', '', '', '']);
        document.getElementById('pin-0')?.focus();
      }
    } catch {
      setPinError(true);
    } finally {
      setVerifying(false);
    }
  };

  // ── Loading ──
  if (viewState === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={32} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  // ── Not found ──
  if (viewState === 'not_found') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <motion.div className="flex max-w-sm flex-col items-center text-center"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AlertCircle size={48} className="mb-4 text-text-tertiary" />
          <h1 className="text-lg font-bold text-text-primary">Enlace no válido</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Este enlace de blueprint no existe o ha sido desactivado.
            Contacta al administrador para obtener un enlace actualizado.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── PIN Lock Screen ──
  if (viewState === 'pin') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <motion.div className="glass w-full max-w-sm rounded-3xl border border-white/[0.08] p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Lock size={28} className="text-text-tertiary" />
          </div>
          <h1 className="text-lg font-bold text-text-primary">{dict.pinRequired}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {dict.enterPin}
          </p>

          {/* PIN inputs */}
          <div className="mt-6 flex justify-center gap-2" onPaste={handlePaste}>
            {pinDigits.map((digit, idx) => (
              <input
                key={idx}
                id={`pin-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(idx, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                className={`glass h-14 w-11 rounded-xl text-center text-xl font-bold outline-none transition-all ${
                  pinError
                    ? 'border border-danger text-danger animate-shake'
                    : 'text-text-primary focus:ring-2 focus:ring-white/20'
                }`}
                autoFocus={idx === 0}
                disabled={verifying}
              />
            ))}
          </div>

          {pinError && (
            <motion.p className="mt-3 text-xs font-medium text-danger"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              {dict.invalidPin}
            </motion.p>
          )}

          {verifying && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-tertiary">
              <Loader2 size={14} className="animate-spin" />
              {dict.loading}
            </div>
          )}

          <p className="mt-6 text-[10px] text-text-tertiary">
            Solicita el PIN al administrador del proyecto
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Unlocked — Read-only Blueprint Viewer ──
  if (!blueprint) return null;

  const currentPhase = blueprint.phases.find((p) => p.phase_number === activePhase);
  const currentPhaseDef = PHASE_DEFS.find((p) => p.number === activePhase)!;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <motion.div className="mb-6 flex gap-4 items-start" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {(() => {
          let glyphUrl = '/glyphs/base_node_glyph_1772133744314.png';
          const nm = (lang === 'pt' && blueprint.name_pt ? blueprint.name_pt : blueprint.name).toLowerCase();
          if (nm.includes('bread')) glyphUrl = '/glyphs/edge_processing_glyph_1772133756791.png';
          else if (nm.includes('health') || nm === 'bio-alert') glyphUrl = '/glyphs/base_node_glyph_1772133744314.png';
          else if (nm.includes('net') || nm.includes('red') || nm.includes('mesh')) glyphUrl = '/glyphs/mesh_network_glyph_1772133768410.png';
          else if (nm.includes('power') || nm.includes('potencia')) glyphUrl = '/glyphs/power_node_glyph_1772133780491.png';

          return (
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden mt-1">
              <img src={glyphUrl} alt="Glyph" className="h-[120%] w-[120%] object-cover opacity-90 mix-blend-screen" />
            </div>
          );
        })()}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-accent-bioalert" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Documentación Técnica — {lang === 'pt' && blueprint.name_pt ? blueprint.name_pt : blueprint.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {lang === 'pt' && blueprint.name_pt ? blueprint.name_pt : blueprint.name}
          </h1>
          {((lang === 'pt' && blueprint.description_pt) || blueprint.description) && (
            <p className="mt-1 text-xs sm:text-sm text-text-secondary">
              {lang === 'pt' && blueprint.description_pt ? blueprint.description_pt : blueprint.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* Mobile phase selector (horizontal scroll) */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {PHASE_DEFS.map((phase) => {
          const isActive = activePhase === phase.number;
          const Icon = phase.icon;
          return (
            <button key={phase.number} onClick={() => setActivePhase(phase.number)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                isActive ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
              style={isActive ? { background: `${phase.color}15`, border: `1px solid ${phase.color}30` } : { background: 'rgba(255,255,255,0.03)' }}>
              <Icon size={14} style={{ color: isActive ? phase.color : undefined }} />
              <span className="hidden sm:inline">{dict.phase} {phase.number}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6">
        {/* Desktop timeline */}
        <div className="hidden w-56 shrink-0 lg:block">
          <div className="glass-card p-3 sticky top-6">
            {PHASE_DEFS.map((phase, idx) => {
              const isActive = activePhase === phase.number;
              const Icon = phase.icon;
              const isLast = idx === PHASE_DEFS.length - 1;
              return (
                <div key={phase.number} className="relative">
                  <button onClick={() => setActivePhase(phase.number)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all ${
                      isActive ? 'bg-white/[0.06] font-semibold text-text-primary' : 'text-text-secondary hover:bg-white/[0.03]'
                    }`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? 'shadow-lg' : 'opacity-50'}`}
                      style={{ background: isActive ? `${phase.color}25` : 'transparent', border: `2px solid ${isActive ? phase.color : 'rgba(255,255,255,0.1)'}` }}>
                      <Icon size={14} style={{ color: isActive ? phase.color : 'var(--color-text-tertiary)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{dict.phase} {phase.number}</p>
                      <p className="truncate text-xs">
                        {lang === 'pt' && blueprint.phases.find(p => p.phase_number === phase.number)?.title_pt
                          ? blueprint.phases.find(p => p.phase_number === phase.number)?.title_pt
                          : phase.title}
                      </p>
                    </div>
                  </button>
                  {!isLast && <div className="ml-[22px] h-2 w-px bg-white/[0.08]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activePhase} className="glass-card overflow-hidden"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              {/* Phase header */}
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${currentPhaseDef.color}20`, border: `1px solid ${currentPhaseDef.color}30` }}>
                    {(() => { const Icon = currentPhaseDef.icon; return <Icon size={18} style={{ color: currentPhaseDef.color }} />; })()}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.phase} {activePhase}</p>
                    <h3 className="text-base font-bold text-text-primary">
                      {lang === 'pt' && currentPhase?.title_pt ? currentPhase.title_pt : currentPhaseDef.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Phase content */}
              <div className="p-5">
                {/* Recursos Técnicos: Esquema Eléctrico (Fases 2 y 4) */}
                {(activePhase === 2 || activePhase === 4) && (
                  <div className="mb-8 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-bioalert/10 text-accent-bioalert">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Esquema Eléctrico Principal</h3>
                        <p className="text-xs text-zinc-400">SCH_BioAlert_Sch_V1_2026-03-19.pdf</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href="/docs/SCH_BioAlert_Sch_V1_2026-03-19.pdf"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                      >
                        Ver Documento
                      </a>
                      <a
                        href="/docs/SCH_BioAlert_Sch_V1_2026-03-19.pdf"
                        download
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-accent-bioalert hover:bg-accent-bioalert/10 border border-accent-bioalert/20 rounded-md transition-colors"
                      >
                        <Download size={14} />
                        Descargar
                      </a>
                    </div>
                  </div>
                )}
                {activePhase === 1 ? (
                  <PublicBOMView materials={blueprint.materials} dict={dict} onOpenSchematic={(url, title) => setSchematicViewer({ url, title })} />
                ) : (
                  <PublicDocView phase={currentPhase ?? null} dict={dict} lang={lang} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Schematic Viewer */}
      <AnimatePresence>
        {schematicViewer && (
          <SchematicViewerModal url={schematicViewer.url} title={schematicViewer.title} onClose={() => setSchematicViewer(null)} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-8 pb-6 text-center">
        <p className="text-[10px] text-text-tertiary">
          Documento generado por Brivex Mastermind • Solo lectura
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// Public BOM View — RESTRICTED: no stock, no prices, no inventory links
// ══════════════════════════════════════

function PublicBOMView({ materials, dict, onOpenSchematic }: { materials: BlueprintMaterial[], dict: any, onOpenSchematic: (u: string, t: string) => void }) {
  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Package size={40} className="mb-3 text-text-tertiary" />
        <p className="text-sm text-text-secondary">{dict.noMaterials}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-tertiary">
        {materials.length} componente{materials.length !== 1 ? 's' : ''} necesarios
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Componente</th>
              <th className="pb-2 pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.quantityNeeded}</th>
              <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{dict.notes}</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat) => (
              <tr key={mat.id} className="border-b border-white/[0.04] last:border-b-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3">
                      {mat.inventory_item?.image_url ? (
                        <img src={mat.inventory_item.image_url} alt={mat.part_name} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={14} className="text-text-tertiary" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <p className="font-medium text-text-primary">{mat.part_name}</p>
                      {mat.inventory_item?.schematic_url && (
                        <button
                          onClick={() => onOpenSchematic(mat.inventory_item!.schematic_url!, mat.part_name)}
                          className="group flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
                        >
                          <ExternalLink size={12} />
                          {dict.viewSchematic || 'Ver esquema'}
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-center">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-bold text-text-primary">
                    {mat.quantity_needed}
                  </span>
                </td>
                <td className="py-3 text-xs text-text-tertiary">{mat.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// Public Documentation View — Read-only
// ══════════════════════════════════════

function PublicDocView({ phase, dict, lang }: { phase: BlueprintPhase | null, dict: any, lang: string | null }) {
  const isPt = lang === 'pt';
  const hasPtContent = !!phase?.content_pt?.trim();
  const contentToRender = (isPt && hasPtContent) ? phase?.content_pt : phase?.content_markdown;

  if (!contentToRender) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <FileText size={40} className="mb-3 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Sin documentación para esta fase</p>
      </div>
    );
  }

  const html = markdownToHtml(contentToRender);
  return (
    <div>
      {isPt && !hasPtContent && !!phase?.content_markdown && (
        <div className="mb-6 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-xs font-medium text-orange-400">
          (Tradução pendente) Exibindo conteúdo original em espanhol.
        </div>
      )}
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
    </div>
  );
}

// ── Markdown → HTML (same lightweight converter) ──
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
