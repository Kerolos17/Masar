import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, ScheduleBlock, Task, Plan90, Plan90Day, ChatMessage } from '../types';

export type Plan90WithDays = Plan90 & { days: Plan90Day[] };

interface MassarStore {
  // data
  user: User | null;
  schedule: ScheduleBlock[];
  tasks: Task[];
  plan90: Plan90WithDays | null;
  messages: ChatMessage[];
  
  // config (persisted)
  geminiKey: string;
  notifEnabled: boolean;
  
  // ui
  isStreaming: boolean;
  
  // setters
  setUser: (u: User | null) => void;
  setSchedule: (s: ScheduleBlock[]) => void;
  setTasks: (t: Task[]) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, changes: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setPlan90: (p: Plan90WithDays | null) => void;
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  setGeminiKey: (k: string) => void;
  setNotifEnabled: (v: boolean) => void;
}

export const useMassarStore = create<MassarStore>()(
  persist(
    (set) => ({
      user: null,
      schedule: [],
      tasks: [],
      plan90: null,
      messages: [],
      geminiKey: '',
      notifEnabled: false,
      isStreaming: false,

      setUser: (user) => set({ user }),
      setSchedule: (schedule) => set({ schedule }),
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      updateTask: (id, changes) => set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t))
      })),
      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),
      setPlan90: (plan90) => set({ plan90 }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      setGeminiKey: (geminiKey) => set({ geminiKey }),
      setNotifEnabled: (notifEnabled) => set({ notifEnabled }),
    }),
    {
      name: 'massar-config',
      partialize: (state) => ({
        user: state.user,
        schedule: state.schedule,
        tasks: state.tasks,
        plan90: state.plan90,
        messages: state.messages,
        geminiKey: state.geminiKey,
        notifEnabled: state.notifEnabled,
      }),
    }
  )
);
