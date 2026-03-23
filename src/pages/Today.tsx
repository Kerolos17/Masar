import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit2, AlertCircle, X, Bell } from 'lucide-react';
import { useMassarStore } from '../lib/store';
import { cn, getGreeting, todayStr, uid } from '../lib/utils';
import { Task } from '../types';

export default function Today() {
  const { tasks, addTask, updateTask, removeTask, user } = useMassarStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  
  const today = todayStr();
  const todayTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === today)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [tasks, today]);

  const progress = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    const done = todayTasks.filter(t => t.done).length;
    return Math.round((done / todayTasks.length) * 100);
  }, [todayTasks]);

  const toggleTask = async (task: Task) => {
    const updated = { ...task, done: !task.done };
    updateTask(task.id, { done: !task.done });
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done })
      });
    } catch (e) {
      console.error("Failed to sync task toggle", e);
    }
  };

  const deleteTask = async (id: string) => {
    removeTask(id);
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to sync task deletion", e);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center md:items-end">
        <div>
          <h2 className="text-muted text-sm md:text-base font-medium mb-0.5 md:mb-1">{getGreeting()}، {user?.name}</h2>
          <h1 className="text-2xl md:text-3xl font-bold">مهام اليوم</h1>
        </div>
        
        <div className="relative w-16 h-16 md:w-20 md:h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              className="text-surface"
            />
            <motion.circle
              cx="50" cy="50" r="40"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
              className="text-teal"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
            {progress}%
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {todayTasks.length === 0 ? (
          <div className="bg-surface border border-border rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto text-muted">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-muted">لا توجد مهام لليوم بعد. ابدأ بإضافة مهمة أو اطلب من مسار التخطيط لك.</p>
            <button
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="bg-teal text-bg px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              إضافة مهمة يدوياً
            </button>
          </div>
        ) : (
          todayTasks.map((task) => (
            <motion.div
              layout
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "group bg-surface border border-border rounded-2xl p-4 md:p-5 flex items-center gap-4 transition-all hover:border-teal/30 active:scale-[0.98] touch-manipulation",
                task.done && "opacity-60"
              )}
            >
              <button
                onClick={() => toggleTask(task)}
                className={cn(
                  "shrink-0 transition-all duration-300 w-10 h-10 flex items-center justify-center rounded-full",
                  task.done ? "text-green scale-110" : "text-muted hover:text-teal"
                )}
              >
                {task.done ? <CheckCircle2 size={28} /> : <Circle size={28} />}
              </button>

              <div 
                className="flex-1 min-w-0 cursor-pointer" 
                onClick={() => setViewingTask(task)}
              >
                <h3 className={cn("font-bold truncate", task.done && "line-through text-muted")}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {task.time && (
                    <span className="flex items-center gap-1 text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                      <Clock size={12} />
                      {task.time}
                    </span>
                  )}
                  {task.source !== 'manual' && (
                    <span className="text-[10px] bg-surface2 text-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {task.source === 'ai' ? 'ذكاء اصطناعي' : 'خطة 90'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-muted hover:text-teal transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-muted hover:text-red transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className={cn(
                "w-1.5 h-10 rounded-full",
                task.priority === 'high' ? "bg-red" : task.priority === 'medium' ? "bg-gold" : "bg-green"
              )} />
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-28 md:bottom-10 left-6 md:left-10 w-14 h-14 md:w-16 md:h-16 bg-teal text-bg rounded-2xl shadow-xl shadow-teal/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-border rounded-3xl p-6 md:p-8 z-[70] shadow-2xl no-scrollbar"
            >
              <AddTaskForm onClose={() => setIsModalOpen(false)} taskToEdit={editingTask} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Task Modal */}
      <AnimatePresence>
        {viewingTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingTask(null)}
              className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-border rounded-3xl p-6 md:p-8 z-[70] shadow-2xl no-scrollbar"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className={cn("text-xl font-bold pe-4", viewingTask.done && "line-through text-muted")}>
                  {viewingTask.title}
                </h3>
                <button onClick={() => setViewingTask(null)} className="text-muted hover:text-txt p-1 shrink-0">
                  <X size={20} />
                </button>
              </div>
              
              {viewingTask.description && (
                <div className="bg-surface2/50 p-4 rounded-xl mb-6 border border-border">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewingTask.description}</p>
                </div>
              )}

              <div className="space-y-3 mb-8">
                {viewingTask.time && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <span className="text-muted">الوقت:</span>
                    <span className="font-bold">{viewingTask.time}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-sm">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    viewingTask.priority === 'high' ? "bg-red/10 text-red" : 
                    viewingTask.priority === 'medium' ? "bg-gold/10 text-gold" : "bg-green/10 text-green"
                  )}>
                    <AlertCircle size={16} />
                  </div>
                  <span className="text-muted">الأولوية:</span>
                  <span className="font-bold">
                    {viewingTask.priority === 'high' ? 'عالية' : viewingTask.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </span>
                </div>

                {(viewingTask.reminder5m || viewingTask.customReminder) && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
                      <Bell size={16} />
                    </div>
                    <span className="text-muted">التنبيهات:</span>
                    <span className="font-bold">
                      {[
                        viewingTask.reminder5m ? 'قبل 5 دقائق' : null,
                        viewingTask.customReminder ? `قبل ${viewingTask.customReminder} دقيقة` : null
                      ].filter(Boolean).join('، ')}
                    </span>
                  </div>
                )}

                {viewingTask.source !== 'manual' && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-surface2 text-muted flex items-center justify-center shrink-0">
                      <Circle size={16} />
                    </div>
                    <span className="text-muted">المصدر:</span>
                    <span className="font-bold">
                      {viewingTask.source === 'ai' ? 'ذكاء اصطناعي' : 'خطة 90'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingTask(viewingTask);
                    setIsModalOpen(true);
                    setViewingTask(null);
                  }}
                  className="flex-1 bg-surface2 text-txt py-3 rounded-xl font-bold hover:bg-teal hover:text-bg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  تعديل
                </button>
                <button
                  onClick={() => {
                    deleteTask(viewingTask.id);
                    setViewingTask(null);
                  }}
                  className="flex-1 bg-red/10 text-red py-3 rounded-xl font-bold hover:bg-red hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  حذف
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddTaskForm({ onClose, taskToEdit }: { onClose: () => void, taskToEdit?: Task | null }) {
  const { addTask, updateTask } = useMassarStore();
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [desc, setDesc] = useState(taskToEdit?.description || '');
  const [time, setTime] = useState(taskToEdit?.time || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(taskToEdit?.priority || 'medium');
  const [reminder5m, setReminder5m] = useState(taskToEdit?.reminder5m || false);
  const [customReminder, setCustomReminder] = useState<number | ''>(taskToEdit?.customReminder || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskToEdit) {
      const updates = {
        title,
        description: desc,
        time: time || null,
        priority,
        reminder5m,
        customReminder: customReminder === '' ? null : Number(customReminder)
      };
      
      updateTask(taskToEdit.id, updates);
      
      try {
        await fetch(`/api/tasks/${taskToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (e) {
        console.error("Failed to sync task update", e);
      }
    } else {
      const newTask: Task = {
        id: uid(),
        title,
        description: desc,
        date: todayStr(),
        time: time || null,
        priority,
        done: false,
        reminder5m,
        customReminder: customReminder === '' ? null : Number(customReminder),
        source: 'manual',
        planDay: null,
        createdAt: new Date().toISOString()
      };

      addTask(newTask);

      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
      } catch (e) {
        console.error("Failed to sync new task", e);
      }
    }
    
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold mb-4">{taskToEdit ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
      
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal transition-colors"
        placeholder="عنوان المهمة..."
      />
      
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal transition-colors h-24 resize-none"
        placeholder="وصف إضافي (اختياري)..."
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">الوقت</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">الأولوية</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 focus:outline-none"
          >
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-surface2/50 p-3 rounded-xl border border-border">
        <input
          type="checkbox"
          id="reminder5m"
          checked={reminder5m}
          onChange={(e) => setReminder5m(e.target.checked)}
          className="w-5 h-5 rounded border-border text-teal focus:ring-teal bg-surface"
        />
        <label htmlFor="reminder5m" className="text-sm font-medium cursor-pointer">تنبيه قبل 5 دقائق</label>
      </div>

      <div className="bg-surface2/50 p-3 rounded-xl border border-border">
        <label className="block text-xs text-muted mb-2">تنبيه مخصص (بالدقائق قبل المهمة)</label>
        <input
          type="number"
          min="1"
          value={customReminder}
          onChange={(e) => setCustomReminder(e.target.value ? Number(e.target.value) : '')}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-teal text-sm"
          placeholder="مثال: 15"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-surface2 text-muted py-3 rounded-xl font-bold hover:text-txt transition-colors"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="flex-[2] bg-teal text-bg py-3 rounded-xl font-bold hover:opacity-90 transition-all"
        >
          حفظ المهمة
        </button>
      </div>
    </form>
  );
}
