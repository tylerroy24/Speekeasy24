import React from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export function Button({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-semibold transition-all duration-200 select-none'
  const variants = {
    primary: 'bg-lime text-ink hover:bg-lime-dim active:scale-[0.98] lime-glow',
    secondary: 'bg-panel border border-border text-cream hover:border-lime/40 hover:bg-muted active:scale-[0.98]',
    ghost: 'text-ghost hover:text-cream hover:bg-muted active:scale-[0.98]',
    danger: 'bg-coral/10 border border-coral/30 text-coral hover:bg-coral/20 active:scale-[0.98]',
    outline: 'border border-lime/60 text-lime hover:bg-lime/10 active:scale-[0.98]',
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-md',
    md: 'text-sm px-4 py-2.5 rounded-lg',
    lg: 'text-base px-6 py-3 rounded-xl',
    xl: 'text-lg px-8 py-4 rounded-xl',
  }
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="spin" />}
      {children}
    </button>
  )
}

export function Input({ label, error, hint, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-mono text-ghost uppercase tracking-widest">{label}</label>}
      <input
        className={clsx('input-base w-full px-4 py-3 rounded-lg text-sm font-sans', className)}
        {...props}
      />
      {error && <p className="text-xs text-coral">{error}</p>}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-mono text-ghost uppercase tracking-widest">{label}</label>}
      <textarea
        className={clsx('input-base w-full px-4 py-3 rounded-lg text-sm font-sans resize-none', className)}
        {...props}
      />
      {error && <p className="text-xs text-coral">{error}</p>}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-mono text-ghost uppercase tracking-widest">{label}</label>}
      <select
        className={clsx('input-base w-full px-4 py-3 rounded-lg text-sm font-sans appearance-none cursor-pointer', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  )
}

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-muted text-ghost border-border',
    lime: 'bg-lime/10 text-lime border-lime/20',
    coral: 'bg-coral/10 text-coral border-coral/20',
    violet: 'bg-violet/10 text-violet border-violet/20',
    active: 'bg-lime/20 text-lime border-lime/30',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StatusDot({ status }) {
  const colors = {
    active: 'bg-lime',
    idle: 'bg-subtle',
    calling: 'bg-coral',
    completed: 'bg-violet',
  }
  return (
    <span className={clsx('w-2 h-2 rounded-full status-pulse', colors[status] || colors.idle)} />
  )
}

export function Card({ children, className, ...props }) {
  return (
    <div className={clsx('glass-card rounded-2xl p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function Divider({ label }) {
  if (!label) return <hr className="border-border my-6" />
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-mono text-subtle uppercase tracking-widest">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

export function Waveform({ active = true }) {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {[12, 20, 28, 16, 24, 12, 20, 28, 14].map((h, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            height: h,
            animationDelay: `${i * 0.08}s`,
            opacity: active ? 1 : 0.3,
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  )
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin text-lime" />
}

export function Toast({ message, type = 'info', onClose }) {
  const colors = {
    info: 'border-border bg-panel',
    success: 'border-lime/30 bg-lime/5',
    error: 'border-coral/30 bg-coral/5',
  }
  const icons = { info: '💬', success: '✓', error: '✕' }
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border', colors[type])}>
      <span className="text-sm">{icons[type]}</span>
      <p className="text-sm text-cream flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="text-subtle hover:text-cream text-xs">✕</button>
      )}
    </div>
  )
}
