'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/ToastProvider'

interface Props {
  classId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddStudentModal({ classId, onClose, onAdded }: Props) {
  const [fullName, setFullName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [email, setEmail] = useState('')
  const [imeiNumber, setImeiNumber] = useState('')

  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ fullName?: string; general?: string }>({})
  const { success, error: toastError } = useToast()
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNameChange = (val: string) => {
    setFullName(val)
    setIsLinked(false)
    if (val.length >= 2) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      searchTimeout.current = setTimeout(() => fetchSearch(val), 300)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }

  const fetchSearch = async (query: string) => {
    try {
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const json = await res.json()
        setSearchResults(json.data || [])
        setShowDropdown(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectIdentity = (item: any) => {
    setFullName(item.full_name)
    setEmail(item.email || '')
    setRollNumber(item.roll_number?.toString() || '')
    setImeiNumber(item.imei_number || '')
    setIsLinked(true)
    setShowDropdown(false)
    setSearchResults([])
  }

  function validate() {
    const e: typeof errors = {}
    if (!fullName.trim()) e.fullName = 'Full name is required.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          full_name: fullName,
          roll_number: rollNumber,
          email,
          imei_number: imeiNumber
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      success('Student added')
      onAdded()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      toastError(msg)
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 150ms ease-out forwards' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.97); } to { transform: scale(1); } }
      `}</style>
      <div
        className="modal-card w-full overflow-y-auto"
        style={{ maxHeight: '90vh', animation: 'scaleIn 150ms ease-out forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">
          Add Student
        </h2>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Full Name */}
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="fullName" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Full Name <span style={{ color: 'var(--color-score-weak-text)' }}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Arjun Sharma"
              autoComplete="off"
              className="input-field"
              style={{ borderColor: errors.fullName ? 'var(--color-score-weak-text)' : undefined }}
              onFocus={(e) => {
                if (!errors.fullName) e.currentTarget.style.borderColor = 'var(--color-teal)';
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              onBlur={(e) => {
                if (!errors.fullName) e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            />
            {isLinked && (
              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--color-score-strong-text)' }}>
                <span style={{ display: 'inline-block', borderRadius: '4px', backgroundColor: 'var(--color-teal-light)' }}>
                  Existing student — records will be linked
                </span>
              </div>
            )}
            {errors.fullName && !isLinked && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-weak-text)', marginTop: '6px' }}>{errors.fullName}</p>
            )}

            {/* Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] shadow-lg overflow-y-auto"
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  maxHeight: '180px'
                }}
              >
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectIdentity(item)}
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-[var(--color-teal-light)] transition-colors"
                  >
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.full_name}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{item.email || 'No email'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roll Number */}
          <div>
            <label htmlFor="rollNumber" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Roll Number <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
            </label>
            <input
              id="rollNumber"
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 24"
              className="input-field"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="studentEmail" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Email <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
            </label>
            <input
              id="studentEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@email.com"
              className="input-field"
              style={{ marginBottom: '6px' }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Adding an email links this student's results across all exams and classes for long-term tracking.
            </p>
          </div>

          {/* IMEI Number */}
          <div>
            <label htmlFor="imeiNumber" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              IMEI Number <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
            </label>
            <input
              id="imeiNumber"
              type="text"
              value={imeiNumber}
              onChange={(e) => setImeiNumber(e.target.value)}
              placeholder="Device IMEI for identity verification"
              className="input-field"
            />
          </div>

          {errors.general && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-score-weak-text)' }}>{errors.general}</p>
          )}

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Adding…
                </>
              ) : (
                'Add student'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
