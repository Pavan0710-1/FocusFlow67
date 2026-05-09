import { useState, useRef } from 'react';
import { AppState, Task, genId, fmtDate, awardTaskXp, XP_PER_TASK } from '../store';
import { Modal } from '../components/Modal';

type Filter = 'All' | 'High' | 'Medium' | 'Low' | 'Done';

interface TasksProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onToast: (msg: string) => void;
}

function PriorityBadge({ priority }: { priority: string }) {
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

interface SwipeCardProps {
  task: Task;
  simple: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeCard({ task, simple, onComplete, onEdit, onDelete }: SwipeCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startX   = useRef(0);
  const startY   = useRef(0);
  const swiping  = useRef(false);
  const committed = useRef(false);

  const THRESHOLD = 72;
  const MAX_DRAG  = 110;

  function onTouchStart(e: React.TouchEvent) {
    startX.current  = e.touches[0].clientX;
    startY.current  = e.touches[0].clientY;
    swiping.current  = false;
    committed.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (!swiping.current && dy > 12) return;
    if (dx > 8) swiping.current = true;
    if (!swiping.current) return;
    const clamped = Math.min(Math.max(dx, 0), MAX_DRAG);
    setOffsetX(clamped);
    if (clamped >= THRESHOLD) committed.current = true;
  }

  function onTouchEnd() {
    if (committed.current) {
      onComplete();
    }
    setOffsetX(0);
    swiping.current  = false;
    committed.current = false;
  }

  const progress   = Math.min(offsetX / THRESHOLD, 1);
  const showReveal = offsetX > 8;

  return (
    <div style={{ position: 'relative', marginBottom: '10px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Green reveal layer */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(74,222,128,${0.12 + progress * 0.18})`,
        border: `1px solid rgba(74,222,128,${0.3 + progress * 0.4})`,
        borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'center', paddingLeft: '20px',
        opacity: showReveal ? 1 : 0,
        transition: 'opacity 0.1s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#4ade80" style={{ width: 20, height: 20 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {progress >= 1 && (
            <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600 }}>Done!</span>
          )}
        </div>
      </div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: simple ? '13px 16px' : '14px 16px',
          transform: `translateX(${offsetX}px)`,
          transition: offsetX === 0 ? 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
          willChange: 'transform',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Checkbox */}
          <button
            onClick={onComplete}
            style={{
              width: '22px', height: '22px', marginTop: '2px',
              border: `2px solid ${task.completed ? 'var(--success)' : 'var(--surface3)'}`,
              borderRadius: '6px', flexShrink: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: task.completed ? 'var(--success)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {task.completed && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="var(--bg)" style={{ width: 12, height: 12 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', lineHeight: 1.4, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text3)' : 'var(--text)' }}>
              {task.text}
            </div>
            {!simple && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                <PriorityBadge priority={task.priority} />
                {task.dueDate && <span style={{ fontSize: '12px', color: 'var(--text3)' }}>📅 {fmtDate(task.dueDate)}</span>}
              </div>
            )}
            {!simple && task.notes && (
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '8px' }}>{task.notes}</div>
            )}
            {simple && (
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                {task.priority}{task.dueDate ? ` · ${fmtDate(task.dueDate)}` : ''}
              </div>
            )}
          </div>

          {!simple && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button onClick={onEdit} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✏️</button>
              <button onClick={onDelete} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>🗑</button>
            </div>
          )}
          {simple && (
            <button onClick={onEdit} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>✏️</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tasks({ state, onStateChange, onToast }: TasksProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ text: '', priority: 'Medium', dueDate: '', notes: '' });

  const simple = state.settings.viewMode === 'simple';
  const filters: Filter[] = ['All', 'High', 'Medium', 'Low', 'Done'];

  let tasks = state.tasks;
  if (filter === 'Done')      tasks = tasks.filter(t => t.completed);
  else if (filter === 'All')  tasks = tasks.filter(t => !t.completed);
  else                         tasks = tasks.filter(t => t.priority === filter && !t.completed);

  function openAdd() {
    setEditId('');
    setForm({ text: '', priority: 'Medium', dueDate: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(t: Task) {
    setEditId(t.id);
    setForm({ text: t.text, priority: t.priority, dueDate: t.dueDate, notes: t.notes });
    setModalOpen(true);
  }

  function saveTask() {
    if (!form.text.trim()) { onToast('Enter a task description'); return; }
    const now = new Date().toISOString();
    let newTasks;
    if (editId) {
      newTasks = state.tasks.map(t => t.id === editId ? { ...t, ...form, priority: form.priority as Task['priority'] } : t);
      onStateChange({ ...state, tasks: newTasks });
      onToast('Task updated');
    } else {
      newTasks = [...state.tasks, { id: genId(), ...form, priority: form.priority as Task['priority'], completed: false, createdAt: now }];
      onStateChange({ ...state, tasks: newTasks });
      onToast('Task added!');
    }
    setModalOpen(false);
  }

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

  function deleteTask(id: string) {
    onStateChange({ ...state, tasks: state.tasks.filter(t => t.id !== id) });
    onToast('Task deleted');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>Tasks</h1>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px' }}>
          {state.tasks.filter(t => !t.completed).length} active
          {!simple && <span style={{ color: 'var(--text3)' }}> · swipe right to complete</span>}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '2px' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: '100px',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f ? 'var(--accent)' : 'var(--surface2)',
                color: filter === f ? '#fff' : 'var(--text2)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0,
                fontFamily: 'var(--font-body)',
              }}
            >{f}</button>
          ))}
        </div>

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <p>No tasks here.<br />Tap + to add one.</p>
          </div>
        ) : tasks.map(t => (
          <SwipeCard
            key={t.id}
            task={t}
            simple={simple}
            onComplete={() => completeTask(t.id)}
            onEdit={() => openEdit(t)}
            onDelete={() => deleteTask(t.id)}
          />
        ))}
      </div>

      <button
        onClick={openAdd}
        aria-label="Add new task"
        style={{
          position: 'fixed', bottom: '116px', left: '50%', transform: 'translateX(-50%)',
          height: '48px', paddingLeft: '24px', paddingRight: '24px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          borderRadius: '100px', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 24px var(--accent-glow)', zIndex: 50, whiteSpace: 'nowrap',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: 16, height: 16 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Task
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Task' : 'New Task'}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Task</label>
          <textarea
            value={form.text}
            onChange={e => setForm({ ...form, text: e.target.value })}
            placeholder="What needs to be done?"
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', resize: 'none', minHeight: '80px', lineHeight: 1.6 }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Priority</label>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', appearance: 'none' }}>
            <option value="High">High (+15 XP)</option>
            <option value="Medium">Medium (+10 XP)</option>
            <option value="Low">Low (+5 XP)</option>
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Due Date</label>
          <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', colorScheme: 'dark' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', resize: 'none', minHeight: '80px', lineHeight: 1.6 }} />
        </div>
        <button onClick={saveTask} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px var(--accent-glow)' }}>
          {editId ? 'Update Task' : 'Add Task'}
        </button>
      </Modal>
    </div>
  );
}
