'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, BarChart2, CheckCircle2, FileText, Eye, RefreshCw } from 'lucide-react'
import UploadAnswerSheetModal, { type AnalysisResult } from '@/components/exam/UploadAnswerSheetModal'
import LightboxModal from '@/components/ui/LightboxModal'
import ReplacePaperModal from '@/components/exam/ReplacePaperModal'
import ReplaceSheetModal from '@/components/exam/ReplaceSheetModal'
import { useToast } from '@/components/ui/ToastProvider'
import { createBrowserClient } from '@supabase/ssr'

interface Exam {
  id: string
  title: string
  subject: string
  total_questions: number
  question_paper_url?: string | null
  created_at: string
}

interface Student {
  id: string
  full_name: string
  roll_number?: string | null
}

interface Question {
  id: string
  question_number: number
  question_text: string
  topic?: string | null
  difficulty?: string | null
}

interface StudentResult {
  id: string
  student_id: string
  score_percentage: number
  correct_answers: number
  answer_sheet_url?: string | null
  analyzed_at: string
  overall_confidence?: number
}

type ResultMap = Record<string, StudentResult>
type StatusMap = Record<string, 'processing'>

interface Props {
  exam: Exam
  className: string
  classId: string
  questions: Question[]
  students: Student[]
  initialResultMap: ResultMap
  syllabusType?: string | null
  classStandard?: string | null
}

function getStatus(studentId: string, resultMap: ResultMap, statusMap: StatusMap) {
  if (statusMap[studentId]) return 'processing'
  if (resultMap[studentId]) return 'analyzed'
  return 'not_analyzed'
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parseSheetUrls(
  raw: string | null
): string[] {
  if (!raw) return []
  
  let paths: string[] = []
  
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      paths = parsed
    } else {
      paths = [raw]
    }
  } catch {
    paths = [raw]
  }
  
  return paths.map(path => {
    const { data } = supabase.storage
      .from('answer-sheets')
      .getPublicUrl(path)
    return data.publicUrl
  })
}

