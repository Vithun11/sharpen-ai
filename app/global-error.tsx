'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, backgroundColor: 'var(--color-teal-light)', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 40, maxWidth: 420, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>⚠️</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-surface)', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Refresh page
          </button>
        </div>
      </body>
    </html>
  )
}
