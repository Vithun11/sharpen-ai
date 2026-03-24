'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { StudentWithResult } from '@/lib/types'

import { CheckCircle2, AlertTriangle } from 'lucide-react'
import StudentPromptGenerator from '@/components/student/StudentPromptGenerator'

// Reused helper functions from individual report
function statColour(pct: number): string {
  if (pct < 50) return 'var(--color-score-weak-text)'
  if (pct < 75) return 'var(--color-score-mid-text)'
  if (pct < 90) return 'var(--color-teal)'
  return 'var(--color-teal-dark)'
}

function topicColour(pct: number): string {
  if (pct < 50) return 'var(--color-score-weak-text)'
  if (pct < 75) return 'var(--color-score-mid-text)'
  return 'var(--color-teal)'
}

function humanStyle(style: string): string {
  const map: Record<string, string> = {
    sequential_logical: 'Sequential Logical Solver',
    formula_driven:     'Formula-Driven Solver',
    visual_thinker:     'Visual Thinker',
    trial_and_error:    'Trial & Error Explorer',
    intuitive:          'Intuitive Problem Solver',
  }
  return map[style] ?? style.replace(/_/g, ' ')
}

function styleTraits(style: string): string[] {
  const map: Record<string, string[]> = {
    sequential_logical: ['Works through problems step-by-step', 'Strong at structured proof-based questions', 'Benefits from organised practice sets'],
    formula_driven:     ['Relies on memorised formulas', 'Struggles when formula is unavailable', 'Needs concept-first teaching approach'],
    visual_thinker:     ['Understands diagrams and visuals quickly', 'Benefits from graph-based explanations', 'May struggle with purely algebraic problems'],
    trial_and_error:    ['Explores multiple approaches', 'Resilient and persistent', 'Can improve with systematic strategy training'],
    intuitive:          ['Grasps concepts quickly', 'May skip intermediate steps', 'Benefits from being asked to show full working'],
  }
  return map[style] ?? ['Asks for more detailed analysis', 'Encourage practice variety', 'Review individual question results']
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
      {children}
    </p>
  )
}

