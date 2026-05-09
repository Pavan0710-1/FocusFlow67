import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, loadState, saveState } from './store';
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { Dashboard } from './screens/Dashboard';
import { Tasks } from './screens/Tasks';
import { Calendar } from './screens/Calendar';
import { Pomodoro } from './screens/Pomodoro';
import { Profile } from './screens/Profile';
import { Splash } from './screens/Splash';
import { Onboarding } from './screens/Onboarding';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';

type Screen = 'home' | 'dashboard' | 'tasks' | 'calendar' | 'pomodoro' | 'profile';

function applyTheme(state: AppState) {
  const root = document.documentElement;
  const { theme, fontSize, reduceMotion, highContrast } = state.settings;

  // Resolve system preference
  let resolvedTheme = theme;
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  root.setAttribute('data-theme', resolvedTheme);
  root.setAttribute('data-font-size', fontSize);
  root.setAttribute('data-reduce-motion', String(reduceMotion));
  root.setAttribute('data-high-contrast', String(highContrast));
}

const SCREEN_LABELS: Record<Screen, string> = {
  home: 'Brain Dump',
  dashboard: 'Today\'s Overview',
  tasks: 'Tasks',
  calendar: 'Calendar',
  pomodoro: 'Focus Timer',
  profile: 'Profile & Settings',
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [screen, setScreen] = useState<Screen>('home');
  const [toast, setToast] = useState({ message: '', visible: false });
  const [splashDone, setSplashDone] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Apply theme on every state change
  useEffect(() => {
    applyTheme(appState);
  }, [appState]);

  // Also react to system color scheme changes
  useEffect(() => {
    if (appState.settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme(appState);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [appState.settings.theme]);

  // Persist every state change to localStorage
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'mindclear_v3' && e.newValue) {
        try { setAppState(JSON.parse(e.newValue) as AppState); } catch {}
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleStateChange = useCallback((newState: AppState) => {
    setAppState(newState);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(t => ({ ...t, visible: false }));
  }, []);

  function handleLogin(name: string, email: string) {
    const initials = name
      .split(' ')
      .map(w => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || name[0]?.toUpperCase() || 'U';

    setAppState(prev => {
      const next: AppState = {
        ...prev,
        loggedIn: true,
        user: { name, email, initials },
      };
      saveState(next);
      return next;
    });
    setScreen('home');
  }

  function handleLogout() {
    setAppState(prev => {
      const next: AppState = { ...prev, loggedIn: false };
      saveState(next);
      return next;
    });
  }

  function handleOnboardingDone() {
    setAppState(prev => {
      const next: AppState = { ...prev, hasOnboarded: true };
      saveState(next);
      return next;
    });
  }

  // Show splash first
  if (!splashDone) {
    return <Splash onDone={() => setSplashDone(true)} />;
  }

  // Not logged in → Login
  if (!appState.loggedIn) {
    return (
      <>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Login onLogin={handleLogin} />
        <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
      </>
    );
  }

  // Logged in but not onboarded → Onboarding
  if (!appState.hasOnboarded) {
    return (
      <>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Onboarding onDone={handleOnboardingDone} />
        <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
      </>
    );
  }

  function navigate(s: Screen) {
    setScreen(s);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = '';
      requestAnimationFrame(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `Navigated to ${SCREEN_LABELS[s]}`;
        }
      });
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      />

      {screen === 'home' && (
        <Home
          state={appState}
          onStateChange={handleStateChange}
          onNavigate={navigate}
          onToast={showToast}
        />
      )}
      {screen === 'dashboard' && (
        <Dashboard
          state={appState}
          onStateChange={handleStateChange}
          onNavigate={navigate}
          onToast={showToast}
        />
      )}
      {screen === 'tasks' && (
        <Tasks
          state={appState}
          onStateChange={handleStateChange}
          onToast={showToast}
        />
      )}
      {screen === 'calendar' && (
        <Calendar
          state={appState}
          onStateChange={handleStateChange}
          onToast={showToast}
        />
      )}
      {screen === 'pomodoro' && (
        <Pomodoro
          state={appState}
          onStateChange={handleStateChange}
          onToast={showToast}
        />
      )}
      {screen === 'profile' && (
        <Profile
          state={appState}
          onStateChange={handleStateChange}
          onToast={showToast}
          onLogout={handleLogout}
        />
      )}

      <Navbar active={screen} onNavigate={navigate} />
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </>
  );
}
