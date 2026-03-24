'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Printer } from 'lucide-react'
import StudentPromptGenerator from '@/components/student/StudentPromptGenerator'

// Reused helper functions
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

export default function IdentityOverviewPage() {
  const params = useParams()
  const identityId = params.identityId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
    identity: any,
    student: any,
    results: any[],
    combined_analysis: any,
    all_exams: any[]
  } | null>(null)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/identities/${identityId}/history`)
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
  }, [identityId])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading records...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <div className="text-sm font-medium" style={{ color: 'var(--color-score-weak-text)' }}>{error}</div>
        <Link href={`/students`}>
          <button className="btn-secondary px-4 py-2">Back to Students Directory</button>
        </Link>
      </div>
    )
  }

  const { student, results, combined_analysis } = data
  const hasMultipleExams = results.length > 1
  const completedResults = results.filter((r) => r.analysis_json)
  const printReport = () => window.print()

  return (
    <div className="max-w-[800px] mx-auto pb-24">
      {/* HEADER BLOCK */}
      <div className="mb-8 pt-4">
        <Link 
          href={`/students`} 
          className="inline-flex items-center text-sm font-medium mb-4 hover:underline no-print" 
          style={{ color: 'var(--text-muted)' }}
        >
          ← All Students
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {student.full_name}
            </h1>
            {(student.email || student.imei_number) && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {student.email} {student.email && student.imei_number && '•'} {student.imei_number}
              </p>
            )}
            <div className="mt-3 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded no-print" style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-dark)' }}>
              Global Record View
            </div>
          </div>
          <button onClick={printReport} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 no-print">
            <Printer size={16} />
            Download Report
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-header">
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}><span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span> — Student Global Record</h2>
        <p><strong>Student:</strong> {student.full_name}</p>
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
          <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Score History Across All Classes</h2>
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

        {/* SECTION 1.5 — TYPE HISTORY */}
        {results.length > 0 && results.some((r: any) => r.student_type) && (
          <div className="card p-6">
            <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Student Type Progression</h2>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const types = results.map((r: any) => r.student_type).filter(Boolean)
                if (types.length === 0) return <span className="text-sm text-[var(--text-muted)]">No type history available.</span>
                
                const uniqueTypes = types.filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i);
                if (uniqueTypes.length === 1) {
                  return (
                    <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-[var(--color-teal-light)] text-[var(--color-heading)]">
                      Consistently {uniqueTypes[0]}
                    </span>
                  )
                }
                
                return types.map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-[var(--color-teal-light)] text-[var(--color-heading)]">
                      {t}
                    </span>
                    {i < types.length - 1 && <span className="text-[var(--text-muted)] font-bold">→</span>}
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

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
                    <tr>
                      <th className="px-6 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Topic</th>
                      {results.map((r: any, i: number) => (
                        <th key={i} className="px-4 py-3 font-medium text-center" style={{ color: 'var(--text-muted)' }}>Exam {i + 1}</th>
                      ))}
                      <th className="px-6 py-3 font-medium text-right" style={{ color: 'var(--text-primary)' }}>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(combined_analysis.topic_mastery_avg || {}).map(([topic, avg]: [string, any]) => (
                      <tr key={topic} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{topic}</td>
                        {results.map((r: any, i: number) => {
                          const topicVal = r.analysis_json?.topic_mastery?.[topic]
                          return (
                            <td key={i} className="px-4 py-4 text-center font-mono">
                              {topicVal !== undefined ? (
                                <span className="px-2 py-1 rounded" style={{ backgroundColor: topicVal >= 75 ? 'var(--color-score-strong-bg)' : topicVal >= 50 ? 'var(--color-score-mid-bg)' : 'var(--color-score-weak-bg)', color: topicVal >= 75 ? 'var(--color-green-dark)' : topicVal >= 50 ? 'var(--color-yellow-dark)' : 'var(--color-pink-dark)' }}>
                                  {Math.round(topicVal)}%
                                </span>
                              ) : <span style={{ color: 'var(--color-border)' }}>—</span>}
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(avg)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4 — STRENGTHS, WEAKNESSES, MISTAKES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 border-t-4" style={{ borderTopColor: 'var(--color-teal)' }}>
                <SectionLabel>Consistent Strengths</SectionLabel>
                <div className="space-y-4">
                  {(combined_analysis.all_strengths || []).map((s: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <CheckCircle2 size={16} color="var(--color-teal)" className="mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6 border-t-4" style={{ borderTopColor: 'var(--color-score-mid-text)' }}>
                <SectionLabel>Core Weaknesses</SectionLabel>
                <div className="space-y-4">
                  {(combined_analysis.all_weaknesses || []).map((w: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <AlertTriangle size={16} color="var(--color-score-mid-text)" className="mt-0.5 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6 border-t-4" style={{ borderTopColor: 'var(--color-score-weak-text)' }}>
                <SectionLabel>Recurring Mistakes</SectionLabel>
                <div className="space-y-4">
                  {(combined_analysis.recurring_mistakes || []).map((m: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-score-weak-bg)', color: 'var(--color-pink-dark)' }}>✕</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 5 — PROJECTION & GUIDANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 card p-6 bg-[var(--text-primary)] text-white outline outline-1 outline-[var(--text-primary)]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold tracking-wider text-[var(--color-score-strong-bg)]">AI PROJECTION</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-200">
                  {combined_analysis.future_projection && combined_analysis.future_projection !== 'Projections available after 2 or more exams.'
                    ? combined_analysis.future_projection
                    : combined_analysis.total_exams_taken >= 2
                      ? 'AI projection unavailable at the moment.'
                      : 'Projections available after 2 or more exams.'}
                </p>
              </div>
              <div className="lg:col-span-2 card p-6">
                <SectionLabel>Combined Teacher Guidance</SectionLabel>
                <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                  {combined_analysis.combined_teacher_guidance || "Continue monitoring student progress to generate tailored guidance."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* SECTION 6 — EXAM RESULTS LIST */}
        <div className="card max-w-[800px] overflow-hidden bg-transparent border-0 shadow-none">
          <SectionLabel>Past Exam Results</SectionLabel>
          <div className="space-y-4 mt-2">
            {results.map((r: any, i: number) => {
              const isExpanded = expandedExam === r.id
              const scoreColor = r.score_percentage > 75 ? 'var(--color-score-strong-text)' : r.score_percentage >= 50 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'
              
              return (
                <div key={r.id} className="bg-white rounded-[8px]" style={{ border: '1px solid var(--color-border)' }}>
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--color-teal-light)] transition-colors"
                    onClick={() => setExpandedExam(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center rounded-[8px] font-mono font-bold text-lg" style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-dark)' }}>
                        {r.score_percentage}%
                      </div>
                      <div>
                        <h3 className="font-semibold text-[15px] text-[var(--text-primary)]">{r.exam?.title}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          {r.exam?.subject} • {r.exam?.class_name} • {new Date(r.exam?.date || r.exam?.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <span className="text-lg text-[var(--text-muted)] no-print">−</span> : <span className="text-lg text-[var(--text-muted)] no-print">+</span>}
                    </div>
                  </div>

                  {/* Expanded detail view summarizing the specific result */}
                  {isExpanded && r.analysis_json && (
                    <div className="p-6 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        {/* Cognitive Profile for this exam */}
                        <div>
                          <SectionLabel>Cognitive Profile (This Exam)</SectionLabel>
                          <div className="p-3 mb-4 rounded bg-[var(--color-teal-light)] border border-[var(--color-border)]">
                            <p className="text-xs uppercase text-[var(--text-muted)] mb-1">Problem Solving Style</p>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{humanStyle(r.analysis_json.cognitive_profile?.problem_solving_style)}</p>
                          </div>
                          {[
                            { label: 'Concept Understanding', val: r.analysis_json.cognitive_profile?.concept_understanding },
                            { label: 'Logical Reasoning', val: r.analysis_json.cognitive_profile?.logical_reasoning },
                            { label: 'Calculation Accuracy', val: r.analysis_json.cognitive_profile?.calculation_accuracy },
                            { label: 'Method Consistency', val: r.analysis_json.cognitive_profile?.method_consistency }
                          ].map(s => {
                            const v = Number(s.val) || 0
                            return <HBar key={s.label} label={s.label} pct={v} colour={statColour(v)} />
                          })}
                        </div>

                        {/* Topic Mastery for this exam */}
                        <div>
                          <SectionLabel>Topic Mastery (This Exam)</SectionLabel>
                          {r.analysis_json.topic_mastery && Object.keys(r.analysis_json.topic_mastery).length > 0 ? (
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
                        <Link href={`/classes/${r.exam.class_id}/exams/${r.exam_id}/results/${r.student_id}`}>
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
              subject={completedResults[completedResults.length - 1].exam?.subject || 'All Subjects'}
              averageScore={combined_analysis?.overall_average_score ?? Math.round(completedResults.reduce((a: number, r: any) => a + (r.score_percentage || 0), 0) / completedResults.length)}
              strongestTopics={combined_analysis?.all_strengths?.slice(0, 3) || completedResults[completedResults.length - 1].analysis_json?.strengths || []}
              weakestTopics={combined_analysis?.all_weaknesses?.slice(0, 3) || completedResults[completedResults.length - 1].analysis_json?.weaknesses || []}
              recurringMistakes={combined_analysis?.recurring_mistakes?.slice(0, 2) || completedResults[completedResults.length - 1].analysis_json?.common_mistakes || []}
              learningStyle={humanStyle(completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.problem_solving_style || 'sequential_logical')}
              conceptUnderstanding={combined_analysis?.cognitive_profile_avg?.conceptual_clarity ?? combined_analysis?.concept_understanding_avg ?? completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.concept_understanding ?? 50}
              calculationAccuracy={combined_analysis?.cognitive_profile_avg?.procedural_accuracy ?? combined_analysis?.calculation_accuracy_avg ?? completedResults[completedResults.length - 1].analysis_json?.cognitive_profile?.calculation_accuracy ?? 50}
              studentType={combined_analysis?.most_common_type || completedResults[completedResults.length - 1].analysis_json?.student_type}
              studentTypeReasoning={completedResults[completedResults.length - 1].analysis_json?.student_type_reasoning}
              cognitiveRisks={combined_analysis?.all_weaknesses?.slice(0, 3) || []}
              topPriorityFix={combined_analysis?.combined_teacher_guidance}
            />
          </div>
        )}
      </div>
    </div>
  )
}