export default function ExamDetailClient({ exam, className, classId, questions, students, initialResultMap, syllabusType, classStandard }: Props) {
  const [resultMap, setResultMap] = useState<ResultMap>(initialResultMap)
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [uploadModal, setUploadModal] = useState<{ studentId: string; studentName: string } | null>(null)
  
  // New modal states
  const [lightboxInfo, setLightboxInfo] = useState<{ url: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const [showQuestionsOverlay, setShowQuestionsOverlay] = useState(false)
  const [showReplacePaper, setShowReplacePaper] = useState(false)
  const [replaceSheetModal, setReplaceSheetModal] = useState<{ resultId: string; studentName: string } | null>(null)
  
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions)
  const [qpUrl, setQpUrl] = useState(exam.question_paper_url)
  
  const { success } = useToast()

  function handleAnalyzed(studentId: string, result: AnalysisResult) {
    setResultMap((prev) => ({
      ...prev,
      [studentId]: {
        id: result.result_id,
        student_id: studentId,
        score_percentage: result.score_percentage,
        correct_answers: result.correct_answers,
        answer_sheet_url: result.result_id ? resultMap[studentId]?.answer_sheet_url : undefined, // Handled properly on reload or if returned from API
        analyzed_at: new Date().toISOString(),
        overall_confidence: result.overall_confidence,
      },
    }))
    setStatusMap((prev) => { const n = { ...prev }; delete n[studentId]; return n })
    success('Analysis complete! Report is ready.')
    setUploadModal(null)
  }

  function startUpload(student: Student) {
    setStatusMap((prev) => ({ ...prev, [student.id]: 'processing' }))
    setUploadModal({ studentId: student.id, studentName: student.full_name })
  }

  function cancelUpload(studentId: string) {
    setStatusMap((prev) => { const n = { ...prev }; delete n[studentId]; return n })
    setUploadModal(null)
  }

  const analyzedCount = Object.keys(resultMap).length
  const pct = students.length > 0 ? Math.round((analyzedCount / students.length) * 100) : 0

  return (
    <div>
      {/* Breadcrumb */}
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Link href="/classes" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:text-[var(--color-primary)] transition-colors duration-150">Classes</Link>
        <span>/</span>
        <Link href={`/classes/${classId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:text-[var(--color-primary)] transition-colors duration-150">{className}</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)' }}>{exam.title}</span>
      </p>

      {/* Exam header (No card) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FileText size={20} color="var(--color-cognitive-text)" strokeWidth={1.8} style={{ marginTop: '2px' }} />
            <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '28px', color: 'var(--text-primary)' }}>
              {exam.title}
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
            {exam.subject} · {exam.total_questions} questions ·{' '}
            {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{analyzedCount}/{students.length}</span> analyzed
          </p>
          <div style={{ width: '140px', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-teal)', borderRadius: '99px', transition: 'width 500ms ease-out' }}
            />
          </div>
        </div>
      </div>

      {/* Exam Files Section */}
      <div className="card" style={{ padding: '0', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-teal-light)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            EXAM FILES
          </p>
        </div>

        {/* Row 1 — Question Paper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '25%' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Question Paper</span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
              {qpUrl ? qpUrl.split('/').pop() : 'Not uploaded'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            {qpUrl ? (
              <>
                <button
                  onClick={() => setLightboxInfo({ url: qpUrl, type: qpUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image', title: `${exam.title} - Question Paper` })}
                  className="btn-secondary btn-sm no-print"
                >
                  <Eye size={14} style={{ marginRight: '6px' }} /> View
                </button>
                <button 
                  onClick={() => setShowReplacePaper(true)} 
                  className="btn-ghost btn-sm no-print"
                >
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Replace
                </button>
              </>
            ) : (
              <button onClick={() => setShowReplacePaper(true)} className="btn-primary btn-sm no-print">
                <Upload size={14} style={{ marginRight: '6px' }} /> Upload
              </button>
            )}
          </div>
        </div>
        
        {/* Row 2 — Extracted Questions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '25%' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Questions</span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>
              {localQuestions.length} questions extracted
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowQuestionsOverlay(true)}
              className="btn-secondary btn-sm no-print"
            >
              <Eye size={14} style={{ marginRight: '6px' }} /> View Questions
            </button>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Students ({students.length})
        </h2>

        {students.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 0', border: '1px dashed var(--color-border)', borderRadius: '10px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>No students in this class yet.</p>
            <Link href={`/classes/${classId}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}>
              Add students →
            </Link>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '2px solid var(--color-border)' }}>
                  {['Student', 'Status', 'Score', 'Action'].map((col) => (
                    <th key={col} style={{ padding: '14px 20px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const status = getStatus(student.id, resultMap, statusMap)
                  const result = resultMap[student.id]

                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 150ms',
                        verticalAlign: 'middle',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name */}
                      <td style={{ padding: '18px 20px', minHeight: '72px' }}>
                        <Link href={`/classes/${classId}/students/${student.id}/history`} style={{ textDecoration: 'none' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', display: 'block', marginBottom: '3px', transition: 'color 150ms' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>{student.full_name}</span>
                        </Link>
                        {student.roll_number && (
                          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                            {student.roll_number}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '18px 20px' }}>
                        {status === 'analyzed' && (
                          <span 
                            title={result?.overall_confidence !== undefined && result.overall_confidence < 70 ? "Low confidence — manual check needed" : result?.overall_confidence !== undefined && result.overall_confidence < 90 ? "Some handwriting unclear" : ""}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              background: result?.overall_confidence !== undefined && result.overall_confidence < 70 ? 'var(--color-score-mid-bg)' : 'var(--color-teal-light)', 
                              color: result?.overall_confidence !== undefined && result.overall_confidence < 70 ? 'var(--color-yellow-dark)' : 'var(--color-teal-dark)', 
                              padding: '5px 12px', 
                              borderRadius: '20px', 
                              fontFamily: 'var(--font-body)', 
                              fontWeight: 500, 
                              fontSize: '13px' 
                            }}
                          >
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: result?.overall_confidence !== undefined && result.overall_confidence < 70 ? 'var(--color-yellow-dark)' : 'var(--color-teal-dark)', flexShrink: 0 }} /> 
                            Analyzed
                            {result?.overall_confidence !== undefined && result.overall_confidence < 70 && (
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-score-weak-text)', marginLeft: '2px' }} />
                            )}
                            {result?.overall_confidence !== undefined && result.overall_confidence >= 70 && result.overall_confidence < 90 && (
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-score-mid-text)', marginLeft: '2px' }} />
                            )}
                          </span>
                        )}
                        {status === 'processing'   && <span className="badge-amber"><div className="loader inline-block" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Processing…</span>}
                        {status === 'not_analyzed' && <span className="badge-pending">Not analyzed</span>}
                      </td>

                      {/* Score */}
                      <td style={{ padding: '18px 20px' }}>
                        {result ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                              {result.score_percentage.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: '14px' }}>—</span>
                        )}
                      </td>

                      {/* Action button */}
                      <td style={{ padding: '18px 20px' }}>
                        {status === 'analyzed' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Link
                              href={`/classes/${classId}/exams/${exam.id}/results/${student.id}`}
                              className="btn-primary btn-sm no-print"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            >
                              <BarChart2 size={14} strokeWidth={2} />
                              View Report
                            </Link>
                            {result?.answer_sheet_url && (
                              <button
                                onClick={() => setLightboxInfo({ url: result.answer_sheet_url as string, type: result.answer_sheet_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image', title: `${student.full_name} - Answer Sheet` })}
                                className="btn-ghost btn-sm no-print"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={14} /> Sheet
                              </button>
                            )}
                            <button
                              onClick={() => setReplaceSheetModal({ resultId: result!.id, studentName: student.full_name })}
                              className="btn-ghost btn-sm no-print"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Replace Sheet"
                            >
                              <RefreshCw size={14} /> Replace
                            </button>
                          </div>
                        ) : status === 'processing' ? (
                          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-yellow-dark)' }}>Analyzing…</span>
                        ) : (
                          <button
                            onClick={() => startUpload(student)}
                            className="btn-primary btn-sm no-print"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Upload size={14} strokeWidth={2} />
                            Upload Sheet
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals and Overlays */}
      {uploadModal && (
        <UploadAnswerSheetModal
          studentId={uploadModal.studentId}
          studentName={uploadModal.studentName}
          examId={exam.id}
          onClose={() => cancelUpload(uploadModal.studentId)}
          onAnalyzed={(result) => handleAnalyzed(uploadModal.studentId, result)}
        />
      )}

      {showReplacePaper && (
        <ReplacePaperModal
          examId={exam.id}
          onClose={() => setShowReplacePaper(false)}
          onReplaced={(newQuestions, newUrl) => {
            setLocalQuestions(newQuestions as any)
            setQpUrl(newUrl)
          }}
        />
      )}

      {replaceSheetModal && (
        <ReplaceSheetModal
          resultId={replaceSheetModal.resultId}
          studentName={replaceSheetModal.studentName}
          onClose={() => setReplaceSheetModal(null)}
          onReplaced={(newResult) => {
            // We just trigger a fast reload here to refresh state fully, since updating the row is complex without real time
            window.location.reload()
          }}
        />
      )}

      <LightboxModal
        isOpen={lightboxInfo !== null}
        onClose={() => setLightboxInfo(null)}
        fileUrls={parseSheetUrls(lightboxInfo?.url ?? '')}
        fileType={lightboxInfo?.type ?? 'image'}
        title={lightboxInfo?.title ?? 'Viewing File'}
      />

      {/* Extracted Questions Modal Overlay */}
      {showQuestionsOverlay && (
        <div className="modal-overlay" onClick={() => setShowQuestionsOverlay(false)}>
          <div className="modal-card" style={{ maxWidth: '600px', width: '95vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="modal-title">Extracted Questions</h2>
              <button onClick={() => setShowQuestionsOverlay(false)} className="btn-ghost btn-sm">✕</button>
            </div>
            <div>
              {localQuestions.map((q) => {
                const diffStyle: Record<string, { bg: string; color: string }> = {
                  easy:   { bg: 'var(--color-score-strong-bg)', color: 'var(--color-green-dark)' },
                  medium: { bg: 'var(--color-score-mid-bg)', color: 'var(--color-yellow-dark)' },
                  hard:   { bg: 'var(--color-score-weak-bg)', color: 'var(--color-pink-dark)' },
                }
                const d = diffStyle[q.difficulty ?? ''] ?? { bg: 'var(--color-teal-light)', color: 'var(--text-muted)' }
                return (
                  <div key={q.id || Math.random()} className="flex gap-3" style={{ padding: '16px 0', borderBottom: '1px solid var(--color-border)', fontSize: '14px', lineHeight: 1.6 }}>
                    <div className="w-7 h-7 flex-shrink-0 bg-[var(--color-teal-light)] flex items-center justify-center rounded font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                      {q.question_number}
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{q.question_text}</p>
                      <div className="flex gap-2">
                        {q.topic && <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--text-muted)' }}>{q.topic}</span>}
                        {q.difficulty && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: d.bg, color: d.color }}>{q.difficulty}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
