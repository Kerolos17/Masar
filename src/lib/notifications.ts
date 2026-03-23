import { Task } from '../types';
import { todayStr } from './utils';

// Store notified events to avoid duplicate notifications
const NOTIFIED_KEY = 'massar_notified_events';

function getNotifiedEvents(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch {
    return {};
  }
}

function markAsNotified(eventId: string) {
  const events = getNotifiedEvents();
  events[eventId] = Date.now();
  
  // Cleanup old events (older than 24 hours)
  const now = Date.now();
  for (const key in events) {
    if (now - events[key] > 24 * 60 * 60 * 1000) {
      delete events[key];
    }
  }
  
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(events));
}

function hasBeenNotified(eventId: string): boolean {
  return !!getNotifiedEvents()[eventId];
}

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

let activeTasks: Task[] = [];
let checkInterval: number | null = null;
const exactTimers = new Map<string, number[]>();

function clearExactTimers() {
  exactTimers.forEach(timers => timers.forEach(t => window.clearTimeout(t)));
  exactTimers.clear();
}

function checkNotifications() {
  if (getStatus() !== 'granted') return;

  const now = new Date();
  const today = todayStr();

  activeTasks.forEach(task => {
    if (task.done || !task.time || task.date !== today) return;

    const [hours, minutes] = task.time.split(':').map(Number);
    const taskDate = new Date(task.date);
    taskDate.setHours(hours, minutes, 0, 0);
    
    const timeUntilTask = taskDate.getTime() - now.getTime();
    
    // Check exact time (within last 2 minutes to catch missed ones)
    if (timeUntilTask <= 0 && timeUntilTask > -2 * 60 * 1000) {
      const eventId = `${task.id}-exact`;
      if (!hasBeenNotified(eventId)) {
        showNotification(`⏰ ${task.title}`, {
          body: 'حان وقت المهمة الآن',
          icon: '/favicon.ico',
          vibrate: [200, 100, 200]
        } as any);
        markAsNotified(eventId);
      }
    }

    // Check 10 mins early
    const timeUntilEarly = timeUntilTask - 10 * 60 * 1000;
    if (timeUntilEarly <= 0 && timeUntilEarly > -2 * 60 * 1000) {
      const eventId = `${task.id}-early-10m`;
      if (!hasBeenNotified(eventId)) {
        showNotification(`⚠️ بعد 10 دقائق: ${task.title}`, {
          body: 'استعد للمهمة القادمة',
          icon: '/favicon.ico',
          vibrate: [100, 50, 100]
        } as any);
        markAsNotified(eventId);
      }
    }

    // Check 5 mins early
    if (task.reminder5m) {
      const timeUntil5m = timeUntilTask - 5 * 60 * 1000;
      if (timeUntil5m <= 0 && timeUntil5m > -2 * 60 * 1000) {
        const eventId = `${task.id}-early-5m`;
        if (!hasBeenNotified(eventId)) {
          showNotification(`⚠️ بعد 5 دقائق: ${task.title}`, {
            body: 'المهمة ستبدأ قريباً',
            icon: '/favicon.ico',
            vibrate: [100, 50, 100]
          } as any);
          markAsNotified(eventId);
        }
      }
    }

    // Check custom reminder
    if (task.customReminder) {
      const timeUntilCustom = timeUntilTask - task.customReminder * 60 * 1000;
      if (timeUntilCustom <= 0 && timeUntilCustom > -2 * 60 * 1000) {
        const eventId = `${task.id}-custom-${task.customReminder}m`;
        if (!hasBeenNotified(eventId)) {
          showNotification(`⚠️ بعد ${task.customReminder} دقيقة: ${task.title}`, {
            body: 'المهمة ستبدأ قريباً',
            icon: '/favicon.ico',
            vibrate: [100, 50, 100]
          } as any);
          markAsNotified(eventId);
        }
      }
    }
  });
}

function setupExactTimers() {
  clearExactTimers();
  if (getStatus() !== 'granted') return;

  const now = new Date();
  const today = todayStr();

  activeTasks.forEach(task => {
    if (task.done || !task.time || task.date !== today) return;

    const [hours, minutes] = task.time.split(':').map(Number);
    const taskDate = new Date(task.date);
    taskDate.setHours(hours, minutes, 0, 0);
    
    const timeUntilTask = taskDate.getTime() - now.getTime();
    const timers: number[] = [];

    if (timeUntilTask > 0) {
      timers.push(window.setTimeout(() => checkNotifications(), timeUntilTask));
    }

    const timeUntilEarly = timeUntilTask - 10 * 60 * 1000;
    if (timeUntilEarly > 0) {
      timers.push(window.setTimeout(() => checkNotifications(), timeUntilEarly));
    }

    if (task.reminder5m) {
      const timeUntil5m = timeUntilTask - 5 * 60 * 1000;
      if (timeUntil5m > 0) {
        timers.push(window.setTimeout(() => checkNotifications(), timeUntil5m));
      }
    }

    if (task.customReminder) {
      const timeUntilCustom = timeUntilTask - task.customReminder * 60 * 1000;
      if (timeUntilCustom > 0) {
        timers.push(window.setTimeout(() => checkNotifications(), timeUntilCustom));
      }
    }

    if (timers.length > 0) {
      exactTimers.set(task.id, timers);
    }
  });
}

export function rescheduleAllToday(tasks: Task[], enabled: boolean) {
  if (checkInterval) {
    window.clearInterval(checkInterval);
    checkInterval = null;
  }
  clearExactTimers();

  if (!enabled || getStatus() !== 'granted') {
    activeTasks = [];
    return;
  }

  activeTasks = tasks;
  
  // Check immediately
  checkNotifications();
  
  // Setup exact timers for foreground precision
  setupExactTimers();
  
  // Check every 30 seconds as fallback for background/suspended state
  checkInterval = window.setInterval(checkNotifications, 30000);
}

// Check for missed notifications when app comes to foreground
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkNotifications();
    }
  });
}
