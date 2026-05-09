import React, { type ReactElement } from "react";

type Screen = 'home' | 'dashboard' | 'tasks' | 'calendar' | 'pomodoro' | 'profile';

interface NavbarProps {
  active: Screen;
  onNavigate: (s: Screen) => void;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="Brain Dump"
      style={{
        width: 26,
        height: 26,
        borderRadius: '7px',
        display: 'block',
        opacity: active ? 1 : 0.45,
        transition: 'opacity 0.2s',
        filter: active ? 'drop-shadow(0 0 5px rgba(124,111,247,0.9))' : 'none',
      }}
      draggable={false}
    />
  );
}

const items: { id: Screen; label: string; icon?: ReactElement; custom?: boolean }[] = [
  { id: 'home', label: 'Dump', custom: true },
  {
    id: 'dashboard',
    label: 'Today',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 22, height: 22, strokeWidth: 1.8 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 22, height: 22, strokeWidth: 1.8 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Cal',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 22, height: 22, strokeWidth: 1.8 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    id: 'pomodoro',
    label: 'Focus',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 22, height: 22, strokeWidth: 1.8 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Me',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 22, height: 22, strokeWidth: 1.8 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
];

export function Navbar({ active, onNavigate }: NavbarProps) {
  return (
    <nav aria-label="Main navigation" style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '10px 0 20px',
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '420px',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
          aria-current={active === item.id ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'none',
            color: active === item.id ? 'var(--accent2)' : 'var(--text3)',
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          {item.custom
            ? <HomeIcon active={active === item.id} />
            : <span style={active === item.id ? { filter: 'drop-shadow(0 0 6px var(--accent))' } : {}}>
                {item.icon}
              </span>
          }
          {item.label}
        </button>
      ))}
    </nav>
  );
}
