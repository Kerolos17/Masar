import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Key, Bell, Download, Trash2, AlertCircle, CheckCircle2, BellOff, XCircle } from 'lucide-react';
import { useMassarStore } from '../lib/store';
import { cn } from '../lib/utils';
import { getStatus, requestPermission } from '../lib/notifications';

export default function SettingsPage() {
  const { user, setUser, geminiKey, setGeminiKey, notifEnabled, setNotifEnabled } = useMassarStore();
  
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || '');
  const [goal, setGoal] = useState(user?.goal || '');
  const [apiKey, setApiKey] = useState(geminiKey);
  const [notifStatus, setNotifStatus] = useState(getStatus());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotifStatus(getStatus());
  }, []);

  const handleSaveUser = async () => {
    setIsSaving(true);
    const updatedUser = { ...user, name, role, goal } as User;
    setUser(updatedUser);
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, goal })
      });
    } catch (e) {
      console.error("Failed to sync user settings", e);
    }
    setIsSaving(false);
  };

  const handleSaveKey = () => {
    setGeminiKey(apiKey);
    alert("تم حفظ مفتاح الـ API بنجاح.");
  };

  const toggleNotifications = async () => {
    if (notifStatus === 'default') {
      const res = await requestPermission();
      setNotifStatus(res as any);
      if (res === 'granted') setNotifEnabled(true);
    } else {
      setNotifEnabled(!notifEnabled);
    }
  };

  const exportData = async () => {
    const state = useMassarStore.getState();
    const data = {
      user: state.user,
      tasks: state.tasks,
      plan90: state.plan90,
      schedule: state.schedule,
      messages: state.messages,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `massar-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const resetAll = async () => {
    if (confirm("هل أنت متأكد من حذف جميع بياناتك؟ لا يمكن التراجع عن هذا الإجراء.")) {
      localStorage.clear();
      try {
        await fetch('/api/danger-zone/reset', { method: 'POST' });
      } catch (e) {
        console.error("Failed to sync reset", e);
      }
      window.location.href = '/onboarding';
    }
  };

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">الإعدادات</h1>

      {/* Profile Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-teal">
          <User size={24} />
          <h2 className="text-xl font-bold">الملف الشخصي</h2>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">المجال</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">الهدف الرئيسي</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal h-24 resize-none"
            />
          </div>
          <button
            onClick={handleSaveUser}
            disabled={isSaving}
            className="bg-teal text-bg px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </section>

      {/* API Key Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-teal">
          <Key size={24} />
          <h2 className="text-xl font-bold">مفتاح Gemini API</h2>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal"
              placeholder="أدخل مفتاح الـ API..."
            />
          </div>
          <button
            onClick={handleSaveKey}
            className="bg-teal text-bg px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
          >
            تحديث المفتاح
          </button>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-teal">
          <Bell size={24} />
          <h2 className="text-xl font-bold">الإشعارات</h2>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-bold">تنبيهات المهام</p>
              <p className="text-xs text-muted">تلقي إشعارات قبل 10 دقائق وعند بدء المهمة</p>
            </div>
            <button
              onClick={toggleNotifications}
              className={cn(
                "w-14 h-8 rounded-full relative transition-colors",
                notifEnabled ? "bg-teal" : "bg-surface2"
              )}
            >
              <motion.div
                animate={{ x: notifEnabled ? -24 : -4 }}
                className="absolute top-1 right-0 w-6 h-6 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <div className={cn(
            "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium",
            notifStatus === 'granted' ? "bg-green/10 text-green" :
            notifStatus === 'denied' ? "bg-red/10 text-red" :
            "bg-gold/10 text-gold"
          )}>
            {notifStatus === 'granted' ? <CheckCircle2 size={18} /> :
             notifStatus === 'denied' ? <XCircle size={18} /> :
             <AlertCircle size={18} />}
            
            {notifStatus === 'granted' ? (notifEnabled ? '✅ مفعّلة — الإشعارات تعمل' : '⚠️ معطّلة — اضغط للتفعيل') :
             notifStatus === 'denied' ? '🚫 محجوبة — غيّر إعدادات المتصفح' :
             notifStatus === 'unsupported' ? '❌ غير مدعومة في هذا المتصفح' :
             '⚠️ يرجى منح الإذن لتفعيل الإشعارات'}
          </div>
        </div>
      </section>

      {/* Data Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-teal">
          <Download size={24} />
          <h2 className="text-xl font-bold">البيانات والخصوصية</h2>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <button
            onClick={exportData}
            className="w-full flex items-center justify-between p-4 bg-surface2 hover:bg-surface2/80 border border-border rounded-2xl transition-colors"
          >
            <div className="text-right">
              <p className="font-bold">تصدير البيانات</p>
              <p className="text-xs text-muted">تحميل نسخة من جميع بياناتك كملف JSON</p>
            </div>
            <Download size={20} className="text-teal" />
          </button>

          <button
            onClick={resetAll}
            className="w-full flex items-center justify-between p-4 bg-red/5 hover:bg-red/10 border border-red/20 rounded-2xl transition-colors"
          >
            <div className="text-right">
              <p className="font-bold text-red">منطقة الخطر</p>
              <p className="text-xs text-red/60">حذف جميع البيانات والبدء من جديد</p>
            </div>
            <Trash2 size={20} className="text-red" />
          </button>
        </div>
      </section>
    </div>
  );
}
