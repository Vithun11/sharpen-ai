'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { uploadFilesToStorage } from '@/lib/upload-to-storage'

const LOADING_STEPS = [
  'Uploading answer sheet...',
  "Reading student's handwriting...",
  'Analyzing reasoning patterns...',
  'Generating cognitive profile...',
  'Almost done...',
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
  const [files, setFiles]       = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [stepIdx, setStepIdx]   = useState(0)
  const [error, setError]       = useState<string | null>(null)
  const fileInputRef            = useRef<HTMLInputElement>(null)
  const intervalRef             = useRef<NodeJS.Timeout | null>(null)

  // Cycle loading messages every 3s
  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1))
      }, 3000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setStepIdx(0)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
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
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[var(--color-teal-light)] rounded-[12px] border border-[var(--color-border)]">
              <div className="mb-5">
                <Spinner />
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {LOADING_STEPS[stepIdx]}
              </p>
              <div className="flex gap-1.5 mt-3 mb-2">
                {LOADING_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === stepIdx ? '24px' : '6px',
                      height: '6px',
                      backgroundColor: i <= stepIdx ? 'var(--color-teal)' : 'var(--color-border)',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
                AI analysis takes 10–20 seconds. Please wait…
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

function Spinner() {
  return (
    <div
      className="animate-spin rounded-full"
      style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-teal)' }}
    />
  )
}
