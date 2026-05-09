import { useState } from 'react';

interface OnboardingProps {
  onDone: () => void;
}

const SLIDES = [
  {
    icon: '🧠',
    title: 'Brain Dump, Instantly',
    body: 'Type anything on your mind — tasks, events, ideas — all in one go. FocusFlow organises it for you automatically.',
    accent: '#7c6ff7',
  },
  {
    icon: '✅',
    title: 'Tasks, Sorted by Priority',
    body: 'Your to-dos are captured with smart priority detection. Filter by High, Medium, or Low — never miss what matters.',
    accent: '#a78bfa',
  },
  {
    icon: '📅',
    title: 'Your Calendar, Effortless',
    body: 'Events are pulled straight from your brain dumps and placed on a clean monthly calendar. Scheduling made simple.',
    accent: '#818cf8',
  },
  {
    icon: '📝',
    title: 'Notes That Stick',
    body: 'Ideas and thoughts are saved as searchable notes. Find anything in seconds with the built-in search.',
    accent: '#c4b5fd',
  },
];

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  function next() {
    if (isLast) { onDone(); return; }
    setStep(s => s + 1);
    setAnimKey(k => k + 1);
  }

  function skip() { onDone(); }

  return (
    <div
      role="main"
      aria-label="Onboarding"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(124,111,247,0.14) 0%, transparent 65%), var(--bg)',
        padding: '0 28px 48px',
        position: 'relative',
      }}
    >
      {/* Skip */}
      {!isLast && (
        <button
          onClick={skip}
          aria-label="Skip onboarding"
          style={{
            position: 'absolute', top: '52px', right: '24px',
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: '14px', fontFamily: 'var(--font-body)', cursor: 'pointer',
            padding: '8px',
          }}
        >
          Skip
        </button>
      )}

      {/* Slide content */}
      <div
        key={animKey}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          animation: 'onboardSlideIn 0.4s ease',
          paddingTop: '40px',
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Illustration circle */}
        <div style={{
          width: '140px',
          height: '140px',
          borderRadius: '40px',
          background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accent}44)`,
          border: `2px solid ${slide.accent}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '64px',
          marginBottom: '40px',
          boxShadow: `0 0 60px ${slide.accent}22`,
        }}
          aria-hidden="true"
        >
          {slide.icon}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '30px',
          color: 'var(--text)',
          lineHeight: 1.15,
          marginBottom: '16px',
        }}>
          {slide.title}
        </h1>
        <p style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--text2)',
          lineHeight: 1.65,
          maxWidth: '300px',
        }}>
          {slide.body}
        </p>
      </div>

      {/* Dots */}
      <div
        role="tablist"
        aria-label="Onboarding progress"
        style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '36px' }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === step}
            aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
            onClick={() => { setStep(i); setAnimKey(k => k + 1); }}
            style={{
              width: i === step ? '24px' : '8px',
              height: '8px',
              borderRadius: '100px',
              background: i === step ? 'var(--accent)' : 'var(--surface3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'width 0.3s, background 0.3s',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={next}
        aria-label={isLast ? 'Get started with FocusFlow' : 'Next slide'}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          color: '#fff',
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 24px var(--accent-glow)',
        }}
      >
        {isLast ? "Let's Go!" : 'Next'}
      </button>
    </div>
  );
}
