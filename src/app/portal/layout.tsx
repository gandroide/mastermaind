'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { Package, ShieldX } from 'lucide-react';

// ── Token → Location mapping ──
// Partners access with: /portal/inventory?token=XXX
const PORTAL_TOKENS: Record<string, { location: string; label: string }> = {
  'PT-2024':  { location: 'Portugal',    label: 'Portugal' },
  'AR-2024':  { location: 'Argentina',   label: 'Argentina' },
  'DO-2024':  { location: 'Dominicana',  label: 'Dominicana' },
  'DEV-TEST': { location: '',            label: 'Dev (All)' }, // dev token, sees everything
};

export function getPortalLocation(token: string | null): { valid: boolean; location: string; label: string } {
  if (!token) return { valid: false, location: '', label: '' };
  const entry = PORTAL_TOKENS[token];
  if (!entry) return { valid: false, location: '', label: '' };
  return { valid: true, ...entry };
}

function PortalGate({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const token = params.get('token');
  
  if (pathname?.includes('/contracts/upload')) {
    return <>{children}</>;
  }

  const { valid, label } = getPortalLocation(token);

  if (!valid) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 p-8 text-center">
        <div className="glass-card p-10">
          <ShieldX size={48} className="mx-auto mb-4 text-danger" />
          <h1 className="text-xl font-bold text-text-primary">Acceso Denegado</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Token de acceso inválido o faltante.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Contacta al administrador para obtener un enlace válido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-surface-0 overflow-hidden">
      {/* Minimal header */}
      <header className="glass sticky top-0 z-30 border-b border-white/[0.06] px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-bioalert/20 text-accent-bioalert">
              <Package size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary">Inventario Técnico</h1>
              <p className="text-[11px] text-text-tertiary">{label}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        <div className="mx-auto max-w-lg">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-surface-0">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent" />
      </div>
    }>
      <PortalGate>{children}</PortalGate>
    </Suspense>
  );
}
