import { useState } from 'react';
import { AppState } from '../store';
import { Modal } from '../components/Modal';

interface ProfileProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onToast: (msg: string) => void;
  onLogout: () => void;
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: '46px', height: '26px',
        background: on ? 'var(--accent)' : 'var(--surface3)',
        borderRadius: '100px', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0, border: 'none',
      }}
    >
      <div style={{
        position: 'absolute', width: '20px', height: '20px',
        background: on ? '#fff' : 'var(--text3)',
        borderRadius: '50%', top: '3px',
        left: on ? '23px' : '3px',
        transition: 'left 0.2s, background 0.2s',
      }} />
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 600, letterSpacing: '1.3px',
      color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', marginTop: '28px',
    }}>
      {children}
    </div>
  );
}

function SettingRow({
  label, sub, right, noBorder,
}: { label: string; sub?: string; right: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: noBorder ? 'none' : '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '2px' }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Profile({ state, onStateChange, onToast, onLogout }: ProfileProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: state.user.name, email: state.user.email });

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter(t => t.completed).length;
  const totalNotes = state.notes.length;

  function saveProfile() {
    if (!form.name.trim()) { onToast('Enter your name'); return; }
    const initials = form.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
    onStateChange({ ...state, user: { ...state.user, name: form.name.trim(), email: form.email.trim(), initials } });
    onToast('Profile updated!');
    setModalOpen(false);
  }

  function toggleSetting(key: 'notifications' | 'calendarSync' | 'reduceMotion' | 'highContrast') {
    onStateChange({ ...state, settings: { ...state.settings, [key]: !state.settings[key] } });
  }

  function setTheme(theme: 'dark' | 'light' | 'system') {
    onStateChange({ ...state, settings: { ...state.settings, theme } });
  }

  function setFontSize(fontSize: 'small' | 'medium' | 'large') {
    onStateChange({ ...state, settings: { ...state.settings, fontSize } });
  }

  function setViewMode(viewMode: 'simple' | 'detailed') {
    onStateChange({ ...state, settings: { ...state.settings, viewMode } });
  }

  const themeOptions: { value: 'dark' | 'light' | 'system'; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];

  const fontOptions: { value: 'small' | 'medium' | 'large'; label: string }[] = [
    { value: 'small', label: 'S' },
    { value: 'medium', label: 'M' },
    { value: 'large', label: 'L' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '56px 24px 16px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>
          Profile & Settings
        </h1>
      </div>

      <main id="main-content" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px' }}>

        {/* Avatar & info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px', paddingTop: '8px' }}>
          <div
            aria-hidden="true"
            style={{
              width: '80px', height: '80px', borderRadius: '24px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '28px', color: '#fff',
              marginBottom: '12px', boxShadow: '0 8px 28px var(--accent-glow)',
            }}
          >
            {state.user.initials || '?'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)' }}>{state.user.name}</div>
          <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px', marginBottom: '14px' }}>{state.user.email}</div>
          <button
            onClick={() => { setForm({ name: state.user.name, email: state.user.email }); setModalOpen(true); }}
            aria-label="Edit your profile name and email"
            style={{
              padding: '10px 24px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text2)', fontFamily: 'var(--font-body)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Edit Profile
          </button>
        </div>

        {/* Stats */}
        <SectionLabel>Stats</SectionLabel>
        <div
          role="list"
          aria-label="Your statistics"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '4px' }}
        >
          {[
            { num: totalTasks, label: 'Total Tasks' },
            { num: doneTasks, label: 'Completed' },
            { num: totalNotes, label: 'Notes' },
          ].map(s => (
            <div
              key={s.label}
              role="listitem"
              aria-label={`${s.label}: ${s.num}`}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '14px 12px', textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent2)' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 16px' }}>
          {/* Theme */}
          <SettingRow
            label="Theme"
            sub="App colour scheme"
            right={
              <div role="group" aria-label="Theme selection" style={{ display: 'flex', gap: '4px' }}>
                {themeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={state.settings.theme === opt.value}
                    aria-label={`${opt.label} theme`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: state.settings.theme === opt.value ? 'var(--accent)' : 'var(--border)',
                      background: state.settings.theme === opt.value ? 'var(--accent)' : 'var(--surface2)',
                      color: state.settings.theme === opt.value ? '#fff' : 'var(--text2)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />

          {/* Font size */}
          <SettingRow
            label="Text Size"
            sub="Adjust readable text size"
            noBorder
            right={
              <div role="group" aria-label="Font size selection" style={{ display: 'flex', gap: '4px' }}>
                {fontOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    aria-pressed={state.settings.fontSize === opt.value}
                    aria-label={`${opt.value} text size`}
                    style={{
                      width: '36px', height: '36px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: state.settings.fontSize === opt.value ? 'var(--accent)' : 'var(--border)',
                      background: state.settings.fontSize === opt.value ? 'var(--accent)' : 'var(--surface2)',
                      color: state.settings.fontSize === opt.value ? '#fff' : 'var(--text2)',
                      fontFamily: 'var(--font-body)',
                      fontSize: opt.value === 'small' ? '12px' : opt.value === 'large' ? '16px' : '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        {/* Accessibility */}
        <SectionLabel>Accessibility</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 16px' }}>
          <SettingRow
            label="High Contrast"
            sub="Stronger text and border contrast"
            right={
              <Toggle
                on={state.settings.highContrast}
                onToggle={() => toggleSetting('highContrast')}
                label="Toggle high contrast mode"
              />
            }
          />
          <SettingRow
            label="Reduce Motion"
            sub="Minimise animations and transitions"
            noBorder
            right={
              <Toggle
                on={state.settings.reduceMotion}
                onToggle={() => toggleSetting('reduceMotion')}
                label="Toggle reduce motion"
              />
            }
          />
        </div>

        {/* Preferences */}
        <SectionLabel>Preferences</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 16px' }}>
          {/* View mode */}
          <SettingRow
            label="Task View"
            sub="Simple hides notes and shows less detail"
            right={
              <div role="group" aria-label="Task view mode" style={{ display: 'flex', gap: '4px' }}>
                {(['simple', 'detailed'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    aria-pressed={(state.settings.viewMode ?? 'detailed') === v}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid',
                      borderColor: (state.settings.viewMode ?? 'detailed') === v ? 'var(--accent)' : 'var(--border)',
                      background: (state.settings.viewMode ?? 'detailed') === v ? 'var(--accent)' : 'var(--surface2)',
                      color: (state.settings.viewMode ?? 'detailed') === v ? '#fff' : 'var(--text2)',
                      fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                    }}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            }
          />
          <SettingRow
            label="Notifications"
            sub="Get reminded about tasks"
            right={
              <Toggle
                on={state.settings.notifications}
                onToggle={() => toggleSetting('notifications')}
                label="Toggle notifications"
              />
            }
          />
          <SettingRow
            label="Calendar Sync"
            sub="Sync events with system calendar"
            noBorder
            right={
              <Toggle
                on={state.settings.calendarSync}
                onToggle={() => toggleSetting('calendarSync')}
                label="Toggle calendar sync"
              />
            }
          />
        </div>

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <button
          onClick={onLogout}
          aria-label="Sign out of your account"
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.12)',
            color: 'var(--danger)', fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-base)', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </main>

      {/* Edit Profile Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit Profile">
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="profile-name" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>
            Name
          </label>
          <input
            id="profile-name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            autoComplete="name"
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: 'var(--font-size-base)', padding: '14px 16px', outline: 'none',
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="profile-email" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px' }}>
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="your@email.com"
            autoComplete="email"
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: 'var(--font-size-base)', padding: '14px 16px', outline: 'none',
            }}
          />
        </div>
        <button
          onClick={saveProfile}
          aria-label="Save profile changes"
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: '#fff', fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-base)', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Save Profile
        </button>
      </Modal>
    </div>
  );
}
