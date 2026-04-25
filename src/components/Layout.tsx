import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/firebase';
import { LogOut, LayoutDashboard } from 'lucide-react';

export function Layout() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-black selection:text-white font-sans overflow-hidden">
      <header className="h-14 border-b border-black flex items-center justify-between px-6 shrink-0 z-10 bg-white shadow-none">
        <Link to="/dashboard" className="flex items-center gap-8 group">
          <span className="font-black text-xl tracking-tighter uppercase">VIZORA</span>
          <div className="h-4 w-[1px] bg-neutral-200"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden sm:block">WORKSPACE</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden sm:block">{user?.email}</span>
          <nav className="flex items-center gap-4">
            <Link to="/dashboard" className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-transparent hover:border-black transition-colors flex items-center gap-2">
              <LayoutDashboard size={12} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button 
              onClick={logout}
              className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-2"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
