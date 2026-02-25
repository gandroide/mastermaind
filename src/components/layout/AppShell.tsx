'use client';

import { useAppStore } from '@/lib/store';
import MasterSwitch from './MasterSwitch';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-surface-0">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="glass z-30 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile / when sidebar closed */}
            {!sidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="touch-target flex items-center justify-center rounded-xl p-2 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                <Menu size={20} />
              </button>
            )}
          </div>

          {/* Master Switch — center */}
          <MasterSwitch />

          {/* Right side placeholder */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
