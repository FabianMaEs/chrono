import { TimerSession, UserSettings } from './types';
import { db } from './db';
import { soundNotifier } from './audio';
import { formatDurationHuman } from './calculations';

export type TimerTickListener = (elapsedMs: number, session: TimerSession) => void;

class TimerEngine {
  private session: TimerSession = {
    status: 'idle',
    startTime: null,
    accumulatedMs: 0,
    projectId: null,
    activityTitle: '',
    lastAlertMinutesTriggered: 0
  };

  private settings: UserSettings = {
    alertIntervalMinutes: 60,
    soundEnabled: true,
    vibrationEnabled: true,
    currencySymbol: '$'
  };

  private tickTimerId: number | null = null;
  private listeners: Set<TimerTickListener> = new Set();
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.settings = await db.getSettings();
    this.session = await db.getTimerSession();

    // Listen to visibility change to immediately re-sync timestamp
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.emitTick();
        if (this.session.status === 'running') {
          this.requestWakeLock();
        }
      } else {
        this.releaseWakeLock();
      }
    });

    if (this.session.status === 'running') {
      this.startTickLoop();
      this.requestWakeLock();
    }
  }

  subscribe(listener: TimerTickListener): () => void {
    this.listeners.add(listener);
    listener(this.getElapsedMs(), this.session);
    return () => this.listeners.delete(listener);
  }

  private emitTick() {
    const elapsed = this.getElapsedMs();
    this.checkAlertThreshold(elapsed);
    for (const listener of this.listeners) {
      listener(elapsed, this.session);
    }
  }

  private startTickLoop() {
    if (this.tickTimerId !== null) return;
    this.tickTimerId = window.setInterval(() => {
      this.emitTick();
    }, 500);
  }

  private stopTickLoop() {
    if (this.tickTimerId !== null) {
      clearInterval(this.tickTimerId);
      this.tickTimerId = null;
    }
  }

  private async requestWakeLock() {
    if ('wakeLock' in navigator && !this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      } catch {
        // WakeLock unsupported or rejected
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
    }
  }

  getElapsedMs(): number {
    if (this.session.status === 'running' && this.session.startTime !== null) {
      return this.session.accumulatedMs + (Date.now() - this.session.startTime);
    }
    return this.session.accumulatedMs;
  }

  getSession(): Readonly<TimerSession> {
    return this.session;
  }

  async updateSettings(settings: UserSettings) {
    this.settings = settings;
    await db.saveSettings(settings);
  }

  async setAssignedProject(projectId: string | null) {
    this.session.projectId = projectId;
    await db.saveTimerSession(this.session);
    this.emitTick();
  }

  async setAssignedTitle(title: string) {
    this.session.activityTitle = title;
    await db.saveTimerSession(this.session);
    this.emitTick();
  }

  async start(projectId: string | null = null, activityTitle: string = '') {
    if (this.session.status === 'running') return;

    const now = Date.now();
    if (this.session.status === 'idle') {
      this.session = {
        status: 'running',
        startTime: now,
        accumulatedMs: 0,
        projectId: projectId ?? this.session.projectId,
        activityTitle: activityTitle || this.session.activityTitle,
        lastAlertMinutesTriggered: 0
      };
    } else if (this.session.status === 'paused') {
      this.session.status = 'running';
      this.session.startTime = now;
    }

    if (this.settings.soundEnabled) soundNotifier.playTap();
    if (this.settings.vibrationEnabled) soundNotifier.vibrate(50);

    await db.saveTimerSession(this.session);
    this.startTickLoop();
    this.requestWakeLock();
    this.emitTick();
  }

  async pause() {
    if (this.session.status !== 'running') return;

    const now = Date.now();
    if (this.session.startTime !== null) {
      this.session.accumulatedMs += now - this.session.startTime;
    }
    this.session.status = 'paused';
    this.session.startTime = null;

    if (this.settings.soundEnabled) soundNotifier.playTap();
    if (this.settings.vibrationEnabled) soundNotifier.vibrate(50);

    await db.saveTimerSession(this.session);
    this.stopTickLoop();
    this.releaseWakeLock();
    this.emitTick();
  }

  async resume() {
    if (this.session.status !== 'paused') return;
    return this.start(this.session.projectId, this.session.activityTitle);
  }

  async stop(): Promise<{
    durationMs: number;
    startedAt: number;
    endedAt: number;
    projectId: string | null;
    activityTitle: string;
  }> {
    const elapsed = this.getElapsedMs();
    const now = Date.now();
    const startedAt = now - elapsed;

    const result = {
      durationMs: elapsed,
      startedAt,
      endedAt: now,
      projectId: this.session.projectId,
      activityTitle: this.session.activityTitle
    };

    this.session = {
      status: 'idle',
      startTime: null,
      accumulatedMs: 0,
      projectId: null,
      activityTitle: '',
      lastAlertMinutesTriggered: 0
    };

    if (this.settings.soundEnabled) soundNotifier.playTap();
    if (this.settings.vibrationEnabled) soundNotifier.vibrate(80);

    await db.saveTimerSession(this.session);
    this.stopTickLoop();
    this.releaseWakeLock();
    this.emitTick();

    return result;
  }

  async reset() {
    this.session = {
      status: 'idle',
      startTime: null,
      accumulatedMs: 0,
      projectId: null,
      activityTitle: '',
      lastAlertMinutesTriggered: 0
    };
    await db.saveTimerSession(this.session);
    this.stopTickLoop();
    this.releaseWakeLock();
    this.emitTick();
  }

  private checkAlertThreshold(elapsedMs: number) {
    if (this.session.status !== 'running') return;
    const intervalMinutes = this.settings.alertIntervalMinutes;
    if (!intervalMinutes || intervalMinutes <= 0) return;

    const currentMinutes = Math.floor(elapsedMs / (1000 * 60));
    // Check if we crossed a new multiple of intervalMinutes (e.g. 60, 120, 180)
    if (currentMinutes > 0 && currentMinutes % intervalMinutes === 0) {
      if (currentMinutes !== this.session.lastAlertMinutesTriggered) {
        this.session.lastAlertMinutesTriggered = currentMinutes;
        db.saveTimerSession(this.session).catch(() => {});
        this.triggerAlert(currentMinutes);
      }
    }
  }

  private triggerAlert(minutesRunning: number) {
    if (this.settings.soundEnabled) {
      soundNotifier.playAlert();
    }
    if (this.settings.vibrationEnabled) {
      soundNotifier.vibrate([150, 100, 150, 100, 250]);
    }

    // Web Notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const timeStr = formatDurationHuman(minutesRunning * 60 * 1000);
      try {
        new Notification('Chrono: Temporizador activo', {
          body: `Lleva ${timeStr} corriendo continuo. ¿Sigues trabajando?`,
          icon: './icons/icon-192.svg',
          tag: 'chrono-timer-running',
          requireInteraction: false
        });
      } catch {
        // Notification failed or blocked
      }
    }
  }
}

export const timerEngine = new TimerEngine();
