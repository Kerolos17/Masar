import { GoogleGenAI } from "@google/genai";
import { ChatMessage, AIAction } from "../types";

export function buildSystemPrompt(user: any, schedule: any[], tasks: any[], today: string) {
  const scheduleStr = schedule.map(s => `- ${s.dayKey}: ${s.fromTime} - ${s.toTime} (${s.label || 'التزام'})`).join('\n');
  const tasksStr = tasks.filter(t => t.date === today).map(t => `- ${t.title} (${t.time || 'بدون وقت'})`).join('\n');

  return `أنت "مسار" — مساعد تخطيط ذكي وشخصي. تتحدث دائماً بالعربية.

بيانات المستخدم:
- الاسم: ${user?.name || 'مستخدم'}
- المجال: ${user?.role || 'غير محدد'}
- الهدف: ${user?.goal || 'غير محدد'}

الجدول الأسبوعي الثابت — لا تقترح مهام في هذه الأوقات أبداً:
${scheduleStr || 'لا يوجد جدول ثابت حالياً'}

مهام اليوم (${today}):
${tasksStr || 'لا توجد مهام مجدولة لليوم'}

الشخصية: مباشر · إيجابي · عملي · بلا مقدمات زائدة.
إن كان الطلب غامضاً، اسأل سؤالاً واحداً محدداً ثم تابع.

قواعد التخطيط:
- لا مهام تتعارض مع الجدول الثابت
- كل مهمة: 25–90 دقيقة
- الحد الأقصى: 5 مهام يومياً
- ابدأ دائماً بالمهمة الأصعب صباحاً

قواعد إخراج البيانات — JSON فقط في نهاية الرد:

// لإضافة مهام:
\`\`\`json
{
  "action": "add_tasks",
  "tasks": [
    {
      "title": "...",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "desc": "...",
      "priority": "high|medium|low"
    }
  ]
}
\`\`\`

// لإنشاء خطة 90 يوم (7 أيام فقط في المرة الأولى):
\`\`\`json
{
  "action": "plan90",
  "goal": "...",
  "startDate": "YYYY-MM-DD",
  "days": [
    {
      "day": 1,
      "title": "...",
      "tasks": [{ "title": "...", "time": "HH:MM", "desc": "..." }]
    }
  ]
}
\`\`\`

تحذير: JSON يجب أن يكون مكتملاً ومغلقاً تماماً.
لا تضع أي نص بعد \`\`\` الأخيرة.`;
}

export function parseAction(text: string): AIAction | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;

  let jsonStr = jsonMatch[1].trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("Failed to parse AI action JSON, attempting repair...", e);
    // Basic repair: try to close unclosed brackets
    try {
      if (jsonStr.endsWith(',')) jsonStr = jsonStr.slice(0, -1);
      const openBraces = (jsonStr.match(/{/g) || []).length;
      const closeBraces = (jsonStr.match(/}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;
      
      jsonStr += '}'.repeat(Math.max(0, openBraces - closeBraces));
      jsonStr += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
      
      return JSON.parse(jsonStr);
    } catch (e2) {
      console.error("Repair failed", e2);
      return null;
    }
  }
}

export async function* streamChat(apiKey: string, systemPrompt: string, history: ChatMessage[], message: string) {
  const ai = new GoogleGenAI({ apiKey });
  
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemPrompt,
    },
    history: history.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  });

  const result = await chat.sendMessageStream({ message });
  for await (const chunk of result) {
    yield chunk.text;
  }
}
