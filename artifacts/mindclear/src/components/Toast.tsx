import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, visible, onHide }: ToastProps) {
  useEffect(() => {
  if (!visible) return;

  const t = setTimeout(onHide, 2500);

  return () => clearTimeout(t);
}, [visible, onHide]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '12px 20px',
      borderRadius: '100px',
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--text)',
      zIndex: 999,
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s',
      whiteSpace: 'nowrap',
      maxWidth: '90vw',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
    }}>
      {message}
    </div>
  );
}
