import { useState } from 'react';
import { AppState, CalEvent, genId, fmtDate, fmtTime } from '../store';
import { Modal } from '../components/Modal';

interface CalendarProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onToast: (msg: string) => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function Calendar({ state, onStateChange, onToast }: CalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ title: '', date: '', time: '', description: '' });

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();

  const prevDays: number[] = [];
  for (let i = 0; i < startDay; i++) {
    prevDays.push(new Date(year, month, -startDay + i + 1).getDate());
  }

  function changeMonth(dir: number) {
    let m = month + dir;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m);
    setYear(y);
    setSelectedDate(null);
  }

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function openAdd() {
    setEditId('');
    setForm({ title: '', date: selectedDate || '', time: '', description: '' });
    setModalOpen(true);
  }

  function saveEvent() {
    if (!form.title.trim()) { onToast('Enter an event title'); return; }
    const now = new Date().toISOString();
    let newEvents;
    if (editId) {
      newEvents = state.events.map(e => e.id === editId ? { ...e, ...form } : e);
      onToast('Event updated!');
    } else {
      newEvents = [...state.events, { id: genId(), ...form, createdAt: now }];
      onToast('Event saved!');
    }
    onStateChange({ ...state, events: newEvents });
    setModalOpen(false);
  }

  function deleteEvent(id: string) {
    onStateChange({ ...state, events: state.events.filter(e => e.id !== id) });
    onToast('Event deleted');
  }

  const moStr = String(month + 1).padStart(2, '0');
  const displayEvents = selectedDate
    ? state.events.filter(e => e.date === selectedDate)
    : state.events.filter(e => e.date && e.date.startsWith(`${year}-${moStr}`));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>Calendar</h1>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px' }}>{state.events.length} events</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>{MONTHS[month]} {year}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => changeMonth(-1)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontSize: '18px' }}>‹</button>
            <button onClick={() => changeMonth(1)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontSize: '18px' }}>›</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '24px' }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', padding: '6px 0', fontWeight: 600 }}>{d}</div>
          ))}
          {prevDays.map((d, i) => (
            <div key={`prev-${i}`} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', borderRadius: '10px', color: 'var(--text3)', opacity: 0.4 }}>{d}</div>
          ))}
          {Array.from({ length: last.getDate() }, (_, i) => i + 1).map(d => {
            const ds = dateStr(d);
            const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            const hasEvent = state.events.some(e => e.date === ds);
            const isSelected = selectedDate === ds;
            return (
              <div
                key={d}
                onClick={() => setSelectedDate(isSelected ? null : ds)}
                style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', borderRadius: '10px', cursor: 'pointer', position: 'relative',
                  color: isToday ? '#fff' : isSelected ? 'var(--accent2)' : 'var(--text2)',
                  background: isToday ? 'var(--accent)' : isSelected ? 'rgba(124,111,247,0.18)' : 'transparent',
                  boxShadow: isToday ? '0 4px 12px var(--accent-glow)' : 'none',
                  border: isSelected && !isToday ? '1px solid var(--accent)' : 'none',
                }}
              >
                {d}
                {hasEvent && (
                  <div style={{
                    position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)',
                    width: '4px', height: '4px',
                    background: isToday ? 'rgba(255,255,255,0.7)' : 'var(--accent2)',
                    borderRadius: '50%',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase' }}>
            {selectedDate ? `Events on ${fmtDate(selectedDate)}` : 'Events this month'}
          </div>
          <button
            onClick={openAdd}
            aria-label="Add new event"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '100px', border: 'none',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Event
          </button>
        </div>

        {displayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
            <p>No events for this period</p>
          </div>
        ) : displayEvents.map(e => (
          <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{e.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{e.date ? fmtDate(e.date) : ''}{e.time ? ` · ${fmtTime(e.time)}` : ''}</div>
                {e.description && <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '6px' }}>{e.description}</div>}
              </div>
              <button onClick={() => deleteEvent(e.id)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Event">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Event Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What's happening?" style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', colorScheme: 'dark' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Time</label>
          <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', colorScheme: 'dark' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', resize: 'none', minHeight: '80px', lineHeight: 1.6 }} />
        </div>
        <button onClick={saveEvent} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          Save Event
        </button>
      </Modal>
    </div>
  );
}
