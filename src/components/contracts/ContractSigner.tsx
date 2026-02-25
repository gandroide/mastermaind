'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { uploadSignedPdf, markContractSigned } from '@/services/contracts';
import type { Contract } from '@/types/database';
import {
  X,
  Loader2,
  Eraser,
  Undo2,
  PenTool,
  Check,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ContractSignerProps {
  contract: Contract;
  onClose: () => void;
}

// ── Stroke types ────────────────────────────────────
interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
}

// ── Constants ───────────────────────────────────────
const MIN_LINE_WIDTH = 1;
const MAX_LINE_WIDTH = 6;
const INK_COLOR = '#1a1a2e';

export default function ContractSigner({ contract, onClose }: ContractSignerProps) {
  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── State ──
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  // Ref mirror of isDrawing — needed because native event listeners capture stale closures
  const isDrawingRef = useRef(false);

  // We store the PDF document for later merge
  const pdfDocRef = useRef<ArrayBuffer | null>(null);
  // Store page dimensions for PDF merge
  const pageDimsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  // Track finger position for manual scroll (touch-action: none requires manual handling)
  const touchScrollRef = useRef<{ x: number; y: number } | null>(null);

  // ── Load PDF with PDF.js ──────────────────────────
  const renderPdfPage = useCallback(async (pageNum: number) => {
    if (!contract.pdf_url) {
      setPdfError('Este contrato no tiene un PDF adjunto.');
      setPdfLoading(false);
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker to local file (copied from node_modules to public/)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      let pdfBytes: ArrayBuffer;

      if (!pdfDocRef.current) {
        // First load: fetch the PDF
        const response = await fetch(contract.pdf_url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        pdfBytes = await response.arrayBuffer();
        pdfDocRef.current = pdfBytes;
      } else {
        pdfBytes = pdfDocRef.current;
      }

      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
      setTotalPages(pdf.numPages);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Also resize the ink canvas to match
      const inkCanvas = inkCanvasRef.current;
      if (inkCanvas) {
        inkCanvas.width = viewport.width;
        inkCanvas.height = viewport.height;
      }

      // Store page dimensions for PDF merge (unscaled)
      const unscaledViewport = page.getViewport({ scale: 1 });
      pageDimsRef.current = {
        width: unscaledViewport.width,
        height: unscaledViewport.height,
      };

      await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

      // Redraw existing strokes on ink canvas (they're scaled to current viewport)
      redrawStrokes();
    } catch (err) {
      console.error('PDF load error:', err);
      setPdfError('Error al cargar el PDF. Verifica la URL.');
    } finally {
      setPdfLoading(false);
    }
  }, [contract.pdf_url, scale]);

  useEffect(() => {
    renderPdfPage(currentPage);
  }, [currentPage, renderPdfPage]);

  // ── Redraw all strokes ────────────────────────────
  const redrawStrokes = useCallback(() => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke.points, stroke.color);
    }
  }, [strokes]);

  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes]);

  // ── Draw a single stroke ──────────────────────────
  function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string
  ) {
    if (points.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Pressure-sensitive line width
      const pressure = curr.pressure;
      ctx.lineWidth =
        MIN_LINE_WIDTH + (MAX_LINE_WIDTH - MIN_LINE_WIDTH) * pressure;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  }

  // ── Pointer Events — native listeners for iPadOS pen/finger discrimination ──
  // We use native listeners with { passive: false } because:
  // 1. touch-action: none on the canvas gives JS full control
  // 2. For pen: we preventDefault() to block scroll and draw on the canvas
  // 3. For touch: we DON'T preventDefault() — instead we manually scroll the container
  // React synthetic events don't support { passive: false }, so native is required.

  const getCanvasPointFromNative = useCallback((e: PointerEvent): StrokePoint | null => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
      pressure: e.pressure || 0.5,
    };
  }, []);

  useEffect(() => {
    const canvas = inkCanvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      // ── FINGER: start manual scroll tracking ──
      if (e.pointerType === 'touch') {
        touchScrollRef.current = { x: e.clientX, y: e.clientY };
        return; // don't preventDefault → allows momentum, rubber-banding, etc.
      }

      // ── PEN / MOUSE: start drawing ──
      if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
      e.preventDefault();
      e.stopPropagation();

      const point = getCanvasPointFromNative(e);
      if (!point) return;

      setIsDrawing(true);
      isDrawingRef.current = true;
      setCurrentStroke([point]);

      // Draw initial dot
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = INK_COLOR;
        ctx.beginPath();
        ctx.arc(point.x, point.y, MIN_LINE_WIDTH, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onMove = (e: PointerEvent) => {
      // ── FINGER: manual scroll ──
      if (e.pointerType === 'touch' && touchScrollRef.current && container) {
        const dx = touchScrollRef.current.x - e.clientX;
        const dy = touchScrollRef.current.y - e.clientY;
        container.scrollBy(dx, dy);
        touchScrollRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // ── PEN / MOUSE: draw ──
      if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const point = getCanvasPointFromNative(e);
      if (!point) return;

      setCurrentStroke((prev) => {
        const updated = [...prev, point];
        const ctx = canvas.getContext('2d');
        if (ctx && updated.length >= 2) {
          const lastTwo = updated.slice(-2);
          drawStroke(ctx, lastTwo, INK_COLOR);
        }
        return updated;
      });
    };

    const onUp = (e: PointerEvent) => {
      // ── FINGER: stop tracking ──
      if (e.pointerType === 'touch') {
        touchScrollRef.current = null;
        return;
      }

      // ── PEN / MOUSE: finalize stroke ──
      if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

      setIsDrawing(false);
      isDrawingRef.current = false;
      setCurrentStroke((prev) => {
        if (prev.length > 1) {
          setStrokes((s) => [...s, { points: prev, color: INK_COLOR }]);
        }
        return [];
      });
    };

    canvas.addEventListener('pointerdown', onDown, { passive: false });
    canvas.addEventListener('pointermove', onMove, { passive: false });
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [getCanvasPointFromNative, pdfLoading, pdfError]);

  // ── Undo ──────────────────────────────────────────
  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // ── Clear ─────────────────────────────────────────
  const handleClear = () => {
    setStrokes([]);
    const canvas = inkCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ── Save: Merge signature into PDF ────────────────
  const handleSave = async () => {
    if (strokes.length === 0) return;
    if (!contract.pdf_url) return;

    setSaving(true);
    try {
      // 1. Get the ink canvas as PNG
      const inkCanvas = inkCanvasRef.current;
      if (!inkCanvas) throw new Error('No ink canvas');

      const signatureDataUrl = inkCanvas.toDataURL('image/png');
      const signatureResponse = await fetch(signatureDataUrl);
      const signatureBytes = await signatureResponse.arrayBuffer();

      // 2. Fetch a FRESH copy of the PDF (the original buffer is "detached" by PDF.js)
      const freshPdfResponse = await fetch(contract.pdf_url);
      if (!freshPdfResponse.ok) throw new Error(`HTTP ${freshPdfResponse.status}`);
      const freshPdfBytes = await freshPdfResponse.arrayBuffer();

      // 3. Load the fresh PDF with pdf-lib and embed the signature
      const pdfDoc = await PDFDocument.load(freshPdfBytes);
      const signatureImage = await pdfDoc.embedPng(new Uint8Array(signatureBytes));

      // Get the current page
      const pages = pdfDoc.getPages();
      const page = pages[currentPage - 1];
      if (page) {
        const { width, height } = page.getSize();

        // Draw the signature image scaled to the full page
        page.drawImage(signatureImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      // 4. Save the merged PDF
      const mergedPdfBytes = await pdfDoc.save();

      // 5. Upload to Supabase Storage
      const publicUrl = await uploadSignedPdf(
        contract.id,
        new Uint8Array(mergedPdfBytes)
      );

      // 6. Update contract status
      await markContractSigned(contract.id, publicUrl);

      setSaved(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Save error:', err);
      alert('Error al guardar la firma. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Zoom ──────────────────────────────────────────
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.75));

  // ── Navigation ────────────────────────────────────
  const prevPage = () => {
    if (currentPage > 1) {
      setStrokes([]);
      setCurrentPage((p) => p - 1);
    }
  };
  const nextPage = () => {
    if (currentPage < totalPages) {
      setStrokes([]);
      setCurrentPage((p) => p + 1);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col bg-surface-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Toolbar */}
      <div className="glass flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="touch-target flex items-center gap-2 rounded-xl p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <X size={20} />
          </button>
          <div className="ml-2">
            <h3 className="text-sm font-bold text-text-primary line-clamp-1">
              {contract.title}
            </h3>
            <p className="text-[11px] text-text-tertiary">
              Página {currentPage} de {totalPages || '…'}
            </p>
          </div>
        </div>

        {/* Center tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 hover:text-text-primary disabled:opacity-30"
            title="Deshacer"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 hover:text-text-primary disabled:opacity-30"
            title="Borrar todo"
          >
            <Eraser size={18} />
          </button>

          <div className="mx-2 h-5 w-px bg-white/10" />

          <button onClick={zoomOut} className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 hover:text-text-primary" title="Zoom −">
            <ZoomOut size={18} />
          </button>
          <span className="min-w-[3ch] text-center text-xs text-text-tertiary">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 hover:text-text-primary" title="Zoom +">
            <ZoomIn size={18} />
          </button>

          <div className="mx-2 h-5 w-px bg-white/10" />

          {/* Page nav */}
          <button onClick={prevPage} disabled={currentPage <= 1} className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextPage} disabled={currentPage >= totalPages} className="touch-target rounded-xl p-2.5 text-text-secondary hover:bg-white/5 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Save */}
        <div className="flex items-center gap-2">
          <div className="mr-2 flex items-center gap-1.5 text-xs text-text-tertiary">
            <PenTool size={12} />
            {strokes.length} trazo{strokes.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || saved || strokes.length === 0}
            className="touch-target flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: saved
                ? 'var(--color-success)'
                : 'linear-gradient(135deg, #34d399, #059669)',
            }}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <PenTool size={16} />
            )}
            {saving ? 'Guardando…' : saved ? '¡Firmado!' : 'Completar Firma'}
          </button>
        </div>
      </div>

      {/* PDF + Ink Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-surface-1/50"
        style={{ touchAction: 'auto' }}
      >
        {/* Loading */}
        {pdfLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-text-tertiary" />
              <p className="text-sm text-text-tertiary">Cargando PDF...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {pdfError && (
          <div className="flex h-full items-center justify-center">
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-sm text-danger">{pdfError}</p>
              <p className="mt-2 text-xs text-text-tertiary">
                Asegúrate de que el contrato tiene un PDF vinculado
              </p>
            </div>
          </div>
        )}

        {/* Canvas stack */}
        {!pdfLoading && !pdfError && (
          <div className="flex justify-center py-6">
            <div className="relative shadow-2xl">
              {/* PDF render canvas (bottom layer) */}
              <canvas
                ref={pdfCanvasRef}
                className="rounded-lg"
                style={{ display: 'block' }}
              />

              {/* Ink canvas (top layer, transparent) — pen draws, finger scrolls */}
              <canvas
                ref={inkCanvasRef}
                className="absolute inset-0 rounded-lg"
                style={{
                  touchAction: 'none',
                  cursor: 'crosshair',
                }}
                /* Pointer events are handled via native listeners in useEffect above */
              />

              {/* Signature guide hint */}
              {strokes.length === 0 && !pdfLoading && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-20">
                  <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur-sm">
                    <PenTool size={14} />
                    Usa tu Apple Pencil para firmar sobre el documento
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
