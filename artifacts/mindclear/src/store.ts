export interface Task {
  id: string;
  text: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  notes: string;
  completed: boolean;
  createdAt: string;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainDump {
  id: string;
  text: string;
  ts: number;
}

export interface ParsedDump {
  tasks: Partial<Task>[];
  events: Partial<CalEvent>[];
  notes: Partial<Note>[];
  aiPowered?: boolean;
}

export interface AppState {
  tasks: Task[];
  events: CalEvent[];
  notes: Note[];
  brainDumps: BrainDump[];
  user: { name: string; email: string; initials: string };
  settings: {
    notifications: boolean;
    calendarSync: boolean;
    theme: 'dark' | 'light' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    reduceMotion: boolean;
    highContrast: boolean;
    viewMode: 'simple' | 'detailed';
  };
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  totalTasksCompleted: number;
  loggedIn: boolean;
  hasOnboarded: boolean;
}

// ─── Gamification helpers ────────────────────────────────────────────
export const XP_PER_TASK: Record<string, number> = { High: 15, Medium: 10, Low: 5 };
export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}
export function levelTitle(level: number): string {
  const titles = ['', 'Beginner', 'Apprentice', 'Focused', 'Achiever', 'Performer', 'Expert', 'Master', 'Legend'];
  return titles[Math.min(level, titles.length - 1)] ?? 'Legend';
}

export function awardTaskXp(state: AppState, task: Task): AppState {
  const xpGain = XP_PER_TASK[task.priority] ?? 10;
  const newXp   = state.xp + xpGain;
  const newLevel = levelFromXp(newXp);
  const todayStr_ = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak = state.streak;
  if (state.lastActiveDate === todayStr_) {
    // already active today, streak unchanged
  } else if (state.lastActiveDate === yesterday) {
    newStreak = state.streak + 1;
  } else {
    newStreak = 1;
  }
  return {
    ...state,
    xp: newXp,
    level: newLevel,
    streak: newStreak,
    lastActiveDate: todayStr_,
    totalTasksCompleted: state.totalTasksCompleted + 1,
  };
}

const STORAGE_KEY = 'mindclear_v3';

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_STATE: AppState = {
  tasks: [],
  events: [],
  notes: [],
  brainDumps: [],
  user: { name: 'Guest', email: 'guest@example.com', initials: 'G' },
  settings: {
    notifications: true,
    calendarSync: false,
    theme: 'dark',
    fontSize: 'medium',
    reduceMotion: false,
    highContrast: false,
    viewMode: 'detailed',
  },
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: '',
  totalTasksCompleted: 0,
  loggedIn: false,
  hasOnboarded: false,
};

