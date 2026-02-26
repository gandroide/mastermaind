'use client';

import { usePathname } from 'next/navigation';
import AppShell from './AppShell';

/**
 * LayoutSwitcher — decides which shell to render based on the route.
 * Portal routes (/portal/*) get NO shell (no sidebar, no header, no MasterSwitch).
 * All other routes get the full CEO AppShell.
 */
export default function LayoutSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Portal and share routes are fully isolated — no AppShell
  if (pathname.startsWith('/portal') || pathname.startsWith('/share')) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
