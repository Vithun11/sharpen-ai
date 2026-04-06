'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, Zap } from 'lucide-react'
import { uploadFilesToStorage } from '@/lib/upload-to-storage'

const LOADING_STEPS = [
  'Uploading answer sheet...',
  "Reading student's handwriting...",
  'Analyzing reasoning patterns...',
  'Building cognitive profile...',
  'Cross-referencing question bank...',
  'Generating insights...',
  'Finalizing report...',
]

const INTERESTING_FACTS = [
  { emoji: '🧠', fact: 'Spaced repetition can improve long-term retention by up to 80% compared to cramming.' },
  { emoji: '✍️', fact: 'Handwriting analysis can reveal cognitive load — denser, messier writing often signals higher mental effort.' },
  { emoji: '📊', fact: 'Research shows immediate, specific feedback after a test improves learning outcomes more than the score alone.' },
  { emoji: '🔍', fact: 'AI can detect subtle error patterns across hundreds of answers that human graders might miss in large classrooms.' },
  { emoji: '💡', fact: 'Students who understand *why* they got a question wrong learn 40% more effectively than those who only see the correct answer.' },
  { emoji: '🎯', fact: 'Targeted remediation based on topic-level weaknesses can raise scores by 15–25% in a single revision cycle.' },
  { emoji: '📝', fact: 'The average teacher spends 8+ hours per week on grading. AI-assisted grading can reclaim that time for teaching.' },
  { emoji: '🌱', fact: 'A growth mindset — believing ability can improve — is one of the strongest predictors of academic success.' },
  { emoji: '📚', fact: 'Interleaved practice (mixing topics) leads to better mastery than blocked practice, even though it feels harder.' },
  { emoji: '🤖', fact: 'Modern AI can process handwritten text almost as accurately as trained human readers — at 100× the speed.' },
]

interface Props {
  studentId: string
  studentName: string
  examId: string
  onClose: () => void
  onAnalyzed: (result: AnalysisResult) => void
}

export interface AnalysisResult {
  result_id: string
  score_percentage: number
  correct_answers: number
  total_questions: number
  analysis: Record<string, unknown>
  overall_confidence?: number
}

