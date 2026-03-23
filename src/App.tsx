import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, MessageSquare, Target, Settings, Plus, CheckCircle2, ChevronRight, LogOut, Trash2, Download, Bell, BellOff, Info } from 'lucide-react';
import { useMassarStore } from './lib/store';
import { cn, getGreeting, todayStr } from './lib/utils';
import { rescheduleAllToday } from './lib/notifications';

// Pages
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
import Chat from './pages/Chat';
import Plan90 from './pages/Plan90';
import SettingsPage from './pages/Settings';

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useMassarStore();

  if (!user && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  const navItems = [
    { path: '/today', icon: LayoutDashboard, label: 'اليوم' },
    { path: '/chat', icon: MessageSquare, label: 'المحادثة' },
    { path: '/plan90', icon: Target, label: 'خطة 90' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-e border-border flex-col p-6 sticky top-0 h-[100dvh]">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center text-bg font-bold text-xl">م</div>
          <h1 className="text-2xl font-bold tracking-tight">مسار</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                location.pathname === item.path 
                  ? "bg-teal text-bg font-medium shadow-lg shadow-teal/20" 
                  : "text-muted hover:bg-surface2 hover:text-txt"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center text-teal font-bold">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted truncate">{user?.role || 'مستخدم مسار'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-border px-4 py-3 pb-safe flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300 relative px-4 py-1 rounded-2xl",
              location.pathname === item.path 
                ? "text-teal scale-110" 
                : "text-muted hover:text-txt"
            )}
          >
            <item.icon size={22} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] font-bold tracking-wide",
              location.pathname === item.path ? "opacity-100" : "opacity-70"
            )}>
              {item.label}
            </span>
            {location.pathname === item.path && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 w-1 h-1 bg-teal rounded-full shadow-[0_0_8px_#2dd4bf]"
              />
            )}
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0 relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto p-5 md:p-10 lg:p-12"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const { setUser, setSchedule, setTasks, setPlan90, setMessages, tasks, notifEnabled } = useMassarStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [u, s, t, p, m] = await Promise.all([
          fetch('/api/user').then(r => r.json()),
          fetch('/api/schedule').then(r => r.json()),
          fetch('/api/tasks').then(r => r.json()),
          fetch('/api/plan90').then(r => r.json()),
          fetch('/api/messages').then(r => r.json()),
        ]);
        
        if (u) setUser(u);
        setSchedule(s || []);
        setTasks(t || []);
        setPlan90(p || null);
        setMessages(m || []);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    rescheduleAllToday(tasks, notifEnabled);
  }, [tasks, notifEnabled]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center text-bg font-bold text-3xl"
        >
          م
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/*" element={
          <AppShell>
            <Routes>
              <Route path="/today" element={<Today />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/plan90" element={<Plan90 />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/" element={<Navigate to="/today" replace />} />
            </Routes>
          </AppShell>
        } />
      </Routes>
    </BrowserRouter>
  );
}
