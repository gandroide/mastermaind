import { create } from 'zustand';

export type BusinessUnit = 'all' | 'brivex' | 'bio-alert' | 'tech-ops';

export interface BusinessUnitConfig {
  id: BusinessUnit;
  label: string;
  color: string;
  slug: string;
}

export const BUSINESS_UNITS: BusinessUnitConfig[] = [
  { id: 'all',       label: 'Global',    color: 'var(--color-accent-global)',   slug: 'global' },
  { id: 'brivex',    label: 'Brivex',    color: 'var(--color-accent-brivex)',   slug: 'brivex' },
  { id: 'bio-alert', label: 'Bio-Alert', color: 'var(--color-accent-bioalert)', slug: 'bio-alert' },
  // { id: 'tech-ops',  label: 'Tech Ops',  color: 'var(--color-accent-techops)',  slug: 'tech-ops' },
];

interface AppState {
  // ── Business Unit Context ──
  activeUnit: BusinessUnit;
  setActiveUnit: (unit: BusinessUnit) => void;

  // ── Sidebar ──
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // ── Helpers ──
  getActiveConfig: () => BusinessUnitConfig;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Business Unit Context ──
  activeUnit: 'all',
  setActiveUnit: (unit) => set({ activeUnit: unit }),

  // ── Sidebar ──
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ── Helpers ──
  getActiveConfig: () => {
    const { activeUnit } = get();
    return BUSINESS_UNITS.find((u) => u.id === activeUnit) ?? BUSINESS_UNITS[0];
  },
}));
