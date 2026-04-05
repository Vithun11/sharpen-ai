'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Login failed.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-teal-light)' }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[8px] p-8"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/azmuth-logo.png" alt="Azmuth" width={56} height={56} className="rounded-md" />
          <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: '28px', color: '#1F8F8A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '-4px' }}>Understand how your students think</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full text-sm transition-all duration-150 ease-out"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px 14px',
                outline: 'none',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--color-surface)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm transition-all duration-150 ease-out"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px 14px',
                outline: 'none',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--color-surface)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm" style={{ color: 'var(--color-score-weak-text)' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white transition-all duration-150 ease-out"
            style={{
              backgroundColor: 'var(--color-teal)',
              borderRadius: '8px',
              padding: '11px 0',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-teal)'
            }}
          >
            {loading ? (
              <>
                <Spinner />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-medium transition-colors duration-150"
            style={{ color: 'var(--color-teal)' }}
          >
            Sign up
          </Link>
        </p>

        {/* Demo Account Hint */}
        <div className="mt-8 p-4 rounded-lg flex flex-col items-center gap-2 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-teal-light)' }}>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            🧪 Want to test the app?
          </p>
          <p style={{ color: 'var(--text-muted)' }} className="text-center">
            Log in using the test credentials below:
          </p>
          <div className="flex flex-col items-center gap-1 mt-1 font-mono text-[13px]">
            <span style={{ color: 'var(--text-primary)' }}><strong>Email:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">test@azmuth.app</code></span>
            <span style={{ color: 'var(--text-primary)' }}><strong>Password:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">password</code></span>
          </div>
          <button
            type="button"
            onClick={() => { setEmail('test@azmuth.app'); setPassword('password'); }}
            className="mt-2 text-xs font-medium px-4 py-2 rounded-md transition-colors"
            style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-dark)' }}
          >
            Auto-fill credentials
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
