'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react'
import type { QuestionDifficulty } from '@/lib/types'
import { uploadFileToStorage } from '@/lib/upload-to-storage'

interface ExtractedQuestion {
  question_number: number
  question_text: string
  topic: string
  difficulty: QuestionDifficulty | string
  expected_method: string
}

interface Props {
  classId: string
  classSubject: string
  onClose: () => void
  onCreated: () => void
}

type Step = 1 | 2 | 3

const DIFFICULTY_STYLES: Record<string, { bg: string; color: string }> = {
  easy:   { bg: 'var(--color-teal-light)', color: 'var(--color-teal)' },
  medium: { bg: 'var(--color-score-mid-bg)', color: 'var(--color-yellow-dark)' },
  hard:   { bg: 'var(--color-score-weak-bg)', color: 'var(--color-pink-dark)' },
}

export default function CreateExamModal({ classId, classSubject, onClose, onCreated }: Props) {
  // Step 1 state
  const [step, setStep]       = useState<Step>(1)
  const [title, setTitle]     = useState('')
  const [subject, setSubject] = useState(classSubject)
  const [step1Errors, setStep1Errors] = useState<{ title?: string }>({})

  // Step 2 state
  const [file, setFile]             = useState<File | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3 state
  const [questions, setQuestions]         = useState<ExtractedQuestion[]>([])
  const [editingIdx, setEditingIdx]       = useState<number | null>(null)
  const [saving, setSaving]              = useState(false)
  const [saveError, setSaveError]        = useState<string | null>(null)

  // ── Step 1 → 2 ──────────────────────────────────────────
  function handleNextStep() {
    const errs: typeof step1Errors = {}
    if (!title.trim()) errs.title = 'Exam title is required.'
    if (Object.keys(errs).length > 0) { setStep1Errors(errs); return }
    setStep1Errors({})
    setStep(2)
  }

  // ── File handling ────────────────────────────────────────
  function handleFileSelect(f: File) {
    setFile(f)
    setExtractError(null)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Extract questions ────────────────────────────────────
  async function handleExtract() {
    if (!file) return
    setExtracting(true)
    setExtractError(null)

    try {
      // Upload to Supabase Storage first (bypasses Vercel 4.5MB limit)
      const filePath = await uploadFileToStorage(
        'question-papers',
        `temp/${Date.now()}`,
        file
      )

      const res = await fetch('/api/exams/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath, file_type: file.type }),
      })
      const text = await res.text()

      let json
      try {
        json = JSON.parse(text)
      } catch (err) {
        throw new Error('Server returned an invalid or HTML response. The application might have a build error or the Next.js server crashed.')
      }

      if (!res.ok) throw new Error(json?.error ?? 'Extraction failed.')
      if (!Array.isArray(json?.data) || json.data.length === 0) {
        throw new Error('No questions were found in this file. Please check the image quality.')
      }

      setQuestions(json.data)
      setStep(3)
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setExtracting(false)
    }
  }

  // ── Inline editing ────────────────────────────────────────
  function updateQuestion(idx: number, field: keyof ExtractedQuestion, value: string | number) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  // ── Save exam ─────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      let filePath: string | undefined
      if (file) {
        filePath = await uploadFileToStorage(
          'question-papers',
          `${classId}/${Date.now()}`,
          file
        )
      }

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          title,
          subject,
          questions,
          file_path: filePath,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.')
      onCreated()
      onClose()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 150ms ease-out forwards' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.97); } to { transform: scale(1); } }
      `}</style>
      <div
        className="modal-card w-full flex flex-col"
        style={{
          maxWidth: step === 3 ? '640px' : '500px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'scaleIn 150ms ease-out forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-7 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            {(['1', '2', '3'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-semibold"
                  style={{
                    backgroundColor: step > i + 1 ? 'var(--color-teal)' : step === i + 1 ? 'var(--color-teal-light)' : 'var(--color-teal-light)',
                    color: step > i + 1 ? 'var(--color-surface)' : step === i + 1 ? 'var(--color-teal)' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {step > i + 1 ? '✓' : s}
                </div>
                {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-border)' }} />}
              </div>
            ))}
          </div>
          <h2 className="modal-title">
            {step === 1 && 'Create an Exam'}
            {step === 2 && 'Upload Question Paper'}
            {step === 3 && 'Review Extracted Questions'}
          </h2>
          {step === 3 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {questions.length} questions extracted · Click any row to edit
            </p>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="px-8 py-6 overflow-y-auto flex-1">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  Exam Title <span style={{ color: 'var(--color-score-weak-text)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Exam — Chapter 3"
                  className="input-field"
                  style={{ borderColor: step1Errors.title ? 'var(--color-score-weak-text)' : undefined }}
                  onFocus={(e) => { if (!step1Errors.title) e.currentTarget.style.borderColor = 'var(--color-teal)'; }}
                  onBlur={(e) => { if (!step1Errors.title) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
                {step1Errors.title && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-weak-text)', marginTop: '6px' }}>{step1Errors.title}</p>}
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  Subject <span style={{ color: 'var(--color-score-weak-text)' }}>*</span>
                </label>
                <select
                  value={['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Tamil', 'Hindi', 'History', 'Geography', 'Social Science', 'Computer Science', 'Economics', 'Accountancy', 'Business Studies'].includes(subject) ? subject : subject ? 'Other' : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'Other') {
                      setSubject('') // Clear so they can type it
                    } else {
                      setSubject(val)
                    }
                  }}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="" disabled>Select subject...</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Hindi">Hindi</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Economics">Economics</option>
                  <option value="Accountancy">Accountancy</option>
                  <option value="Business Studies">Business Studies</option>
                  <option value="Other">Other</option>
                </select>

                {(!['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Tamil', 'Hindi', 'History', 'Geography', 'Social Science', 'Computer Science', 'Economics', 'Accountancy', 'Business Studies'].includes(subject) && subject !== '' || (!['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Tamil', 'Hindi', 'History', 'Geography', 'Social Science', 'Computer Science', 'Economics', 'Accountancy', 'Business Studies'].includes(subject) && document.activeElement === document.getElementById('other-subject-input'))) && (
                   <input
                     id="other-subject-input"
                     type="text"
                     value={subject}
                     onChange={(e) => setSubject(e.target.value)}
                     placeholder="Type subject name..."
                     className="input-field mt-3"
                   />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Drop zone */}
              <div
                className="relative cursor-pointer transition-colors duration-150"
                style={{
                  border: `2px dashed ${dragging ? 'var(--color-teal)' : file ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  borderRadius: '12px',
                  textAlign: 'center',
                  backgroundColor: dragging ? 'var(--color-teal-light)' : 'var(--color-teal-light)',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={onInputChange}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal-light)' }}>
                      <FileText size={24} color="var(--color-teal)" />
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{file.name}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>{formatBytes(file.size)}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--color-teal)', marginTop: '4px' }}>Click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)]">
                      <Upload size={20} color="var(--text-muted)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                        Drop your question paper here or click to browse
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, JPG, PNG — up to 20 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Extract error */}
              {extractError && (
                <div className="flex items-start gap-2 rounded-[6px] px-3 py-2.5" style={{ backgroundColor: 'var(--color-score-weak-bg)' }}>
                  <AlertCircle size={15} color="var(--color-pink-dark)" className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm" style={{ color: 'var(--color-pink-dark)' }}>{extractError}</p>
                </div>
              )}

              {/* Extracting loading state */}
              {extracting && (
                <div className="flex items-center gap-3 rounded-[6px] px-4 py-3" style={{ backgroundColor: 'var(--color-teal-light)' }}>
                  <Spinner color="var(--color-teal)" />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-teal)' }}>
                    Reading your question paper…
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-[6px] transition-all duration-150"
                  style={{
                    border: `1px solid ${editingIdx === idx ? 'var(--color-teal)' : 'var(--color-border)'}`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Question row — click to expand */}
                  <div
                    className="px-4 py-3 flex items-start gap-3 cursor-pointer"
                    style={{ backgroundColor: editingIdx === idx ? 'var(--color-teal-light)' : 'var(--color-surface)' }}
                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {q.question_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {q.question_text.length > 120 && editingIdx !== idx
                          ? q.question_text.slice(0, 120) + '…'
                          : q.question_text}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {q.topic && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--text-muted)', border: '1px solid var(--color-border)' }}>
                            {q.topic}
                          </span>
                        )}
                        {q.difficulty && DIFFICULTY_STYLES[q.difficulty] && (
                          <span
                            className="text-xs font-medium px-2 py-0.5"
                            style={{
                              borderRadius: '4px',
                              backgroundColor: DIFFICULTY_STYLES[q.difficulty].bg,
                              color: DIFFICULTY_STYLES[q.difficulty].color,
                            }}
                          >
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      color="var(--text-muted)"
                      className="flex-shrink-0 mt-0.5 transition-transform duration-150"
                      style={{ transform: editingIdx === idx ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  </div>

                  {/* Inline edit panel */}
                  {editingIdx === idx && (
                    <div className="px-4 pb-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                      <div>
                        <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Topic</label>
                        <input
                          type="text"
                          value={q.topic}
                          onChange={(e) => updateQuestion(idx, 'topic', e.target.value)}
                          className="input-field"
                          style={{ height: 'auto' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Difficulty</label>
                        <select
                          value={q.difficulty}
                          onChange={(e) => updateQuestion(idx, 'difficulty', e.target.value)}
                          className="input-field"
                          style={{ height: 'auto', cursor: 'pointer' }}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {saveError && (
                <div className="flex items-start gap-2 rounded-[6px] px-3 py-2.5" style={{ backgroundColor: 'var(--color-score-weak-bg)' }}>
                  <AlertCircle size={15} color="var(--color-pink-dark)" className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm" style={{ color: 'var(--color-pink-dark)' }}>{saveError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}
        >
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as Step)}
            className="btn-secondary"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <button onClick={handleNextStep} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Next
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleExtract}
                disabled={!file || extracting}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (!file || extracting) ? 0.7 : 1 }}
              >
                {extracting ? (<><Spinner /><span>Extracting…</span></>) : (
                  <><CheckCircle size={16} strokeWidth={2} /><span>Extract Questions</span></>
                )}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? (<><Spinner /><span>Saving…</span></>) : (
                  <><CheckCircle size={16} strokeWidth={2} /><span>Confirm & Save Exam</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner({ color = 'white' }: { color?: string }) {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
