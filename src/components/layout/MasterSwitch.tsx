'use client';

import { motion } from 'framer-motion';
import { useAppStore, BUSINESS_UNITS, type BusinessUnit } from '@/lib/store';
import { Globe, Building2, Activity, Cpu } from 'lucide-react';

const ICONS: Record<BusinessUnit, React.ReactNode> = {
  'all':       <Globe size={14} />,
  'brivex':    <Building2 size={14} />,
  'bio-alert': <Activity size={14} />,
  'tech-ops':  <Cpu size={14} />,
};

export default function MasterSwitch() {
  const { activeUnit, setActiveUnit } = useAppStore();

  return (
    <div className="glass flex items-center gap-1 rounded-2xl p-1">
      {BUSINESS_UNITS.map((unit) => {
        const isActive = activeUnit === unit.id;

        return (
          <button
            key={unit.id}
            onClick={() => setActiveUnit(unit.id)}
            className="touch-target relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: isActive ? unit.color : 'var(--color-text-secondary)' }}
          >
            {/* Animated pill background */}
            {isActive && (
              <motion.div
                layoutId="master-switch-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${unit.color}15, ${unit.color}08)`,
                  border: `1px solid ${unit.color}30`,
                }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
              />
            )}

            {/* Icon + Label */}
            <span className="relative z-10 flex items-center gap-2">
              {ICONS[unit.id]}
              <span className="hidden sm:inline">{unit.label}</span>
            </span>

            {/* Active dot indicator */}
            {isActive && (
              <motion.span
                layoutId="master-switch-dot"
                className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: unit.color }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
