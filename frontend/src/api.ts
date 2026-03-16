const API_BASE = import.meta.env.DEV ? '' : '';

export interface Task {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Activity {
  id: number;
  task_id: number;
  task_name: string;
  task_color: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  logged_at: string;
  no_time_assigned: boolean;
  display_time: string | null;
}

export interface RunningActivity {
  id: number;
  task_id: number;
  task_name: string;
  task_color: string;
  start_time: string;
}

export interface Settings {
  hotkey: string;
  run_at_startup: boolean;
}

export interface StatsByTask {
  task_id: number;
  task_name: string;
  task_color: string;
  total_hours: number;
}

export interface StatsTimeSeriesPoint {
  date: string;
  task_id: number;
  task_name: string;
  task_color: string;
  hours: number;
}

export const api = {
  async getTasks(): Promise<Task[]> {
    const r = await fetch(`${API_BASE}/api/tasks`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async createTask(name: string): Promise<Task> {
    const r = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async deleteTask(id: number): Promise<void> {
    const r = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
  },
  async getRunning(): Promise<RunningActivity | null> {
    const r = await fetch(`${API_BASE}/api/activities/running`);
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return data;
  },
  async getActivities(params?: {
    day?: string;
    from_date?: string;
    to_date?: string;
    from_datetime?: string;
    to_datetime?: string;
  }): Promise<Activity[]> {
    const sp = new URLSearchParams();
    if (params?.day) sp.set('day', params.day);
    if (params?.from_date) sp.set('from_date', params.from_date);
    if (params?.to_date) sp.set('to_date', params.to_date);
    if (params?.from_datetime) sp.set('from_datetime', params.from_datetime);
    if (params?.to_datetime) sp.set('to_datetime', params.to_datetime);
    const q = sp.toString();
    const r = await fetch(`${API_BASE}/api/activities${q ? `?${q}` : ''}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getActivityDays(year: number, month: number): Promise<string[]> {
    const r = await fetch(`${API_BASE}/api/activities/days?year=${year}&month=${month}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getStats(from_date?: string, to_date?: string): Promise<StatsByTask[]> {
    const sp = new URLSearchParams();
    if (from_date) sp.set('from_date', from_date);
    if (to_date) sp.set('to_date', to_date);
    const r = await fetch(`${API_BASE}/api/activities/stats${sp.toString() ? `?${sp}` : ''}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getStatsTimeSeries(from_date?: string, to_date?: string): Promise<StatsTimeSeriesPoint[]> {
    const sp = new URLSearchParams();
    if (from_date) sp.set('from_date', from_date);
    if (to_date) sp.set('to_date', to_date);
    const r = await fetch(`${API_BASE}/api/activities/stats/time_series${sp.toString() ? `?${sp}` : ''}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async downloadLog(from_date?: string, to_date?: string): Promise<void> {
    const sp = new URLSearchParams();
    if (from_date) sp.set('from_date', from_date);
    if (to_date) sp.set('to_date', to_date);
    const url = `${API_BASE}/api/activities/export${sp.toString() ? `?${sp}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const now = new Date();
    const suffix = now.toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `task-log-${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  },
  async startStopwatch(taskId: number): Promise<Activity> {
    const r = await fetch(`${API_BASE}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async stopActivity(activityId: number): Promise<Activity> {
    const r = await fetch(`${API_BASE}/api/activities/${activityId}`, {
      method: 'PATCH',
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async deleteActivity(activityId: number): Promise<void> {
    const r = await fetch(`${API_BASE}/api/activities/${activityId}`, {
      method: 'DELETE',
    });
    if (!r.ok) throw new Error(await r.text());
  },
  async logManual(body: {
    task_id: number;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    logged_at?: string;
  }): Promise<Activity> {
    const r = await fetch(`${API_BASE}/api/activities/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getSettings(): Promise<Settings> {
    const r = await fetch(`${API_BASE}/api/settings`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const r = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};
