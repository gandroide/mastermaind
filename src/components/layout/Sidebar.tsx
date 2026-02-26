'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileSignature,
  DollarSign,
  Package,
  BookOpen,
  Server,
  X,
  WalletCards,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/clients',    label: 'Clients',     icon: Users },
  { href: '/contracts',  label: 'Contracts',   icon: FileSignature },
  { href: '/finance',    label: 'Finance',     icon: WalletCards },
  { href: '/inventory',  label: 'Inventory',   icon: Package, showFor: ['all', 'bio-alert'] as string[] },
  { href: '/blueprints', label: 'Blueprints',  icon: BookOpen, showFor: ['all', 'bio-alert'] as string[] },
  // { href: '/tech-hub',   label: 'Tech Hub',    icon: Server },
];

const sidebarVariants = {
  open: {
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  closed: {
    x: -280,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

const overlayVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, activeUnit } = useAppStore();
  const activeConfig = useAppStore((s) => s.getActiveConfig());

  // Filter nav items based on active BU
  const visibleItems = NAV_ITEMS.filter((item) =>
    !item.showFor || item.showFor.includes(activeUnit)
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh w-[260px] flex-col',
          'glass border-r border-white/[0.06]',
          'lg:relative lg:z-auto'
        )}
        variants={sidebarVariants}
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background: `linear-gradient(135deg, ${activeConfig.color}30, ${activeConfig.color}10)`,
                color: activeConfig.color,
                border: `1px solid ${activeConfig.color}40`,
              }}
            >
              M
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-text-primary">
                MASTERMIND
              </h1>
              <p className="text-[11px] text-text-tertiary">CEO Command Center</p>
            </div>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="touch-target flex items-center justify-center rounded-xl p-2 text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // Close sidebar on mobile after nav
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  'touch-target group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                )}
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${activeConfig.color}12, transparent)`,
                      border: `1px solid ${activeConfig.color}20`,
                    }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  size={18}
                  className="relative z-10"
                  style={{ color: isActive ? activeConfig.color : undefined }}
                />
                <span className="relative z-10">{item.label}</span>

                {/* Active accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-accent"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{ backgroundColor: activeConfig.color }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-text-primary">
              AP
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-text-primary">CEO</p>
              <p className="truncate text-[11px] text-text-tertiary">admin@brivex.io</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
