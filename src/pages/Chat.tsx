import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useMassarStore } from '../lib/store';
import { cn, uid, todayStr } from '../lib/utils';
import { buildSystemPrompt, streamChat, parseAction } from '../lib/gemini';
import { ChatMessage, Task } from '../types';

export default function Chat() {
  const { messages, addMessage, user, schedule, tasks, geminiKey, addTask, setPlan90, isStreaming, setStreaming } = useMassarStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isStreaming) return;
    if (!geminiKey) {
      alert("يرجى إضافة مفتاح Gemini API في الإعدادات أولاً.");
      return;
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      actionSummary: null,
      createdAt: new Date().toISOString()
    };

    addMessage(userMsg);
    setInput('');
    setStreaming(true);

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMsg)
    });

    try {
      const systemPrompt = buildSystemPrompt(user, schedule, tasks, todayStr());
      let fullResponse = '';
      
      const modelMsg: ChatMessage = {
        id: uid(),
        role: 'model',
        content: '',
        actionSummary: null,
        createdAt: new Date().toISOString()
      };
      
      // Temporary message for streaming
      addMessage(modelMsg);

      const stream = streamChat(geminiKey, systemPrompt, messages, text);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        useMassarStore.getState().setMessages([
          ...useMassarStore.getState().messages.slice(0, -1),
          { ...modelMsg, content: fullResponse }
        ]);
      }

      // Handle Actions
      const action = parseAction(fullResponse);
      let actionSummary = null;

      if (action) {
        if (action.action === 'add_tasks') {
          const addedTasks = [];
          for (const t of action.tasks) {
            const newTask: Task = {
              id: uid(),
              title: t.title || 'مهمة جديدة',
              description: t.description || null,
              date: t.date || todayStr(),
              time: t.time || null,
              priority: t.priority || 'medium',
              done: false,
              reminder5m: false,
              source: 'ai',
              planDay: null,
              createdAt: new Date().toISOString()
            };
            const saved = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTask)
            }).then(r => r.json());
            addTask(saved);
            addedTasks.push(saved);
          }
          actionSummary = `✅ تمت إضافة ${addedTasks.length} مهام`;
        } else if (action.action === 'plan90') {
          const plan = await fetch('/api/plan90', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goal: action.goal,
              startDate: action.startDate,
              days: action.days.map(d => ({ dayNumber: d.day, title: d.title }))
            })
          }).then(r => r.json());
          setPlan90(plan);
          actionSummary = `🗺️ تم إنشاء خطة 90 يوم`;
        }
      }

      const finalModelMsg = { ...modelMsg, content: fullResponse, actionSummary };
      useMassarStore.getState().setMessages([
        ...useMassarStore.getState().messages.slice(0, -1),
        finalModelMsg
      ]);

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalModelMsg)
      });

    } catch (error) {
      console.error("Chat error", error);
      addMessage({
        id: uid(),
        role: 'model',
        content: "عذراً، حدث خطأ أثناء الاتصال بـ Gemini. يرجى التأكد من صحة مفتاح الـ API.",
        actionSummary: null,
        createdAt: new Date().toISOString()
      });
    } finally {
      setStreaming(false);
    }
  };

  const quickChips = [
    { label: 'خطة اليوم', prompt: 'ساعدني في تخطيط مهامي لليوم بناءً على جدولي.' },
    { label: 'أولوياتي', prompt: 'ما هي أهم المهام التي يجب أن أركز عليها الآن؟' },
    { label: 'خطة 90 يوم', prompt: 'أريد إنشاء خطة 90 يوم لهدفي الرئيسي.' },
    { label: 'راجع مهامي', prompt: 'هل يمكنك مراجعة مهامي الحالية وتقديم نصائح لتحسين إنتاجيتي؟' },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100dvh-100px)]">
      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-5 pb-6 scroll-smooth no-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 md:w-24 md:h-24 bg-surface rounded-[2rem] flex items-center justify-center text-teal shadow-2xl shadow-teal/10"
            >
              <Sparkles size={40} className="md:w-12 md:h-12" />
            </motion.div>
            <div className="max-w-xs">
              <h3 className="text-xl md:text-2xl font-bold mb-2">أهلاً بك في مسار</h3>
              <p className="text-sm text-muted">أنا مساعدك الذكي، كيف يمكنني مساعدتك اليوم؟</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 md:gap-4 max-w-[92%] md:max-w-[85%]",
              msg.role === 'user' ? "ms-auto flex-row-reverse" : "me-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 md:w-10 md:h-10 rounded-xl shrink-0 flex items-center justify-center text-xs md:text-sm",
              msg.role === 'user' ? "bg-surface2 text-teal" : "bg-teal text-bg"
            )}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            
            <div className="space-y-2 min-w-0">
              <div className={cn(
                "p-3.5 md:p-4 rounded-2xl text-[13px] md:text-sm leading-relaxed shadow-sm",
                msg.role === 'user' ? "bg-surface2 rounded-te-none" : "bg-surface rounded-ts-none border border-border"
              )}>
                <div className="markdown-body overflow-hidden">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              
              {msg.actionSummary && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 bg-teal/10 text-teal px-3 py-1.5 rounded-full text-xs font-bold border border-teal/20"
                >
                  {msg.actionSummary}
                </motion.div>
              )}
            </div>
          </div>
        ))}
        
        {isStreaming && (
          <div className="flex gap-4 max-w-[85%] me-auto">
            <div className="w-10 h-10 rounded-xl shrink-0 bg-teal text-bg flex items-center justify-center animate-pulse">
              <Bot size={20} />
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl rounded-ts-none flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="pt-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.prompt)}
              className="shrink-0 bg-surface border border-border hover:border-teal text-muted hover:text-teal px-4 py-2 rounded-full text-xs font-medium transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {!geminiKey && (
          <div className="bg-red/10 border border-red/20 rounded-xl p-3 flex items-center gap-3 text-red text-xs">
            <AlertCircle size={16} />
            <p>مفتاح Gemini API غير موجود. يرجى إضافته من الإعدادات لتتمكن من استخدام الذكاء الاصطناعي.</p>
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اسأل مسار أي شيء..."
            className="w-full bg-surface border border-border rounded-2xl px-6 py-4 pe-14 focus:outline-none focus:border-teal transition-colors shadow-xl"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              input.trim() && !isStreaming ? "bg-teal text-bg" : "bg-surface2 text-muted"
            )}
          >
            <Send size={20} className="-rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
