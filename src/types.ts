export interface Project {
  id: string;
  name: string;
  description: string;
  cost: number;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  id: string;
  projectId: string;
  title: string;
  durationMs: number;
  startedAt: number;
  endedAt: number;
  createdAt: number;
}

export interface TimerSession {
  status: 'idle' | 'running' | 'paused';
  startTime: number | null;
  accumulatedMs: number;
  projectId: string | null;
  activityTitle: string;
  lastAlertMinutesTriggered: number;
}

export interface UserSettings {
  alertIntervalMinutes: number; // 0 = disabled, e.g. 30, 60, 90, 120
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  currencySymbol: string;
}

export interface ProjectStats {
  totalDurationMs: number;
  totalHours: number;
  effectiveRatePerHour: number;
  activitiesCount: number;
}

export interface ActivityWithEarning extends Activity {
  projectName: string;
  earnedAmount: number;
  effectiveRatePerHour: number;
}
