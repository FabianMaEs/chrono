import { Project, Activity, UserSettings, TimerSession } from './types';

const DB_NAME = 'chrono_db';
const DB_VERSION = 1;

const DEFAULT_SETTINGS: UserSettings = {
  alertIntervalMinutes: 60,
  soundEnabled: true,
  vibrationEnabled: true,
  currencySymbol: '$'
};

const DEFAULT_TIMER_SESSION: TimerSession = {
  status: 'idle',
  startTime: null,
  accumulatedMs: 0,
  projectId: null,
  activityTitle: '',
  lastAlertMinutesTriggered: 0
};

class ChronoDB {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('activities')) {
          const actStore = db.createObjectStore('activities', { keyPath: 'id' });
          actStore.createIndex('projectId', 'projectId', { unique: false });
          actStore.createIndex('startedAt', 'startedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    const store = await this.getStore('projects', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result as Project[]) || [];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<Project | null> {
    const store = await this.getStore('projects', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve((request.result as Project) || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(project: Project): Promise<void> {
    const store = await this.getStore('projects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const store = await this.getStore('projects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Activities ---
  async getActivities(): Promise<Activity[]> {
    const store = await this.getStore('activities', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result as Activity[]) || [];
        list.sort((a, b) => b.startedAt - a.startedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getActivitiesByProject(projectId: string): Promise<Activity[]> {
    const store = await this.getStore('activities', 'readonly');
    return new Promise((resolve, reject) => {
      const index = store.index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => {
        const list = (request.result as Activity[]) || [];
        list.sort((a, b) => b.startedAt - a.startedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveActivity(activity: Activity): Promise<void> {
    const store = await this.getStore('activities', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(activity);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteActivity(id: string): Promise<void> {
    const store = await this.getStore('activities', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- KV Store (Settings & Timer Session) ---
  private async getKV<T>(key: string, defaultValue: T): Promise<T> {
    const store = await this.getStore('kv', 'readonly');
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  private async setKV<T>(key: string, value: T): Promise<void> {
    const store = await this.getStore('kv', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings(): Promise<UserSettings> {
    return this.getKV<UserSettings>('settings', DEFAULT_SETTINGS);
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    return this.setKV('settings', settings);
  }

  async getTimerSession(): Promise<TimerSession> {
    return this.getKV<TimerSession>('timer_session', DEFAULT_TIMER_SESSION);
  }

  async saveTimerSession(session: TimerSession): Promise<void> {
    return this.setKV('timer_session', session);
  }

  // --- Backup & Restore ---
  async exportBackup(): Promise<string> {
    const projects = await this.getProjects();
    const activities = await this.getActivities();
    const settings = await this.getSettings();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      activities,
      settings
    };
    return JSON.stringify(payload, null, 2);
  }

  async importBackup(jsonString: string): Promise<{ projectsCount: number; activitiesCount: number }> {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.activities)) {
      throw new Error('Estructura de archivo de respaldo no válida');
    }

    const pStore = await this.getStore('projects', 'readwrite');
    for (const p of data.projects) {
      pStore.put(p);
    }

    const aStore = await this.getStore('activities', 'readwrite');
    for (const a of data.activities) {
      aStore.put(a);
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }

    return {
      projectsCount: data.projects.length,
      activitiesCount: data.activities.length
    };
  }
}

export const db = new ChronoDB();
