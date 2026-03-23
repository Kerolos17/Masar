import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Key, Info, CheckCircle2 } from 'lucide-react';
import { useMassarStore } from '../lib/store';
import { cn, DAY_KEYS, DAYS_AR } from '../lib/utils';
import { ScheduleBlock } from '../types';

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser, setSchedule, setGeminiKey } = useMassarStore();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [goal, setGoal] = useState('');

  // Step 2 State
  const [schedule, setLocalSchedule] = useState<ScheduleBlock[]>(
    DAY_KEYS.map(key => ({ dayKey: key, fromTime: '09:00', toTime: '17:00', label: 'عمل' }))
  );

  // Step 3 State
  const [apiKey, setApiKey] = useState('');

  const nextStep = () => {
    if (step === 1 && !name.trim()) return;
    if (step < 3) setStep(step + 1);
    else finish();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const finish = async () => {
    // Save to DB
    const user = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, goal })
    }).then(r => r.json());

    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });

    setUser(user);
    setSchedule(schedule);
    setGeminiKey(apiKey);
    navigate('/today');
  };

  const addBlock = (dayKey: string) => {
    setLocalSchedule([...schedule, { dayKey, fromTime: '18:00', toTime: '20:00', label: 'دراسة' }]);
  };

  const removeBlock = (index: number) => {
    setLocalSchedule(schedule.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: keyof ScheduleBlock, value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setLocalSchedule(newSchedule);
  };

  return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center p-4 md:p-6">
      <div className="max-w-xl w-full bg-surface/30 md:bg-transparent p-6 md:p-0 rounded-[2.5rem] md:rounded-none">
        {/* Progress Indicator */}
        <div className="flex justify-between mb-10 md:mb-12 relative px-2">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-surface -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold relative z-10 transition-all duration-300 text-sm md:text-base",
                step >= s ? "bg-teal text-bg scale-110" : "bg-surface text-muted"
              )}
            >
              {step > s ? <CheckCircle2 size={18} /> : s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">مرحباً بك في مسار</h2>
                <p className="text-muted">لنبدأ بتعريف هويتك وأهدافك</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted">الاسم (مطلوب)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal transition-colors"
                    placeholder="مثلاً: أحمد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted">المجال / الوظيفة</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal transition-colors"
                    placeholder="مثلاً: مطور برمجيات"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted">هدفك الرئيسي حالياً</label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal transition-colors h-24 resize-none"
                    placeholder="مثلاً: تعلم اللغة الإنجليزية أو إنهاء مشروع التخرج"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-2">جدولك الأسبوعي</h2>
                <p className="text-muted">أضف التزاماتك الثابتة (عمل، دراسة، رياضة) ليتمكن الذكاء الاصطناعي من التخطيط حولها</p>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-4 pe-2">
                {DAY_KEYS.map(dayKey => (
                  <div key={dayKey} className="bg-surface rounded-2xl p-4 border border-border">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-teal">{DAYS_AR[dayKey as keyof typeof DAYS_AR]}</h3>
                      <button
                        onClick={() => addBlock(dayKey)}
                        className="p-1 hover:bg-surface2 rounded-lg text-teal transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {schedule.filter(s => s.dayKey === dayKey).map((block, idx) => {
                        const globalIdx = schedule.indexOf(block);
                        return (
                          <div key={globalIdx} className="flex gap-2 items-center">
                            <input
                              type="time"
                              value={block.fromTime}
                              onChange={(e) => updateBlock(globalIdx, 'fromTime', e.target.value)}
                              className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
                            />
                            <span className="text-muted">إلى</span>
                            <input
                              type="time"
                              value={block.toTime}
                              onChange={(e) => updateBlock(globalIdx, 'toTime', e.target.value)}
                              className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
                            />
                            <input
                              type="text"
                              value={block.label || ''}
                              onChange={(e) => updateBlock(globalIdx, 'label', e.target.value)}
                              className="flex-1 bg-surface2 border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
                              placeholder="الوصف"
                            />
                            <button
                              onClick={() => removeBlock(globalIdx)}
                              className="text-red/50 hover:text-red p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">مفتاح Gemini API</h2>
                <p className="text-muted">نحتاج لهذا المفتاح لتفعيل ميزات الذكاء الاصطناعي</p>
              </div>

              <div className="bg-surface2/50 border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3 text-sm text-muted">
                  <Info className="text-teal shrink-0" size={20} />
                  <p>يتم تخزين المفتاح محلياً في متصفحك فقط، ولا يتم إرساله لأي خادم سوى Google Gemini API.</p>
                </div>

                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 ps-12 focus:outline-none focus:border-teal transition-colors"
                    placeholder="أدخل مفتاح الـ API هنا..."
                  />
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-teal text-sm hover:underline"
                >
                  احصل على مفتاح مجاني من هنا
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 mt-10 md:mt-12">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="w-full sm:flex-1 bg-surface border border-border text-txt py-3.5 md:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-surface2 transition-colors"
            >
              <ChevronRight size={20} />
              السابق
            </button>
          )}
          <button
            onClick={nextStep}
            className={cn(
              "w-full sm:flex-[2] bg-teal text-bg py-3.5 md:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all",
              step === 1 && !name.trim() && "opacity-50 cursor-not-allowed"
            )}
          >
            {step === 3 ? 'ابدأ الآن' : 'التالي'}
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
