'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/ToastProvider'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function CreateClassModal({ onClose, onCreated }: Props) {
  const [syllabusType, setSyllabusType] = useState('')
  const [classStandard, setClassStandard] = useState('')
  const [section, setSection] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ syllabusType?: string; classStandard?: string; section?: string; general?: string }>({})
  const { success, error: toastError } = useToast()

  function validate() {
    const e: typeof errors = {}
    if (!syllabusType) e.syllabusType = 'Syllabus / Board is required.'
    if (!classStandard) e.classStandard = 'Class / Standard is required.'
    if (!section.trim()) e.section = 'Section is required.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})

    const generatedName = section.trim() ? `${classStandard} ${section.trim()}` : classStandard
    // Maintain backward compatibility for subject
    const dummySubject = 'N/A' 

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: generatedName, 
          subject: dummySubject, 
          syllabus_type: syllabusType,
          class_standard: classStandard,
          section: section.trim() || null,
          school_name: schoolName.trim() || null 
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      success('Class created successfully')
      onCreated()
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
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 150ms ease-out forwards' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.97); } to { transform: scale(1); } }
      `}</style>
      {/* Modal card */}
      <div
        className="card w-full"
        style={{ maxWidth: '480px', padding: '32px', animation: 'scaleIn 150ms ease-out forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
          Create a Class
        </h2>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Syllabus Type */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Syllabus / Board<span style={{ color: 'var(--color-score-weak-text)', marginLeft: '2px' }}> *</span>
            </label>
            <select
              value={syllabusType}
              onChange={(e) => setSyllabusType(e.target.value)}
              className="input-field"
              style={{ borderColor: errors.syllabusType ? 'var(--color-score-weak-text)' : undefined, cursor: 'pointer' }}
            >
              <option value="" disabled>Select syllabus...</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="TN State Board">TN State Board</option>
              <option value="Maharashtra State Board">Maharashtra State Board</option>
              <option value="Karnataka State Board">Karnataka State Board</option>
              <option value="Kerala State Board">Kerala State Board</option>
              <option value="AP State Board">AP State Board</option>
              <option value="Telangana State Board">Telangana State Board</option>
              <option value="UP State Board">UP State Board</option>
              <option value="IGCSE">IGCSE</option>
              <option value="IB">IB</option>
              <option value="Other">Other</option>
            </select>
            {errors.syllabusType && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-weak-text)', marginTop: '6px' }}>{errors.syllabusType}</p>}
          </div>

          {/* Class / Standard */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Class / Standard<span style={{ color: 'var(--color-score-weak-text)', marginLeft: '2px' }}> *</span>
            </label>
            <select
              value={classStandard}
              onChange={(e) => setClassStandard(e.target.value)}
              className="input-field"
              style={{ borderColor: errors.classStandard ? 'var(--color-score-weak-text)' : undefined, cursor: 'pointer' }}
            >
              <option value="" disabled>Select class...</option>
              {['5th Standard', '6th Standard', '7th Standard', '8th Standard', '9th Standard', '10th Standard', '11th Standard', '12th Standard'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.classStandard && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-weak-text)', marginTop: '6px' }}>{errors.classStandard}</p>}
          </div>

          {/* Section */}
          <Field
            id="section"
            label="Section"
            required={true}
            value={section}
            onChange={setSection}
            placeholder="e.g. A, B, C or Morning Batch"
            error={errors.section}
          />

          {/* School Name */}
          <div>
            <Field
              id="schoolName"
              label="School / Institution Name"
              value={schoolName}
              onChange={setSchoolName}
              placeholder="e.g. Montfort School, Home, or Tuition centre name"
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              For homeschool or tuition, just write 'Home' or your tuition centre name
            </p>
          </div>

          {/* General error */}
          {errors.general && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-score-weak-text)' }}>
              {errors.general}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
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
                  Creating…
                </>
              ) : (
                'Create Class'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Shared field ───────────────────────────────────────────
function Field({
  id, label, required = false, value, onChange, placeholder, error,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--color-score-weak-text)', marginLeft: '2px' }}> *</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ borderColor: error ? 'var(--color-score-weak-text)' : undefined }}
      />
      {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-weak-text)', marginTop: '6px' }}>{error}</p>}
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
