import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Task } from '../store';

type Mode   = 'focus' | 'short' | 'long';
type SoundId = 'off' | 'rain' | 'white' | 'brown' | 'focus' | 'forest' | 'lofi';

const MODES: Record<Mode, { label: string; minutes: number; color: string; glow: string }> = {
  focus: { label: 'Focus',       minutes: 25, color: 'var(--accent)', glow: 'var(--accent-glow)' },
  short: { label: 'Short Break', minutes:  5, color: '#4ade80',       glow: 'rgba(74,222,128,0.25)' },
  long:  { label: 'Long Break',  minutes: 15, color: '#818cf8',       glow: 'rgba(129,140,248,0.25)' },
};

const SOUNDS: Record<SoundId, { label: string; icon: string; desc: string }> = {
  off:    { label: 'Off',        icon: '🔇', desc: 'Silent' },
  rain:   { label: 'Rain',       icon: '🌧️', desc: 'Gentle rainfall' },
  white:  { label: 'White',      icon: '🌊', desc: 'White noise' },
  brown:  { label: 'Brown',      icon: '🟤', desc: 'Warm brown noise' },
  focus:  { label: 'Binaural',   icon: '🎵', desc: '40 Hz deep focus' },
  forest: { label: 'Forest',     icon: '🌿', desc: 'Wind & leaves' },
  lofi:   { label: 'Lo-fi',      icon: '🎹', desc: 'Soft chord drone' },
};

const RING_R    = 100;
const RING_CIRC = 2 * Math.PI * RING_R;

interface PomodoroProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onToast: (msg: string) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   'var(--danger)',
  Medium: 'var(--warn)',
  Low:    'var(--success)',
};

// ─── Audio engine ───────────────────────────────────────────────────

function makeNoiseBuffer(ctx: AudioContext, seconds = 3, brown = false): AudioBuffer {
  const len  = ctx.sampleRate * seconds;
  const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    } else {
      data[i] = w;
    }
  }
  return buf;
}

function loopBuffer(ctx: AudioContext, buf: AudioBuffer, dest: AudioNode): AudioBufferSourceNode {
  const src  = ctx.createBufferSource();
  src.buffer = buf;
  src.loop   = true;
  src.connect(dest);
  src.start();
  return src;
}

interface SoundNodes { stop: () => void }

