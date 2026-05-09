import { useState } from 'react';
import { AppState, genId, aiParseDump, fmtDateFull, timeAgo, Task, CalEvent, Note, ParsedDump } from '../store';

interface HomeProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onNavigate: (screen: 'dashboard') => void;
  onToast: (msg: string) => void;
}

function PriBadge({ priority }: { priority?: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    High: { bg: 'rgba(248,113,113,0.2)', color: 'var(--danger)' },
    Medium: { bg: 'rgba(251,191,36,0.2)', color: 'var(--warn)' },
    Low: { bg: 'rgba(74,222,128,0.2)', color: 'var(--success)' },
  };
  const s = map[priority ?? 'Medium'] ?? map.Medium;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color }}>
      {priority ?? 'Medium'}
    </span>
  );
}

export function Home({ state, onStateChange, onNavigate, onToast }: HomeProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [parsed, setParsed] = useState<ParsedDump | null>(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setParsed(null);
    setLoadingMsg('AI is analysing your thoughts...');

    // Save the raw dump immediately
    const newState: AppState = {
      ...state,
      brainDumps: [{ id: genId(), text: trimmed, ts: Date.now() }, ...state.brainDumps],
    };
    onStateChange(newState);

    try {
      const result = await aiParseDump(trimmed);
      setParsed(result);
      if (!result.aiPowered) {
        setLoadingMsg('');
        onToast('📴 AI offline — used smart local parser');
      }
    } catch {
      onToast('⚠️ Could not parse — try again');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  function handleSave() {
    if (!parsed) return;
    const ts = new Date().toISOString();
    const ns: AppState = { ...state };

    for (const t of parsed.tasks ?? []) {
      ns.tasks = [
        ...ns.tasks,
        {
          id: genId(),
          text: (t.text ?? '').trim().slice(0, 200) || 'Task',
          priority: (t.priority as Task['priority']) ?? 'Medium',
          dueDate: t.dueDate ?? '',
          notes: t.notes ?? '',
          completed: false,
          createdAt: ts,
        },
      ];
    }
    for (const e of parsed.events ?? []) {
      ns.events = [
        ...ns.events,
        {
          id: genId(),
          title: (e.title ?? '').trim().slice(0, 200) || 'Event',
          date: e.date ?? '',
          time: e.time ?? '',
          description: e.description ?? '',
          createdAt: ts,
        },
      ];
    }
    for (const n of parsed.notes ?? []) {
      ns.notes = [
        ...ns.notes,
        {
          id: genId(),
          title: (n.title ?? '').trim().slice(0, 200) || 'Note',
          content: n.content ?? '',
          createdAt: ts,
          updatedAt: ts,
        },
      ];
    }

    onStateChange(ns);
    setText('');
    setParsed(null);
    onToast('✅ Saved! Check your Dashboard');
    onNavigate('dashboard');
  }

  function handleDiscard() {
    setParsed(null);
    setText('');
  }

  const totalItems = (parsed?.tasks?.length ?? 0) + (parsed?.events?.length ?? 0) + (parsed?.notes?.length ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{
        padding: '56px 24px 0',
        background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(124,111,247,0.12) 0%, transparent 70%)',
      }}>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>{fmtDateFull(now)}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', lineHeight: 1.2, marginBottom: '4px' }}>
          {greeting}, {state.user.name.split(' ')[0]}
        </h1>
      </div>

      {/* Brain dump area */}
      <div style={{ margin: '28px 24px 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 40px rgba(124,111,247,0.1)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's on your mind? Dump it all here — tasks, meetings, ideas, anything. AI will sort it."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderRadius: 0, padding: '20px 20px 0', fontSize: '16px',
            minHeight: '120px', resize: 'none', color: 'var(--text)',
            fontFamily: 'var(--font-body)', lineHeight: 1.6, outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
          disabled={loading}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
            {loading ? 'Processing...' : '⌘↵ to send'}
          </span>
          <button
            onClick={handleSend}
            disabled={!text.trim() || loading}
            style={{
              width: '40px', height: '40px',
              background: (text.trim() && !loading) ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--surface3)',
              borderRadius: '12px', border: 'none',
              cursor: (text.trim() && !loading) ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'all 0.2s',
              boxShadow: (text.trim() && !loading) ? '0 4px 14px var(--accent-glow)' : 'none',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading
              ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
            }
          </button>
        </div>
      </div>

      {/* AI loading indicator */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          margin: '16px 24px', padding: '14px 18px',
          background: 'var(--surface)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)', color: 'var(--accent2)', fontSize: '14px',
          boxShadow: '0 0 20px var(--accent-glow)',
        }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid rgba(124,111,247,0.3)', borderTopColor: 'var(--accent2)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          {loadingMsg || 'AI is analysing your thoughts...'}
        </div>
      )}

      {/* AI results */}
      {parsed && totalItems > 0 && (
        <div style={{ margin: '16px 24px', background: 'var(--surface)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 'var(--radius)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)', letterSpacing: '0.5px' }}>
              {parsed.aiPowered ? '✨ AI PARSED' : '📴 OFFLINE PARSE'} — {totalItems} ITEM{totalItems !== 1 ? 'S' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(parsed.tasks ?? []).map((t, i) => (
              <div key={`t${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--surface2)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>✅</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{t.text}</span>
                  {t.dueDate && <span style={{ color: 'var(--text3)', marginLeft: '6px', fontSize: '12px' }}>· {t.dueDate}</span>}
                  {t.notes && <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '2px' }}>{t.notes}</div>}
                </div>
                <PriBadge priority={t.priority} />
              </div>
            ))}
            {(parsed.events ?? []).map((e, i) => (
              <div key={`e${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--surface2)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>📅</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{e.title}</span>
                  {(e.date || e.time) && (
                    <span style={{ color: 'var(--text3)', marginLeft: '6px', fontSize: '12px' }}>
                      · {e.date}{e.time ? ` ${e.time}` : ''}
                    </span>
                  )}
                  {e.description && <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '2px' }}>{e.description}</div>}
                </div>
              </div>
            ))}
            {(parsed.notes ?? []).map((n, i) => (
              <div key={`n${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--surface2)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>📝</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{n.title}</span>
                  {n.content && n.content !== n.title && <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '2px' }}>{(n.content ?? '').slice(0, 100)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleSave}
              style={{ flex: 1, padding: '13px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-glow)' }}
            >
              Save All
            </button>
            <button
              onClick={handleDiscard}
              style={{ flex: 1, padding: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Recent dumps */}
      {state.brainDumps.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Dumps</div>
          {state.brainDumps.slice(0, 3).map(d => (
            <div key={d.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.5 }}>{d.text.slice(0, 140)}{d.text.length > 140 ? '…' : ''}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{timeAgo(d.ts)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ paddingBottom: '120px' }} />
    </div>
  );
}
