import { Task } from '../types';
import { todayStr } from './utils';

const timerMap = new Map<string, { 
  exactId: number; 
  earlyId: number; 
  reminder5mId: number;
  fingerprint: string;
}>();

export function getStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as any;
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission;
}

async function showNotification(title: string, options: NotificationOptions) {
  if (getStatus() !== 'granted') return;
  
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    }
    // Fallback to standard Notification
    new Notification(title, options);
  } catch (e) {
    console.error('Notification error:', e);
    try {
      new Notification(title, options);
    } catch (fallbackError) {
      console.error('Fallback notification failed:', fallbackError);
    }
  }
}

function getTaskFingerprint(task: Task): string {
  return `${task.date}|${task.time}|${task.done}|${task.reminder5m}|${task.title}`;
}

export function scheduleTask(task: Task) {
  if (getStatus() !== 'granted' || !task.time || task.done) {
    cancelTask(task.id);
    return;
  }

  const fingerprint = getTaskFingerprint(task);
  const existing = timerMap.get(task.id);
  
  // If already scheduled with same fingerprint, do nothing
  if (existing && existing.fingerprint === fingerprint) {
    return;
  }

  const [hours, minutes] = task.time.split(':').map(Number);
  const taskDate = new Date(task.date);
  taskDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const timeUntilTask = taskDate.getTime() - now.getTime();
  const timeUntilEarly = timeUntilTask - 10 * 60 * 1000;
  const timeUntil5m = timeUntilTask - 5 * 60 * 1000;

  cancelTask(task.id);

  const ids = { exactId: -1, earlyId: -1, reminder5mId: -1, fingerprint };

  if (timeUntilTask > 0) {
    ids.exactId = window.setTimeout(() => {
      showNotification(`⏰ ${task.title}`, {
        body: 'حان وقت المهمة الآن',
        icon: '/favicon.ico',
        vibrate: [200, 100, 200]
      } as any);
    }, timeUntilTask);
  }

  if (timeUntilEarly > 0) {
    ids.earlyId = window.setTimeout(() => {
      showNotification(`⚠️ بعد 10 دقائق: ${task.title}`, {
        body: 'استعد للمهمة القادمة',
        icon: '/favicon.ico',
        vibrate: [100, 50, 100]
      } as any);
    }, timeUntilEarly);
  }

  if (task.reminder5m && timeUntil5m > 0) {
    ids.reminder5mId = window.setTimeout(() => {
      showNotification(`⚠️ بعد 5 دقائق: ${task.title}`, {
        body: 'المهمة ستبدأ قريباً',
        icon: '/favicon.ico',
        vibrate: [100, 50, 100]
      } as any);
    }, timeUntil5m);
  }

  timerMap.set(task.id, ids);
}

export function cancelTask(taskId: string) {
  const ids = timerMap.get(taskId);
  if (ids) {
    clearTimeout(ids.exactId);
    clearTimeout(ids.earlyId);
    clearTimeout(ids.reminder5mId);
    timerMap.delete(taskId);
  }
}

export function rescheduleAllToday(tasks: Task[], enabled: boolean) {
  if (!enabled || getStatus() !== 'granted') {
    // Clear everything if disabled
    for (const taskId of Array.from(timerMap.keys())) {
      cancelTask(taskId);
    }
    return;
  }

  const today = todayStr();
  const newTaskIds = new Set(tasks.map(t => t.id));

  // 1. Cancel tasks that were deleted from the store
  for (const taskId of Array.from(timerMap.keys())) {
    if (!newTaskIds.has(taskId)) {
      cancelTask(taskId);
    }
  }

  // 2. Schedule or update tasks
  tasks.forEach(task => {
    const isToday = task.date === today;
    if (isToday) {
      scheduleTask(task);
    } else {
      // If it's not today but was scheduled, cancel it
      cancelTask(task.id);
    }
  });
}
