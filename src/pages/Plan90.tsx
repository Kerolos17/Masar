import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle, Trash2, AlertTriangle } from 'lucide-react';
import { useMassarStore } from '../lib/store';
import { cn, todayStr, formatDate } from '../lib/utils';

export default function Plan90() {
  const { plan90, setPlan90, tasks } = useMassarStore();
  const [openWeeks, setOpenWeeks] = useState<number[]>([1]);
  const [isDeleting, setIsDeleting] = useState(false);

  const today = todayStr();

  const weeks = useMemo(() => {
    if (!plan90) return [];
    const w: any[] = [];
    for (let i = 0; i < 13; i++) {
      const weekDays = plan90.days.filter(d => d.dayNumber > i * 7 && d.dayNumber <= (i + 1) * 7);
      if (weekDays.length > 0) {
        w.push({ number: i + 1, days: weekDays });
      }
    }
    return w;
  }, [plan90]);

  const overallProgress = useMemo(() => {
    if (!plan90) return 0;
    const planTasks = tasks.filter(t => t.source === 'plan90');
    if (planTasks.length === 0) return 0;
    const done = planTasks.filter(t => t.done).length;
    return Math.round((done / planTasks.length) * 100);
  }, [tasks, plan90]);

  const toggleWeek = (week: number) => {
    setOpenWeeks(prev => 
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const deletePlan = async () => {
    await fetch('/api/plan90', { method: 'DELETE' });
    setPlan90(null);
    setIsDeleting(false);
  };

  if (!plan90) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
        <div className="w-24 h-24 bg-surface rounded-[2rem] flex items-center justify-center text-muted">
          <Target size={48} />
        </div>
        <div className="max-w-xs">
          <h2 className="text-2xl font-bold mb-2">لا توجد خطة 90 يوم</h2>
          <p className="text-muted mb-6">ابدأ محادثة مع مسار واطلب منه إنشاء خطة 90 يوم لهدفك الرئيسي.</p>
          <a
            href="/chat"
            className="inline-block bg-teal text-bg px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
          >
            اطلب خطة الآن
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Card */}
      <div className="bg-surface border border-border rounded-3xl p-5 md:p-8 space-y-5 md:space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-teal/20">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            className="h-full bg-teal"
          />
        </div>

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-teal uppercase tracking-widest">خطة الـ 90 يوم</span>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{plan90.goal}</h1>
          </div>
          <button
            onClick={() => setIsDeleting(true)}
            className="p-2 text-muted hover:text-red transition-colors shrink-0"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <Calendar size={16} className="text-teal" />
            <span className="text-muted">تاريخ البدء:</span>
            <span className="font-medium">{plan90.startDate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <CheckCircle2 size={16} className="text-teal" />
            <span className="text-muted">الإنجاز الكلي:</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {weeks.map((week) => (
          <div key={week.number} className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleWeek(week.number)}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-surface2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-teal/10 text-teal rounded-lg flex items-center justify-center font-bold text-sm">
                  {week.number}
                </span>
                <h3 className="font-bold">الأسبوع {week.number}</h3>
              </div>
              {openWeeks.includes(week.number) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
              {openWeeks.includes(week.number) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 space-y-4 border-t border-border/50">
                    {week.days.map((day: any) => {
                      const dayDate = new Date(plan90.startDate);
                      dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);
                      const dateStr = dayDate.toISOString().split('T')[0];
                      const isToday = dateStr === today;
                      const dayTasks = tasks.filter(t => t.date === dateStr && t.source === 'plan90');

                      return (
                        <div
                          key={day.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all",
                            isToday ? "bg-coral/5 border-coral/30" : "bg-surface2/50 border-border"
                          )}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="font-bold text-sm">اليوم {day.dayNumber}: {day.title}</h4>
                              <p className="text-[10px] text-muted">{formatDate(dateStr)}</p>
                            </div>
                            {isToday && (
                              <span className="bg-coral text-bg text-[10px] font-bold px-2 py-0.5 rounded-full">اليوم</span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {dayTasks.length === 0 ? (
                              <p className="text-[10px] text-muted italic">لا توجد مهام مجدولة لهذا اليوم في الخطة.</p>
                            ) : (
                              dayTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 text-xs">
                                  {task.done ? <CheckCircle2 size={14} className="text-green" /> : <Circle size={14} className="text-muted" />}
                                  <span className={cn(task.done && "line-through text-muted")}>{task.title}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleting && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-surface border border-border rounded-3xl p-8 z-[90] text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red/10 text-red rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">حذف الخطة؟</h3>
                <p className="text-sm text-muted">سيتم حذف خطة الـ 90 يوم وجميع المهام المرتبطة بها نهائياً.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 bg-surface2 text-muted py-3 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={deletePlan}
                  className="flex-1 bg-red text-white py-3 rounded-xl font-bold"
                >
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
