'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Signup failed.'); return }
      
      setSuccess(true)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-teal-light)' }}>
        <div className="w-full max-w-sm bg-white rounded-[8px] p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Check your email</h2>
          <p className="text-gray-500 mb-6 font-medium">
            We've sent a confirmation link to <br/><span className="text-gray-900 font-semibold">{email}</span>.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please click the link in that email to activate your Azmuth account.
          </p>
          <Link href="/auth/login" className="inline-block w-full text-sm font-medium text-white transition-all duration-150 ease-out" style={{ backgroundColor: 'var(--color-teal)', borderRadius: '8px', padding: '11px 0', border: 'none' }}>
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-teal-light)' }}>
      <div className="w-full max-w-sm bg-white rounded-[8px] p-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/azmuth-logo.png" alt="Azmuth" width={56} height={56} className="rounded-md" />
          <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: '28px', color: '#1F8F8A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '-4px' }}>Understand how your students think</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Full Name</label>
            <input id="fullName" type="text" autoComplete="name" required value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="Ms. Priya Sharma"
              className="w-full text-sm transition-all duration-150 ease-out"
              style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--color-surface)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
            <input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@school.com"
              className="w-full text-sm transition-all duration-150 ease-out"
              style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--color-surface)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
            <input id="password" type="password" autoComplete="new-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters"
              className="w-full text-sm transition-all duration-150 ease-out"
              style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--color-surface)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-score-weak-text)' }}>{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white transition-all duration-150 ease-out"
            style={{ backgroundColor: 'var(--color-teal)', borderRadius: '8px', padding: '11px 0', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-teal)' }}
          >
            {loading ? <><Spinner /> Creating account…</> : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium" style={{ color: 'var(--color-teal)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
