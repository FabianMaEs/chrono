import { Project, Activity, ProjectStats, ActivityWithEarning } from './types';

export function formatTimeDigits(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationHuman(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const formatted = amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

export function calculateProjectStats(project: Project, activities: Activity[]): ProjectStats {
  const projectActivities = activities.filter((a) => a.projectId === project.id);
  const totalDurationMs = projectActivities.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
  const totalHours = totalDurationMs / (1000 * 60 * 60);
  const effectiveRatePerHour = totalHours > 0 ? project.cost / totalHours : 0;

  return {
    totalDurationMs,
    totalHours,
    effectiveRatePerHour,
    activitiesCount: projectActivities.length
  };
}

export function enrichActivitiesWithEarnings(
  activities: Activity[],
  projects: Project[]
): ActivityWithEarning[] {
  const projectMap = new Map<string, { project: Project; effectiveRate: number }>();

  for (const project of projects) {
    const stats = calculateProjectStats(project, activities);
    projectMap.set(project.id, {
      project,
      effectiveRate: stats.effectiveRatePerHour
    });
  }

  return activities.map((activity) => {
    const data = projectMap.get(activity.projectId);
    const projectName = data ? data.project.name : 'Sin asignar';
    const effectiveRatePerHour = data ? data.effectiveRate : 0;
    const hours = (activity.durationMs || 0) / (1000 * 60 * 60);
    const earnedAmount = hours * effectiveRatePerHour;

    return {
      ...activity,
      projectName,
      earnedAmount,
      effectiveRatePerHour
    };
  });
}

export function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTimeOfDay(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