export function loadState(): AppState {
  try {
    // Try new key first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        user: { ...DEFAULT_STATE.user, ...parsed.user },
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      };
    }
    // Migrate from old key
    const oldRaw = localStorage.getItem('mindclear_v2');
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw) as Partial<AppState>;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        user: { ...DEFAULT_STATE.user, ...(parsed.user ?? {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
        hasOnboarded: false,
      };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function fmtDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

export function fmtDateFull(d: Date): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── AI Parse via backend ───────────────────────────────────────────
export async function aiParseDump(text: string): Promise<ParsedDump> {
  try {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
    const res = await fetch(`${base}/api/ai/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json() as ParsedDump & { offline?: boolean };
    if (data.offline) throw new Error('offline');
    return { ...data, aiPowered: true };
  } catch {
    return offlineParseDump(text);
  }
}

// ─── Offline Fallback Parser ─────────────────────────────────────────
function fixSpelling(text: string): string {
  const corrections: Record<string, string> = {
    'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'tomorow': 'tomorrow',
    'calender': 'calendar', 'recieve': 'receive', 'occured': 'occurred',
    'seperate': 'separate', 'definately': 'definitely', 'accomodate': 'accommodate',
    'adress': 'address', 'untill': 'until', 'occassion': 'occasion',
    'embarass': 'embarrass', 'neccessary': 'necessary', 'metting': 'meeting',
    'meetng': 'meeting', 'appointement': 'appointment', 'urgant': 'urgent',
    'imprtant': 'important', 'remeber': 'remember', 'becuase': 'because',
    'teh': 'the', 'hte': 'the', 'dont': "don't", 'cant': "can't", 'wont': "won't",
  };
  let result = text;
  for (const [typo, fix] of Object.entries(corrections)) {
    result = result.replace(new RegExp(`\\b${typo}\\b`, 'gi'), fix);
  }
  return result;
}

function getRelativeDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes('today')) return todayStr();

  if (lower.includes('tomorrow')) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) {
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const target = dayNames.indexOf(nextDayMatch[1]);
    const d = new Date(today);
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  const inDaysMatch = lower.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    const d = new Date(today); d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d.toISOString().split('T')[0];
  }

  const nextWeekMatch = lower.match(/next\s+week/);
  if (nextWeekMatch) {
    const d = new Date(today); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  for (let i = 0; i < monthNames.length; i++) {
    const re = new RegExp(`${monthNames[i]}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
    const m = lower.match(re);
    if (m) {
      const year = today.getFullYear();
      return `${year}-${String(i+1).padStart(2,'0')}-${String(parseInt(m[1])).padStart(2,'0')}`;
    }
  }

  return '';
}

function extractTime(text: string): string {
  const lower = text.toLowerCase();
  const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (m) {
    let h = parseInt(m[1]);
    const mins = m[2] ? m[2] : '00';
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${mins}`;
  }
  return '';
}

function getPriority(text: string): 'High' | 'Medium' | 'Low' {
  const lower = text.toLowerCase();
  if (/urgent|asap|critical|immediately|high priority|important/.test(lower)) return 'High';
  if (/low priority|whenever|no rush|not urgent|someday/.test(lower)) return 'Low';
  return 'Medium';
}

export function offlineParseDump(rawText: string): ParsedDump {
  const text = fixSpelling(rawText);
  const tasks: Partial<Task>[] = [];
  const events: Partial<CalEvent>[] = [];
  const notes: Partial<Note>[] = [];

  const eventKeywords = /\b(meeting|appointment|call|dinner|lunch|breakfast|conference|interview|flight|trip|event|catch up|catch-up|hangout|date|party|ceremony|seminar|workshop)\b/i;
  const taskKeywords = /\b(todo|to-do|need to|buy|fix|send|write|review|finish|complete|submit|pick up|drop off|pay|book|schedule|call|email|message|remind|check|update|create|make|get|fetch|deliver|order|install|set up|setup|clean|organize|prepare|research|plan|draft|edit|reply|respond)\b/i;
  const noteKeywords = /\b(note|idea|remember|thought|draft|insight|concept|quote|reference|info|summary|observation)\b/i;

  const sentences = text
    .split(/\n|(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  for (const sentence of sentences) {
    const date = getRelativeDate(sentence);
    const time = extractTime(sentence);
    const priority = getPriority(sentence);

    const isEvent = eventKeywords.test(sentence);
    const isNote = noteKeywords.test(sentence) && !taskKeywords.test(sentence);
    const isTask = taskKeywords.test(sentence);

    if (isEvent || (time && !isTask)) {
      events.push({ title: sentence.slice(0, 80), date, time, description: '' });
    } else if (isNote) {
      notes.push({ title: sentence.slice(0, 60), content: sentence });
    } else {
      tasks.push({ text: sentence.slice(0, 100), priority, dueDate: date, notes: '' });
    }
  }

  if (tasks.length === 0 && events.length === 0 && notes.length === 0) {
    tasks.push({ text: text.slice(0, 100), priority: 'Medium', dueDate: '', notes: '' });
  }

  return { tasks, events, notes, aiPowered: false };
}