function HBar({ label, pct, colour }: { label: string; pct: number; colour: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colour, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function StudentHistoryPage() {
  const params = useParams()
  const classId = params.classId as string
  const studentId = params.studentId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
    student: any,
    results: any[],
    combined_analysis: any,
    all_exams: any[]
  } | null>(null)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/students/${studentId}/history`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch history')
        setData(json.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [studentId])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading history...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <div className="text-sm font-medium" style={{ color: 'var(--color-score-weak-text)' }}>{error}</div>
        <Link href={`/classes/${classId}`}>
          <button className="btn-secondary px-4 py-2">Back to Class</button>
        </Link>
      </div>
    )
  }

  const { student, results, combined_analysis, all_exams } = data
  const hasMultipleExams = results.length > 1
  const completedResults = results.filter((r) => r.analysis_json)

  const printReport = () => window.print()

  return (
    <div className="max-w-[800px] mx-auto pb-24">
      {/* HEADER BLOCK */}
      <div className="mb-8 pt-4">
        <Link 
          href={`/classes/${classId}`} 
          className="inline-flex items-center text-sm font-medium mb-4 hover:underline no-print" 
          style={{ color: 'var(--text-muted)' }}
        >
          ← {student.class?.name || 'Class Details'}
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">
              {student.full_name}
            </h1>
            {(student.email || student.imei_number) && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {student.email} {student.email && student.imei_number && '•'} {student.imei_number}
              </p>
            )}
            {student.identity_id && (
              <div className="mt-3 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded no-print" style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-dark)' }}>
                Records linked across multiple exams
              </div>
            )}
          </div>
          <button onClick={printReport} className="btn-secondary px-4 py-2 text-sm no-print">
            Download Report
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-header">
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}><span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span> — Student Learning Report</h2>
        <p><strong>Student:</strong> {student.full_name} {student.roll_number ? `(#${student.roll_number})` : ''}</p>
        <p><strong>Class:</strong> {student.class?.name || 'Class Record'}</p>
        <p><strong>Date Generated:</strong> {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {combined_analysis && combined_analysis.total_exams_taken === 1 && (
        <div className="no-print mb-6" style={{ background: 'var(--color-score-mid-bg)', border: '1px solid var(--color-score-mid-text)', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: 'var(--color-yellow-dark)' }}>
          This student has 1 exam on record. Combined projections and trend analysis will appear after 2 or more exams.
        </div>
      )}

      <div className="space-y-6">
        {/* SECTION 1 — SCORE TIMELINE */}
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Score History</h2>
          {results.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No exams taken yet.</p>
          ) : (
            <div className="w-full">
               <div className="relative w-full h-40 border-b border-l border-gray-200 mt-2 mb-8">
                 <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    {results.map((r: any, i: number, arr: any[]) => {
                      if (i === 0) return null
                      const prev = arr[i - 1]
                      const x1 = `${((i - 1) / Math.max(1, arr.length - 1)) * 100}%`
                      const y1 = `${100 - (prev.score_percentage || 0)}%`
                      const x2 = `${(i / Math.max(1, arr.length - 1)) * 100}%`
                      const y2 = `${100 - (r.score_percentage || 0)}%`
                      return (
                        <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-border)" strokeWidth="2" />
                      )
                    })}
                    {results.map((r: any, i: number, arr: any[]) => {
                      const cx = `${(i / Math.max(1, arr.length - 1)) * 100}%`
                      const cy = `${100 - (r.score_percentage || 0)}%`
                      const score = r.score_percentage || 0
                      const color = score > 75 ? 'var(--color-score-strong-text)' : score >= 50 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'
                      return (
                        <g key={`point-${i}`}>
                          <circle cx={cx} cy={cy} r="5" fill={color} />
                          <text x={cx} y={`calc(${cy} - 12px)`} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)" className="font-mono">
                            {score}%
                          </text>
                          <text x={cx} y="calc(100% + 20px)" textAnchor={i === 0 && arr.length > 1 ? "start" : i === arr.length - 1 && arr.length > 1 ? "end" : "middle"} fontSize="11" fill="var(--text-muted)">
                            {r.exam?.title}
                          </text>
                        </g>
                      )
                    })}
                 </svg>
               </div>
               {!hasMultipleExams && <p className="text-sm text-center mt-8" style={{ color: 'var(--text-muted)' }}>Take more exams to see a trend</p>}
               {combined_analysis?.improvement_trend && hasMultipleExams && (
                 <p className="text-sm text-center font-medium mt-8 capitalize" style={{ color: 'var(--color-teal)' }}>
                   Trend: {combined_analysis.improvement_trend}
                 </p>
               )}
            </div>
          )}
        </div>



        {combined_analysis && (
          <>
            {/* SECTION 2 — COMBINED COGNITIVE PROFILE */}
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                Average Cognitive Profile <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(across {combined_analysis.total_exams_taken} exams)</span>
              </h2>
              <div className="space-y-5">
                {[
                  { label: 'Concept Understanding', val: combined_analysis.cognitive_profile_avg?.conceptual_clarity ?? combined_analysis.concept_understanding_avg ?? 0 },
                  { label: 'Logical Reasoning', val: combined_analysis.cognitive_profile_avg?.analytical_thinking ?? combined_analysis.logical_reasoning_avg ?? 0 },
                  { label: 'Calculation Accuracy', val: combined_analysis.cognitive_profile_avg?.procedural_accuracy ?? combined_analysis.calculation_accuracy_avg ?? 0 },
                  { label: 'Method Consistency', val: combined_analysis.cognitive_profile_avg?.consistency_index ?? combined_analysis.method_consistency_avg ?? 0 }
                ].map((stat, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stat.label}</span>
                      <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{stat.val}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-teal-light)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${stat.val}%`, backgroundColor: stat.val > 75 ? 'var(--color-score-strong-text)' : stat.val >= 60 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3 — TOPIC MASTERY OVER TIME */}
            <div className="card overflow-hidden">
              <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Topic Mastery History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr className="table-header-row">
                      <th>Topic</th>
                      {results.map((r: any, i: number) => (
                        <th key={i} className="text-center">Exam {i + 1}</th>
                      ))}
                      <th className="text-right">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(combined_analysis.all_topic_mastery || {}).map(([topic, avg]: [string, any], idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{topic}</td>
                        {results.map((r: any, i: number) => {
                          const val = r.analysis_json?.topic_mastery?.[topic]
                          const bg = val > 75 ? 'var(--color-score-strong-bg)' : val >= 50 ? 'var(--color-score-mid-bg)' : val !== undefined ? 'var(--color-score-weak-bg)' : 'transparent'
                          const fg = val > 75 ? 'var(--color-score-strong-text)' : val >= 50 ? 'var(--color-score-mid-text)' : val !== undefined ? 'var(--color-score-weak-text)' : 'var(--text-muted)'
                          return (
                            <td key={i} className="px-4 py-4 text-center font-mono" style={{ backgroundColor: bg, color: fg }}>
                              {val !== undefined ? `${val}%` : '—'}
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{avg}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4 — COMBINED STRENGTHS AND WEAKNESSES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Persistent Strengths</h2>
                <ul className="space-y-3">
                  {(combined_analysis.all_strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--color-score-strong-text)' }}>★</span> <span>{s}</span>
                    </li>
                  ))}
                  {!combined_analysis.all_strengths?.length && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>No clear strengths identified yet.</li>}
                </ul>
              </div>
              <div className="card p-6">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Areas Needing Work</h2>
                <ul className="space-y-3">
                  {(combined_analysis.all_weaknesses || []).map((w: string, i: number) => (
                    <li key={i} className="text-sm flex justify-between gap-2 border-b pb-2 last:border-0" style={{ borderColor: 'var(--color-border)', color: 'var(--text-primary)' }}>
                      <span>{w}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-score-mid-bg)', color: 'var(--color-score-mid-text)' }}>Recurring</span>
                    </li>
                  ))}
                  {!combined_analysis.all_weaknesses?.length && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>No recurring weaknesses.</li>}
                </ul>
              </div>
            </div>

            {/* SECTION 5 — MISTAKE PATTERN HISTORY */}
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recurring Mistakes</h2>
              <div className="space-y-3">
                {(combined_analysis.recurring_mistakes || []).map((m: string, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm p-3 rounded border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-teal-light)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{m}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-score-weak-bg)', color: 'var(--color-score-weak-text)' }}>Persistent</span>
                  </div>
                ))}
                {!combined_analysis.recurring_mistakes?.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No major recurring mistakes.</p>}
              </div>
            </div>

            {/* SECTION 6 — FUTURE PROJECTION */}
            <div className="card p-6" style={{ backgroundColor: 'var(--color-score-strong-bg)', borderColor: 'var(--color-score-strong-text)' }}>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-teal)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>
                </svg>
                Projected Performance
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {combined_analysis.future_projection && combined_analysis.future_projection !== 'Projections available after 2 or more exams.'
                  ? combined_analysis.future_projection
                  : combined_analysis.total_exams_taken >= 2
                    ? 'AI projection unavailable at the moment.'
                    : 'Projections available after 2 or more exams.'}
              </p>
            </div>
            
            {/* TEACHER GUIDANCE */}
            <div className="card p-6" style={{ backgroundColor: 'var(--color-teal-light)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Combined Teacher Guidance</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {combined_analysis.combined_teacher_guidance || 'Monitor performance further to extract robust guidance patterns.'}
              </p>
            </div>
          </>
        )}

        {/* SECTION 7 — PAST EXAM RESULTS */}
        <div>
          <h2 className="text-[18px] font-bold mb-4 mt-8" style={{ color: 'var(--text-primary)' }}>All Exam Results</h2>
          <div className="space-y-4">
            {completedResults.map((r: any) => {
              const isExpanded = expandedExam === r.id
              const extStudentObj: StudentWithResult = { ...student, result: r } as any
              return (
                <div key={r.id} className="card overflow-hidden">
                  <div 
                    className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedExam(isExpanded ? null : r.id)}
                  >
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.exam?.title}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {r.exam?.class?.name} • {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-sm" style={{ color: r.score_percentage > 75 ? 'var(--color-score-strong-text)' : r.score_percentage >= 50 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)' }}>
                        {r.score_percentage}%
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                           style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} className="transition-transform">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-6 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-teal-light)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        
                        {/* Cognitive Profile */}
                        <div className="bg-white p-6 rounded-[8px]" style={{ border: '1px solid var(--color-border)' }}>
                          <SectionLabel>Cognitive Profile</SectionLabel>
                          {r.analysis_json?.cognitive_profile ? (
                            <>
                              <HBar label="Concept Understanding" pct={Number(r.analysis_json.cognitive_profile.concept_understanding) || 0}  colour={statColour(Number(r.analysis_json.cognitive_profile.concept_understanding) || 0)} />
                              <HBar label="Logical Reasoning"     pct={Number(r.analysis_json.cognitive_profile.logical_reasoning) || 0}      colour={statColour(Number(r.analysis_json.cognitive_profile.logical_reasoning) || 0)} />
                              <HBar label="Calculation Accuracy"  pct={Number(r.analysis_json.cognitive_profile.calculation_accuracy) || 0}   colour={statColour(Number(r.analysis_json.cognitive_profile.calculation_accuracy) || 0)} />
                              <HBar label="Method Consistency"    pct={Number(r.analysis_json.cognitive_profile.method_consistency) || 0}     colour={statColour(Number(r.analysis_json.cognitive_profile.method_consistency) || 0)} />
                            </>
                          ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No cognitive data available.</p>
                          )}
                        </div>

                        {/* Topic Mastery */}
                        <div className="bg-white p-6 rounded-[8px]" style={{ border: '1px solid var(--color-border)' }}>
                          <SectionLabel>Topic Mastery</SectionLabel>
                          {Object.keys(r.analysis_json?.topic_mastery ?? {}).length > 0 ? (
                            Object.entries(r.analysis_json.topic_mastery)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .map(([topic, val]) => {
                                const v = typeof val === 'number' ? val : 0;
                                return <HBar key={topic} label={topic} pct={v} colour={topicColour(v)} />
                              })
                          ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No topic data available.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Mistake Patterns */}
                        <div className="bg-white p-6 rounded-[8px]" style={{ border: '1px solid var(--color-border)' }}>
                          <SectionLabel>Mistake Patterns</SectionLabel>
                          {r.analysis_json?.mistake_pattern ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-pink-dark)' }}>Recurring Types</h4>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{r.analysis_json.mistake_pattern.recurring_types}</p>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-pink-dark)' }}>Knowledge Gaps vs Careless Errors</h4>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{r.analysis_json.mistake_pattern.knowledge_gaps_vs_careless}</p>
                              </div>
                            </div>
                          ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No mistake patterns extracted.</p>
                          )}
                        </div>

                        {/* Teacher Guidance */}
                        <div className="p-6 rounded-[8px]" style={{ backgroundColor: 'var(--color-score-strong-bg)', border: '1px solid var(--color-score-strong-text)' }}>
                          <SectionLabel>Guidance for Teacher</SectionLabel>
                          {typeof r.analysis_json?.teacher_guidance === 'string' ? (
                            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                              {r.analysis_json.teacher_guidance}
                            </p>
                          ) : r.analysis_json?.teacher_guidance ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-teal)' }}>What to focus on</h4>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{r.analysis_json.teacher_guidance.what_to_focus_on}</p>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-teal)' }}>Specific exercises</h4>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{r.analysis_json.teacher_guidance.exercises_to_assign}</p>
                              </div>
                            </div>
                          ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No guidance available.</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <Link href={`/classes/${r.exam.class_id}/exams/${r.exam_id}/results/${studentId}`}>
                          <button className="btn-secondary px-4 py-2 text-sm text-[var(--text-primary)]">View Full Original Report</button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* PROMPT GENERATOR */}
        {completedResults.length > 0 && (
          <div className="no-print">
            <StudentPromptGenerator
            studentName={student.full_name}
            subject={student.class?.subject || 'the subject'}
            averageScore={combined_analysis?.overall_average_score ?? Math.round(completedResults.reduce((a: number, r: any) => a + (r.score_percentage || 0), 0) / completedResults.length)}
            strongestTopics={combined_analysis?.all_strengths?.slice(0, 3) || completedResults[completedResults.length - 1].analysis_json?.strengths || []}
            weakestTopics={combined_analysis?.all_weaknesses?.slice(0, 3) || completedResults[completedResults.length - 1].analysis_json?.weaknesses || []}
            recurringMistakes={combined_analysis?.recurring_mistakes?.slice(0, 2) || completedResults[completedResults.length - 1].analysis_json?.common_mistakes || []}
            learningStyle={humanStyle(completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.problem_solving_style || 'sequential_logical')}
            conceptUnderstanding={combined_analysis?.cognitive_profile_avg?.conceptual_clarity ?? combined_analysis?.concept_understanding_avg ?? completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.concept_understanding ?? 50}
            calculationAccuracy={combined_analysis?.cognitive_profile_avg?.procedural_accuracy ?? combined_analysis?.calculation_accuracy_avg ?? completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.calculation_accuracy ?? 50}
          />
          </div>
        )}
      </div>
    </div>
  )
}
