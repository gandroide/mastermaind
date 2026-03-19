import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blueprint — Documentación Técnica',
  description: 'Guía de ensamblaje protegida por PIN',
};

export default function ShareBlueprintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-surface-0 text-text-primary">
      {children}
    </div>
  );
}