function startSound(ctx: AudioContext, master: GainNode, id: SoundId): SoundNodes {
  const nodes: AudioNode[] = [];
  const stop = () => nodes.forEach(n => { try { (n as AudioBufferSourceNode | OscillatorNode).stop?.(); n.disconnect(); } catch {} });

  if (id === 'white') {
    const buf = makeNoiseBuffer(ctx, 4);
    nodes.push(loopBuffer(ctx, buf, master));
  }

  if (id === 'brown') {
    const buf  = makeNoiseBuffer(ctx, 4, true);
    const filt = ctx.createBiquadFilter();
    filt.type            = 'lowpass';
    filt.frequency.value = 600;
    filt.connect(master);
    nodes.push(loopBuffer(ctx, buf, filt), filt);
  }

  if (id === 'rain') {
    // Two layered noise bands: low rumble + mid-freq patter
    const buf1  = makeNoiseBuffer(ctx, 3);
    const filt1 = ctx.createBiquadFilter();
    filt1.type            = 'bandpass';
    filt1.frequency.value = 900;
    filt1.Q.value         = 0.4;
    const g1 = ctx.createGain(); g1.gain.value = 0.6;
    filt1.connect(g1); g1.connect(master);
    nodes.push(loopBuffer(ctx, buf1, filt1), filt1, g1);

    const buf2  = makeNoiseBuffer(ctx, 3);
    const filt2 = ctx.createBiquadFilter();
    filt2.type            = 'bandpass';
    filt2.frequency.value = 2800;
    filt2.Q.value         = 0.3;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    filt2.connect(g2); g2.connect(master);
    nodes.push(loopBuffer(ctx, buf2, filt2), filt2, g2);

    // LFO on volume for rainfall variation
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoG.gain.value     = 0.08;
    lfo.connect(lfoG); lfoG.connect(master.gain as unknown as AudioNode);
    lfo.start();
    nodes.push(lfo, lfoG);
  }

  if (id === 'focus') {
    // 40 Hz binaural: 200 Hz left, 240 Hz right
    const merger = ctx.createChannelMerger(2);
    merger.connect(master);

    const freqs = [200, 240];
    freqs.forEach((freq, ch) => {
      const osc  = ctx.createOscillator();
      const pan  = ctx.createGain();
      const splitter = ctx.createChannelSplitter(1);
      osc.type            = 'sine';
      osc.frequency.value = freq;
      pan.gain.value      = 0.4;
      osc.connect(pan); pan.connect(merger, 0, ch);
      osc.start();
      nodes.push(osc, pan);
    });
    nodes.push(merger);

    // Sub drone at 40 Hz
    const drone = ctx.createOscillator();
    const droneG = ctx.createGain();
    drone.type            = 'sine';
    drone.frequency.value = 40;
    droneG.gain.value     = 0.06;
    drone.connect(droneG); droneG.connect(master);
    drone.start();
    nodes.push(drone, droneG);
  }

  if (id === 'forest') {
    // Wind: brown noise through lowpass
    const windBuf  = makeNoiseBuffer(ctx, 5, true);
    const windFilt = ctx.createBiquadFilter();
    windFilt.type            = 'lowpass';
    windFilt.frequency.value = 400;
    const windG = ctx.createGain(); windG.gain.value = 0.5;
    windFilt.connect(windG); windG.connect(master);
    nodes.push(loopBuffer(ctx, windBuf, windFilt), windFilt, windG);

    // Leaves: high-pass noise at low volume
    const leafBuf  = makeNoiseBuffer(ctx, 4);
    const leafFilt = ctx.createBiquadFilter();
    leafFilt.type            = 'bandpass';
    leafFilt.frequency.value = 3500;
    leafFilt.Q.value         = 0.5;
    const leafG = ctx.createGain(); leafG.gain.value = 0.12;
    leafFilt.connect(leafG); leafG.connect(master);
    nodes.push(loopBuffer(ctx, leafBuf, leafFilt), leafFilt, leafG);

    // Slow LFO for swaying
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoG.gain.value     = 0.1;
    lfo.connect(lfoG); lfoG.connect(windG.gain as unknown as AudioNode);
    lfo.start();
    nodes.push(lfo, lfoG);
  }

  if (id === 'lofi') {
    // Soft chord drone: stack of detuned sines (Cmaj7)
    const chordFreqs = [130.8, 164.8, 196, 246.9, 293.7]; // C3 E3 G3 B3 D4
    chordFreqs.forEach((f, i) => {
      const osc  = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type            = 'sine';
      osc.frequency.value = f + (i % 2 === 0 ? 0.4 : -0.4); // slight detune
      oGain.gain.value    = 0.07;
      osc.connect(oGain); oGain.connect(master);
      osc.start();
      nodes.push(osc, oGain);
    });

    // Warm vinyl hiss
    const hissBuf  = makeNoiseBuffer(ctx, 3);
    const hissFilt = ctx.createBiquadFilter();
    hissFilt.type            = 'highpass';
    hissFilt.frequency.value = 4000;
    const hissG = ctx.createGain(); hissG.gain.value = 0.04;
    hissFilt.connect(hissG); hissG.connect(master);
    nodes.push(loopBuffer(ctx, hissBuf, hissFilt), hissFilt, hissG);

    // Very slow tremolo on the chords
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.3;
    lfoG.gain.value     = 0.02;
    lfo.connect(lfoG); lfoG.connect(master.gain as unknown as AudioNode);
    lfo.start();
    nodes.push(lfo, lfoG);
  }

  return { stop };
}

