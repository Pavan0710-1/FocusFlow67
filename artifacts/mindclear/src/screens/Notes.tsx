import { useState } from 'react';
import { AppState, Note, genId, timeAgo } from '../store';
import { Modal } from '../components/Modal';

interface NotesProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onToast: (msg: string) => void;
}

export function Notes({ state, onStateChange, onToast }: NotesProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ title: '', content: '' });

  const filtered = [...state.notes]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

  function openAdd() {
    setEditId('');
    setForm({ title: '', content: '' });
    setModalOpen(true);
  }

  function openEdit(n: Note) {
    setEditId(n.id);
    setForm({ title: n.title, content: n.content });
    setModalOpen(true);
  }

  function saveNote() {
    if (!form.title.trim()) { onToast('Enter a title'); return; }
    const now = new Date().toISOString();
    let newNotes;
    if (editId) {
      newNotes = state.notes.map(n => n.id === editId ? { ...n, ...form, updatedAt: now } : n);
      onToast('Note updated');
    } else {
      newNotes = [...state.notes, { id: genId(), ...form, createdAt: now, updatedAt: now }];
      onToast('Note saved!');
    }
    onStateChange({ ...state, notes: newNotes });
    setModalOpen(false);
  }

  function deleteNote(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onStateChange({ ...state, notes: state.notes.filter(n => n.id !== id) });
    onToast('Note deleted');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>Notes</h1>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px' }}>{state.notes.length} notes</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px' }}>
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: '15px', padding: '14px 16px 14px 42px', outline: 'none',
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)', fontSize: '14px', lineHeight: 1.7 }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <p>No notes yet.<br />Tap + to create one.</p>
          </div>
        ) : filtered.map(n => (
          <div
            key={n.id}
            onClick={() => openEdit(n)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.2s' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{n.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>{n.updatedAt ? timeAgo(new Date(n.updatedAt).getTime()) : ''}</div>
              </div>
              <button
                onClick={e => deleteNote(n.id, e)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', flexShrink: 0, marginLeft: '10px' }}
              >🗑</button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={openAdd}
        aria-label="Add new note"
        style={{
          position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)',
          height: '46px', paddingLeft: '22px', paddingRight: '22px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          borderRadius: '100px', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 20px var(--accent-glow)', zIndex: 50,
          whiteSpace: 'nowrap',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: 16, height: 16 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Note
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Note' : 'New Note'}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Note title" style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>Content</label>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your note..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '15px', padding: '14px 16px', outline: 'none', resize: 'none', minHeight: '180px', lineHeight: 1.6 }} />
        </div>
        <button onClick={saveNote} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          {editId ? 'Update Note' : 'Save Note'}
        </button>
      </Modal>
    </div>
  );
}
