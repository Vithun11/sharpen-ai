'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div
        className="text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '40px 48px',
          maxWidth: 400,
        }}
      >
        <p style={{ fontSize: 32, margin: '0 0 12px' }}>⚠️</p>
        <h2
          className="font-semibold mb-2"
          style={{ fontSize: 18, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
        >
          Something went wrong
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          An unexpected error occurred. Please refresh the page.
        </p>
        <button
          onClick={reset}
          className="text-sm font-medium text-white"
          style={{
            backgroundColor: 'var(--color-teal)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