// ─── Animated EQ bars ───────────────────────────────────────────────
function EqBars({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      {[4, 10, 7, 12, 5].map((h, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: active ? `${h}px` : '3px',
            background: 'var(--accent)',
            borderRadius: '2px',
            transition: `height ${0.3 + i * 0.07}s ease-in-out`,
            animation: active ? `eq-bounce-${i} ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────
export function Pomodoro({ state, onStateChange, onToast }: PomodoroProps) {
  const [mode, setMode]             = useState<Mode>('focus');
  const [secondsLeft, setSecs]      = useState(MODES.focus.minutes * 60);
  const [running, setRunning]       = useState(false);
  const [sessions, setSessions]     = useState(0);
  const [linkedTask, setLinked]     = useState<Task | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  // Sound state
  const [activeSound, setActiveSound] = useState<SoundId>('off');
  const [volume, setVolume]           = useState(0.5);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundNodesRef = useRef<SoundNodes | null>(null);

  const totalSecs  = MODES[mode].minutes * 60;
  const progress   = secondsLeft / totalSecs;
  const strokeDash = RING_CIRC * progress;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const cfg  = MODES[mode];
  const activeTasks = state.tasks.filter(t => !t.completed);

  // Sync volume to gain node
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, masterGainRef.current.context.currentTime, 0.05);
    }
  }, [volume]);

  // Start/stop sounds
  function applySound(id: SoundId) {
    // Stop old sound
    soundNodesRef.current?.stop();
    soundNodesRef.current = null;

    if (id === 'off') {
      setActiveSound('off');
      return;
    }

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      if (!masterGainRef.current || masterGainRef.current.context !== ctx) {
        masterGainRef.current = ctx.createGain();
        masterGainRef.current.gain.value = volume;
        masterGainRef.current.connect(ctx.destination);
      }
      soundNodesRef.current = startSound(ctx, masterGainRef.current, id);
      setActiveSound(id);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundNodesRef.current?.stop();
      try { audioCtxRef.current?.close(); } catch {}
    };
  }, []);

  function playDone() {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  const tick = useCallback(() => {
    setSecs(s => {
      if (s <= 1) {
        setRunning(false);
        playDone();
        if (mode === 'focus') { setSessions(n => n + 1); setJustFinished(true); }
        return 0;
      }
      return s - 1;
    });
  }, [mode]);

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(tick, 1000); }
    else { if (intervalRef.current) clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  function switchMode(m: Mode) { setRunning(false); setMode(m); setSecs(MODES[m].minutes * 60); setJustFinished(false); }
  function reset()              { setRunning(false); setSecs(totalSecs); setJustFinished(false); }
  function toggleRun() {
    setJustFinished(false);
    if (secondsLeft === 0) { setSecs(totalSecs); setRunning(true); }
    else { setRunning(r => !r); }
  }

  function completeLinkedTask() {
    if (!linkedTask) return;
    onStateChange({ ...state, tasks: state.tasks.map(t => t.id === linkedTask.id ? { ...t, completed: true } : t) });
    onToast('✅ Task marked complete!');
    setLinked(null); setJustFinished(false);
  }

  const sessionDots = Array.from({ length: 4 }, (_, i) => i < (sessions % 4));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      {/* EQ bounce keyframes */}
      <style>{`
        @keyframes eq-bounce-0 { from { height: 4px } to { height: 12px } }
        @keyframes eq-bounce-1 { from { height: 6px } to { height: 14px } }
        @keyframes eq-bounce-2 { from { height: 3px } to { height: 10px } }
        @keyframes eq-bounce-3 { from { height: 8px } to { height: 15px } }
        @keyframes eq-bounce-4 { from { height: 5px } to { height: 11px } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', lineHeight: 1.1 }}>Focus Timer</h1>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px' }}>
          {sessions} session{sessions !== 1 ? 's' : ''} completed today
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', background: 'var(--surface)', borderRadius: '100px', padding: '4px', border: '1px solid var(--border)' }}>
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: mode === m ? cfg.color : 'transparent', color: mode === m ? '#fff' : 'var(--text2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Ring */}
        <div style={{ position: 'relative', width: '260px', height: '260px', marginBottom: '32px' }}>
          <div style={{ position: 'absolute', inset: '-16px', borderRadius: '50%', background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 0.5s' }} />
          <svg width="260" height="260" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx="130" cy="130" r={RING_R} fill="none" stroke="var(--surface2)" strokeWidth="10" />
            <circle cx="130" cy="130" r={RING_R} fill="none" stroke={cfg.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${strokeDash} ${RING_CIRC}`} style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.5s' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-2px' }}>{mins}:{secs}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: cfg.color, transition: 'color 0.5s' }}>{cfg.label}</div>
          </div>
        </div>

        {/* Session dots */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
          {sessionDots.map((filled, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: filled ? 'var(--accent)' : 'var(--surface3)', boxShadow: filled ? '0 0 8px var(--accent-glow)' : 'none', transition: 'all 0.3s' }} />
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button onClick={reset} aria-label="Reset" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button onClick={toggleRun} aria-label={running ? 'Pause' : 'Start'} style={{ width: '80px', height: '80px', borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${cfg.color}, var(--accent2))`, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 32px ${cfg.glow}`, transition: 'all 0.3s', transform: running ? 'scale(1.05)' : 'scale(1)' }}>
            {running ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style={{ width: 28, height: 28 }}>
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H14.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style={{ width: 28, height: 28, marginLeft: '3px' }}>
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button onClick={() => { const next: Record<Mode, Mode> = { focus: sessions % 4 === 3 ? 'long' : 'short', short: 'focus', long: 'focus' }; switchMode(next[mode]); }} aria-label="Skip" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
            </svg>
          </button>
        </div>

        {/* ── Focus Sound ── */}
        <div style={{ width: '100%', marginBottom: '20px' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--text3)', textTransform: 'uppercase' }}>Focus Sound</div>
            {activeSound !== 'off' && <EqBars active={true} />}
          </div>

          {/* Sound chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {(Object.keys(SOUNDS) as SoundId[]).map(id => {
              const s       = SOUNDS[id];
              const isActive = id === activeSound;
              return (
                <button
                  key={id}
                  onClick={() => applySound(id)}
                  title={s.desc}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '5px', padding: '10px 14px', flexShrink: 0,
                    borderRadius: '14px', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(124,111,247,0.22), rgba(168,156,247,0.1))'
                      : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 16px var(--accent-glow)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{s.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isActive ? 'var(--accent2)' : 'var(--text2)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Volume slider — only shown when a sound is active */}
          {activeSound !== 'off' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', animation: 'fadeIn 0.2s ease' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="var(--text3)" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
              <input
                type="range" min={0} max={1} step={0.01}
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                aria-label="Sound volume"
                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', height: '4px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text3)', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* ── Session done banner ── */}
        {justFinished && (
          <div style={{ width: '100%', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(124,111,247,0.18), rgba(168,156,247,0.1))', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '18px 20px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>🎉 Focus session complete!</div>
            {linkedTask ? (
              <>
                <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
                  Did you finish <span style={{ color: 'var(--text)', fontWeight: 500 }}>"{linkedTask.text.slice(0, 60)}{linkedTask.text.length > 60 ? '…' : ''}"</span>?
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={completeLinkedTask} style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Mark Complete</button>
                  <button onClick={() => setJustFinished(false)} style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Keep Going</button>
                </div>
              </>
            ) : (
              <button onClick={() => setJustFinished(false)} style={{ width: '100%', padding: '11px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Start Break</button>
            )}
          </div>
        )}

        {/* ── Linked task ── */}
        {!justFinished && (
          <div style={{ width: '100%', marginBottom: '20px' }}>
            {linkedTask ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '5px', background: PRIORITY_COLOR[linkedTask.priority] || 'var(--accent)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '4px' }}>Focusing on</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{linkedTask.text}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{linkedTask.priority} priority{linkedTask.dueDate ? ` · Due ${linkedTask.dueDate}` : ''}</div>
                </div>
                <button onClick={() => setLinked(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '2px', flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowPicker(p => !p)} style={{ width: '100%', padding: '13px 16px', background: 'var(--surface)', border: `1px solid ${showPicker ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '14px', transition: 'border-color 0.2s' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 18, height: 18, flexShrink: 0, color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  {activeTasks.length === 0 ? 'No active tasks to link' : 'Link a task to this session'}
                  {activeTasks.length > 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 16, height: 16, marginLeft: 'auto', transform: showPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  )}
                </button>
                {showPicker && activeTasks.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', marginTop: '6px', overflow: 'hidden', animation: 'fadeIn 0.15s ease', boxShadow: '0 8px 32px rgba(124,111,247,0.15)' }}>
                    {activeTasks.map((t, i) => (
                      <button key={t.id} onClick={() => { setLinked(t); setShowPicker(false); }} style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: i < activeTasks.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLOR[t.priority] || 'var(--accent)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--font-body)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.priority}{t.dueDate ? ` · ${t.dueDate}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Info card */}
        <div style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
            {[{ label: 'Focus', val: '25 min' }, { label: 'Short', val: '5 min' }, { label: 'Long', val: '15 min' }].map(({ label, val }) => (
              <div key={label} style={{ padding: '8px 0', borderRight: label !== 'Long' ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{val}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '14px', paddingTop: '14px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center' }}>
            After every 4 focus sessions, take a long break.
          </div>
        </div>

      </div>
    </div>
  );
}
