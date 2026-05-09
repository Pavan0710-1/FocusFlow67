import { AppState, fmtDateFull, fmtDate, fmtTime, timeAgo, levelFromXp, xpIntoLevel, levelTitle, XP_PER_LEVEL, awardTaskXp, XP_PER_TASK } from '../store';

interface DashboardProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onNavigate: (screen: 'notes') => void;
  onToast: (msg: string) => void;
}

function priorityBadge(priority: string) {
  const map: Record<string, { bg: string; color: string }> = {
    High:   { bg: 'rgba(248,113,113,0.2)', color: 'var(--danger)' },
    Medium: { bg: 'rgba(251,191,36,0.2)',  color: 'var(--warn)' },
    Low:    { bg: 'rgba(74,222,128,0.2)',  color: 'var(--success)' },
  };
  const s = map[priority] || map.Medium;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', background: s.bg, color: s.color }}>
      {priority}
    </span>
  );
}

export function Dashboard({ state, onStateChange, onNavigate, onToast }: DashboardProps) {
  const active   = state.tasks.filter(t => !t.completed).length;
  const done     = state.tasks.filter(t => t.completed).length;
  const evCount  = state.events.length;

  const level    = levelFromXp(state.xp);
  const xpIn     = xpIntoLevel(state.xp);
  const xpPct    = (xpIn / XP_PER_LEVEL) * 100;
  const title    = levelTitle(level);
  const streak   = state.streak ?? 0;
  const total    = state.totalTasksCompleted ?? 0;

  const showTasks      = state.tasks.filter(t => !t.completed).slice(0, 5);
  const upcomingEvents = [...state.events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const recentNotes    = [...state.notes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 3);

  function completeTask(id: string) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    if (task.completed) {
      onStateChange({ ...state, tasks: state.tasks.map(t => t.id === id ? { ...t, completed: false } : t) });
      return;
    }
    const updatedTasks = state.tasks.map(t => t.id === id ? { ...t, completed: true } : t);
    const rewarded = awardTaskXp({ ...state, tasks: updatedTasks }, task);
    const xpGain = XP_PER_TASK[task.priority] ?? 10;
    const leveledUp = rewarded.level > state.level;
    onStateChange(rewarded);
    if (leveledUp) {
      onToast(`🎉 Level up! You're now Level ${rewarded.level}!`);
    } else {
      onToast(`+${xpGain} XP! 🔥 ${rewarded.streak} day streak`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>{fmtDateFull(new Date())}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>Dashboard</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px' }}>

        {/* ── Gamification card ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,111,247,0.15) 0%, rgba(168,156,247,0.08) 100%)',
          border: '1px solid rgba(124,111,247,0.35)',
          borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: '20px',
        }}>
          {/* Top row: level badge + streak + total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            {/* Level badge */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#fff', lineHeight: 1 }}>{level}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>LVL</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--text)' }}>{title}</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{state.xp} XP total</span>
              </div>
              {/* XP bar */}
              <div style={{ height: '6px', background: 'var(--surface3)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  borderRadius: '100px',
                  transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                {xpIn} / {XP_PER_LEVEL} XP to Level {level + 1}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {[
              { icon: '🔥', num: streak, label: streak === 1 ? 'day streak' : 'day streak', highlight: streak >= 3 },
              { icon: '✅', num: total,  label: 'completed',   highlight: false },
              { icon: '⚡', num: state.xp, label: 'total XP',  highlight: false },
            ].map(s => (
              <div key={s.label} style={{
                background: s.highlight ? 'rgba(124,111,247,0.15)' : 'var(--surface)',
                border: `1px solid ${s.highlight ? 'rgba(124,111,247,0.4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: s.highlight ? 'var(--accent2)' : 'var(--text)' }}>{s.num}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[{ num: active, label: 'Active Tasks' }, { num: done, label: 'Completed' }, { num: evCount, label: 'Events' }].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent2)' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Today's Tasks */}
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>Today's Tasks</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 16px', marginBottom: '20px' }}>
          {showTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: '14px' }}>No tasks yet — use Brain Dump to add some!</div>
          ) : showTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => completeTask(t.id)}
                style={{
                  width: '22px', height: '22px',
                  border: `2px solid ${t.completed ? 'var(--success)' : 'var(--surface3)'}`,
                  borderRadius: '6px', flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.completed ? 'var(--success)' : 'transparent', transition: 'all 0.2s',
                }}
              >
                {t.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="var(--bg)" style={{ width: 12, height: 12 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', lineHeight: 1.4, textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text3)' : 'var(--text)' }}>{t.text}</div>
                {t.dueDate && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{fmtDate(t.dueDate)}</div>}
              </div>
              {priorityBadge(t.priority)}
            </div>
          ))}
        </div>

        {/* Upcoming Events */}
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>Upcoming Events</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 16px', marginBottom: '20px' }}>
          {upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: '14px' }}>No upcoming events</div>
          ) : upcomingEvents.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--accent2)', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--text3)', width: '56px', flexShrink: 0 }}>{e.time ? fmtTime(e.time) : e.date || '—'}</div>
              <div style={{ fontSize: '14px' }}>{e.title}</div>
            </div>
          ))}
        </div>

        {/* Recent Notes */}
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Notes</div>
        {recentNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: '14px' }}>No notes yet</div>
        ) : recentNotes.map(n => (
          <div key={n.id} onClick={() => onNavigate('notes')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{n.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>{n.updatedAt ? timeAgo(new Date(n.updatedAt).getTime()) : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
