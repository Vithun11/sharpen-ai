'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import type { AnalysisResult } from '@/components/exam/UploadAnswerSheetModal'
import { uploadFileToStorage } from '@/lib/upload-to-storage'

interface Props {
  resultId: string
  studentName: string
  onClose: () => void
  onReplaced: (newResult: AnalysisResult) => void
}

export default function ReplaceSheetModal({ resultId, studentName, onClose, onReplaced }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { success } = useToast()

  function handleFileSelect(f: File) {
    setFile(f)
    setError(null)
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

  async function handleReplace() {
    if (!file) return
    setReplacing(true)
    setError(null)
    
    try {
      // Upload to Supabase Storage first (bypasses Vercel 4.5MB limit)
      const filePath = await uploadFileToStorage(
        'answer-sheets',
        `replace/${resultId}/${Date.now()}`,
        file
      )

      const res = await fetch(`/api/results/${resultId}/replace-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath, file_type: file.type }),
      })
      const text = await res.text()

      let json
      try {
        json = JSON.parse(text)
      } catch (err) {
        throw new Error('Server returned an HTML or invalid response. The app might have a build error or crashed. Check terminal.')
      }
      
      if (!res.ok) throw new Error(json?.error ?? 'Failed to replace answer sheet.')
      
      success('Answer sheet replaced and re-analyzed successfully!')
      onReplaced(json?.data)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 150ms ease-out forwards' }}
      onClick={(e) => { if (e.target === e.currentTarget && !replacing) onClose() }}
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
        <div className="px-8 pt-7 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="modal-title">
            Replace Answer Sheet for {studentName}
          </h2>
          <p className="px-3 py-2.5 rounded-[6px] flex items-start gap-2 mt-3" style={{ backgroundColor: 'var(--color-score-weak-bg)', color: 'var(--color-pink-dark)' }}>
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: '1.4' }}>Replacing will delete the current analysis and run a new one. This cannot be undone.</span>
          </p>
        </div>

        <div className="px-8 py-6 overflow-y-auto flex-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              onClick={() => !replacing && fileInputRef.current?.click()}
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
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border border-[var(--color-border)]">
                    <Upload size={20} color="var(--text-muted)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                      Drop new answer sheet here
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, JPG, PNG — up to 20 MB</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[6px] px-3 py-2.5" style={{ backgroundColor: 'var(--color-score-weak-bg)' }}>
                <AlertCircle size={15} color="var(--color-pink-dark)" className="flex-shrink-0 mt-0.5" />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-pink-dark)' }}>{error}</p>
              </div>
            )}

            {replacing && (
              <div className="flex items-center justify-center gap-3 rounded-[6px] px-4 py-3" style={{ backgroundColor: 'var(--color-teal-light)' }}>
                <Spinner color="var(--color-teal)" />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-teal)' }}>
                  Analyzing new answer sheet… (Takes ~30 seconds)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            disabled={replacing}
            className="btn-secondary"
            style={{ cursor: replacing ? 'not-allowed' : 'pointer', opacity: replacing ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={!file || replacing}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (!file || replacing) ? 0.7 : 1, backgroundColor: (!file || replacing) ? 'var(--color-score-weak-text)' : 'var(--color-score-weak-text)', cursor: (!file || replacing) ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={14} strokeWidth={2} />
            <span>Replace & Analyze</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner({ color = 'white' }: { color?: string }) {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
