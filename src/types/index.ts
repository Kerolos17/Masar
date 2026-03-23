export interface User {
  id: number;
  name: string;
  role: string | null;
  goal: string | null;
  createdAt: string;
}

export interface ScheduleBlock {
  id?: number;
  dayKey: string;
  fromTime: string;
  toTime: string;
  label: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  reminder5m: boolean;
  customReminder?: number | null;
  source: 'manual' | 'ai' | 'plan90';
  planDay: number | null;
  createdAt: string;
}

export interface Plan90 {
  id: number;
  goal: string;
  startDate: string;
  createdAt: string;
}

export interface Plan90Day {
  id: number;
  planId: number;
  dayNumber: number;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  actionSummary: string | null;
  createdAt: string;
}

export type AIAction =
  | { action: 'add_tasks'; tasks: (Partial<Task> & { customReminder?: number })[] }
  | { action: 'plan90'; goal: string; startDate: string; days: { day: number; title: string }[] };