export default function UploadAnswerSheetModal({ studentId, studentName, examId, onClose, onAnalyzed }: Props) {
  const [files, setFiles]         = useState<File[]>([])
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [stepIdx, setStepIdx]     = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [showExtended, setShowExtended] = useState(false)
  const [factIdx, setFactIdx]     = useState(0)
  const [factVisible, setFactVisible] = useState(true)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const intervalRef               = useRef<NodeJS.Timeout | null>(null)
  const extendedTimeoutRef        = useRef<NodeJS.Timeout | null>(null)
  const factIntervalRef           = useRef<NodeJS.Timeout | null>(null)

  // Cycle loading step messages every 4s (loop on last step)
  // After 30s: reveal the extra-computation banner + rotating facts
  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setStepIdx((i) => (i < LOADING_STEPS.length - 1 ? i + 1 : i))
      }, 4000)
      // After 30s, show extended mode (banner + facts)
      extendedTimeoutRef.current = setTimeout(() => {
        setShowExtended(true)
        // Start rotating facts once extended mode kicks in
        factIntervalRef.current = setInterval(() => {
          setFactVisible(false)
          setTimeout(() => {
            setFactIdx((i) => (i + 1) % INTERESTING_FACTS.length)
            setFactVisible(true)
          }, 400)
        }, 6000)
      }, 30000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (extendedTimeoutRef.current) clearTimeout(extendedTimeoutRef.current)
      if (factIntervalRef.current) clearInterval(factIntervalRef.current)
      setStepIdx(0)
      setShowExtended(false)
      setFactIdx(0)
      setFactVisible(true)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (extendedTimeoutRef.current) clearTimeout(extendedTimeoutRef.current)
      if (factIntervalRef.current) clearInterval(factIntervalRef.current)
    }
  }, [loading])

  function handleFileSelect(selectedFiles: FileList | File[]) {
    const newFiles = Array.from(selectedFiles)
    
    if (files.length + newFiles.length > 20) {
      setError('Maximum 20 pages allowed')
      return
    }
    
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]
      const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!ALLOWED.includes(f.type)) {
        setError('Only JPG, PNG, and PDF files are accepted.')
        return
      }
      if (f.size > 20 * 1024 * 1024) {
        setError(`Page ${files.length + i + 1} exceeds 20MB limit`)
        return
      }
    }
    
    setError(null)
    setFiles(prev => [...prev, ...newFiles])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleAnalyze() {
    if (files.length === 0) {
      setError('Please upload at least one page')
      return
    }
    setError(null)
    setLoading(true)

    try {
      // Step 1: Upload files directly to Supabase Storage (bypasses Vercel 4.5MB limit)
      const storagePaths = await uploadFilesToStorage(
        'answer-sheets',
        `${examId}/${studentId}`,
        files
      )

      // Step 2: Send only the storage paths to the API (tiny JSON payload)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          exam_id: examId,
          storage_paths: storagePaths,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Analysis failed. Please try again.')
        setLoading(false)
        return
      }

      onAnalyzed(json.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please check your connection.'
      setError(msg)
      setLoading(false)
    }
  }

  function formatBytes(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 150ms ease-out forwards' }}
      onClick={(e) => { if (!loading && e.target === e.currentTarget) onClose() }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.97); } to { transform: scale(1); } }
      `}</style>
      <div
        className="modal-card w-full flex flex-col"
        style={{ maxHeight: '90vh', overflow: 'hidden', animation: 'scaleIn 150ms ease-out forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="modal-title">
              Upload Answer Sheet
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{studentName}</p>
          </div>
          {!loading && (
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-teal-light)] transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6 overflow-y-auto flex-1">
          {loading ? (
            /* ── Dynamic Loading State ── */
            <div className="flex flex-col items-center py-6 text-center">
              <style>{`
                @keyframes spin-ring { to { stroke-dashoffset: -220; } }
                @keyframes pulse-badge { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.03); } }
                .ring-track { stroke: var(--color-border); }
                .ring-fill  { stroke: var(--color-teal); stroke-dasharray: 176 220; stroke-dashoffset: 0; animation: spin-ring 1.8s linear infinite; transform-origin: center; transform-box: fill-box; }
              `}</style>

              {/* SVG Progress Ring */}
              <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 20 }}>
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ transform: 'rotate(-90deg)' }}>
                  <circle className="ring-track" cx="36" cy="36" r="28" strokeWidth="5" fill="none" />
                  <circle className="ring-fill"  cx="36" cy="36" r="28" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-teal)', opacity: 0.5 }} />
                </div>
              </div>

              {/* Step text */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', minHeight: '24px' }}>
                {LOADING_STEPS[stepIdx]}
              </p>

              {/* Step dots */}
              <div className="flex gap-1.5 mb-5">
                {LOADING_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === stepIdx ? '22px' : '6px',
                      height: '6px',
                      backgroundColor: i <= stepIdx ? 'var(--color-teal)' : 'var(--color-border)',
                    }}
                  />
                ))}
              </div>

              {/* "Taking extra computation" banner — appears after 30s */}
              {showExtended && (
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    backgroundColor: 'var(--color-score-mid-bg)',
                    border: '1px solid var(--color-yellow)',
                    borderRadius: '10px', padding: '10px 14px',
                    marginBottom: '16px', width: '100%', textAlign: 'left',
                    animation: 'pulse-badge 2.4s ease-in-out infinite',
                  }}
                >
                  <Zap size={16} color="var(--color-yellow-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--color-yellow-dark)', marginBottom: '2px' }}>
                      Taking a little extra computation
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-score-mid-text)', lineHeight: 1.5 }}>
                      Complex handwriting or multi-page sheets take longer. Hang tight — we're almost there!
                    </p>
                  </div>
                </div>
              )}

              {/* Rotating interesting fact card — only after 30s */}
              {showExtended && (
                <div
                  style={{
                    backgroundColor: 'var(--color-teal-light)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px', padding: '14px 16px',
                    width: '100%', textAlign: 'left',
                    transition: 'opacity 400ms ease, transform 400ms ease',
                    opacity: factVisible ? 1 : 0,
                    transform: factVisible ? 'translateY(0)' : 'translateY(6px)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-teal)', marginBottom: '6px' }}>
                    💡 Did you know?
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    <span style={{ fontSize: '16px', marginRight: '6px' }}>{INTERESTING_FACTS[factIdx].emoji}</span>
                    {INTERESTING_FACTS[factIdx].fact}
                  </p>
                </div>
              )}

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-faint)', marginTop: '14px' }}>
                AI analysis may take up to a minute. Please don't close this window.
              </p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className="relative cursor-pointer transition-colors duration-150"
                style={{
                  border: `2px dashed ${dragging ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  borderRadius: '12px',
                  textAlign: 'center',
                  backgroundColor: dragging ? 'var(--color-teal-light)' : 'var(--color-background)',
                  padding: '32px 20px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files) }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] mb-3">
                    <Upload size={20} color="var(--text-muted)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Drop answer sheet here or click to browse
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Upload all pages of the answer sheet. Select multiple images or one PDF.</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>JPG, PNG (multiple) or PDF · Max 20MB per file · Max 20 pages</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' }}>Tip: Use DocScanner → Share → Save as PDF for multi-page booklets</p>
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-sm text-[#1F8F8A] mb-1">
                    {files.length} page{files.length > 1 ? 's' : ''} ready to upload
                  </p>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#E6F7F7] rounded text-sm">
                      <span className="text-[#1F8F8A]" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                        Page {i + 1} · {f.name}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="text-[#D4607E] text-xs ml-2 hover:bg-[#FBE8EC] p-1 rounded"
                        title="Remove page"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-[6px] px-3 py-2.5 mt-4" style={{ backgroundColor: 'var(--color-score-weak-bg)' }}>
                  <AlertCircle size={15} color="var(--color-pink-dark)" className="flex-shrink-0 mt-0.5 mb-0" />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-pink-dark)' }}>{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="modal-footer">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0}
              className="btn-primary"
              style={{
                opacity: files.length === 0 ? 0.7 : 1,
                cursor: files.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Analyze Answer Sheet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

