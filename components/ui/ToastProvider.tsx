'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerMap = useRef<Record<string, NodeJS.Timeout>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timerMap.current[id]) clearTimeout(timerMap.current[id])
    delete timerMap.current[id]
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]) // max 5 at once
    timerMap.current[id] = setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error   = useCallback((msg: string) => toast(msg, 'error'),   [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Toast Item ────────────────────────────────────────────────────────────────

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const borderColor = t.type === 'success' ? 'var(--color-score-strong-text)' : 'var(--color-score-weak-text)'
  const iconColor   = t.type === 'success' ? 'var(--color-score-strong-text)' : 'var(--color-score-weak-text)'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        backgroundColor: 'var(--color-surface)',
        borderRadius: 8,
        padding: '12px 14px',
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        minWidth: 260, maxWidth: 360,
        pointerEvents: 'all',
        animation: 'toast-in 200ms ease',
        fontFamily: 'var(--font-body)',
      }}
    >
      {t.type === 'success'
        ? <CheckCircle2 size={16} color={iconColor} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        : <XCircle     size={16} color={iconColor} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      }
      <p style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{t.message}</p>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
