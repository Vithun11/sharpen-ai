'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, BarChart2, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react'
import ClassPromptGenerator from './ClassPromptGenerator'
import IndividualExamAnalytics from './IndividualExamAnalytics'
import type { Exam } from '@/lib/types'

interface StudentStat {
  studentId: string
  studentName: string
  studentType?: string | null
  examsCount: number
  avgScore: number
  trend: 'up' | 'down' | 'flat'
}

interface AnalyticsData {
  classAverage: number
  hardestTopic: { name: string; avgMastery: number } | null
  mostCommonMistake: string | null
  studentStats: StudentStat[]
  studentTopics: Record<string, Record<string, number>>
  allTopics: string[]
  examCount: number
}

interface Props {
  classId: string
  className: string
  subject: string
  syllabusType?: string | null
  classStandard?: string | null
  section?: string | null
  schoolName?: string | null
  view?: string
  onViewChange?: (view: string) => void
  exams?: Exam[]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
      {children}
    </p>
  )
}

function scoreColour(pct: number) {
  if (pct < 50) return 'var(--color-score-weak-text)'
  if (pct < 75) return 'var(--color-score-mid-text)'
  return 'var(--color-score-strong-text)'
}

function cellBg(pct: number) {
  if (pct < 50)  return 'var(--color-score-weak-bg)'
  if (pct < 75)  return 'var(--color-score-mid-bg)'
  return 'var(--color-score-strong-bg)'
}

function humanizeMetric(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getMistakeTypeWord(name: string) {
  if (name === 'arithmetic_slip') return 'Slip'
  if (name === 'conceptual_gap') return 'Conceptual'
  if (name === 'memorisation_gap') return 'Memory'
  if (name === 'formula_error') return 'Formula'
  if (name === 'careless_error') return 'Careless'
  return humanizeMetric(name).split(' ')[0]
}

function cellColor(pct: number) {
  if (pct < 50) return 'var(--color-pink-dark)'
  if (pct < 75) return 'var(--color-yellow-dark)'
  return 'var(--color-green-dark)'
}

export default function AnalyticsTab({ classId, className, subject, syllabusType, classStandard, section, schoolName, view, onViewChange, exams = [] }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [internalView, setInternalView] = useState('combined')

  const selectedView = view || internalView
  const setSelectedView = onViewChange || setInternalView

  useEffect(() => {
    fetch(`/api/analytics?class_id=${classId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return }
        setData(j.data)
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [classId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div className="loader" />
      </div>
    )
  }

  if (error) {
    return <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-score-weak-text)', textAlign: 'center', padding: '32px 0' }}>{error}</p>
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center', borderRadius: '10px', border: '1px dashed var(--color-border)' }}>
        <BarChart2 size={32} color="var(--color-border)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>No analysis data yet</p>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>
          Upload student answer sheets to see class insights.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .analytics-content { animation: fadeIn 200ms ease-in; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── View Toggle ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedView('combined')}
          style={{
            background: 'transparent',
            color: selectedView === 'combined' ? 'var(--color-teal)' : 'var(--text-muted)',
            padding: '8px 20px',
            borderRadius: '20px',
            fontFamily: 'var(--font-body)',
            fontWeight: selectedView === 'combined' ? 600 : 500,
            fontSize: '13px',
            border: selectedView === 'combined' ? '1.5px solid var(--color-teal)' : '1.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => { if (selectedView !== 'combined') { e.currentTarget.style.background = 'var(--color-teal-light)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={(e) => { if (selectedView !== 'combined') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
        >
          Class Overview
        </button>
        {exams?.map(exam => (
          <button
            key={exam.id}
            onClick={() => setSelectedView(exam.id)}
            style={{
              background: 'transparent',
              color: selectedView === exam.id ? 'var(--color-teal)' : 'var(--text-muted)',
              padding: '8px 20px',
              borderRadius: '20px',
              fontFamily: 'var(--font-body)',
              fontWeight: selectedView === exam.id ? 600 : 500,
              fontSize: '13px',
              border: selectedView === exam.id ? '1.5px solid var(--color-teal)' : '1.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => { if (selectedView !== exam.id) { e.currentTarget.style.background = 'var(--color-teal-light)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { if (selectedView !== exam.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
          >
            {exam.title}
          </button>
        ))}
      </div>

      <div key={selectedView} className="analytics-content">
        {selectedView === 'combined' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Row 1: Stat Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

        {/* Class Average */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>CLASS AVERAGE</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '42px', fontWeight: 700, color: scoreColour(data.classAverage), lineHeight: 1 }}>
              {data.classAverage}%
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            across {data.studentStats.reduce((s, r) => s + r.examsCount, 0)} results · {data.examCount} exams
          </p>
        </div>

        {/* Hardest Topic */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>HARDEST TOPIC</SectionLabel>
          {data.hardestTopic ? (
            <>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.3 }}>
                {data.hardestTopic.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
                <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.hardestTopic.avgMastery}%`, backgroundColor: 'var(--color-score-weak-text)', borderRadius: '4px' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-score-weak-text)', textAlign: 'right' }}>
                  {data.hardestTopic.avgMastery}% avg
                </span>
              </div>
            </>
          ) : <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>No topic data yet</p>}
        </div>

        {/* Most Common Mistake */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>MOST COMMON MISTAKE</SectionLabel>
          {data.mostCommonMistake ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '8px' }}>
              <AlertTriangle size={18} color="var(--color-score-mid-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{getMistakeTypeWord(data.mostCommonMistake)}</p>
            </div>
          ) : <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>No mistake data yet</p>}
        </div>
      </div>

      {/* ── Row 2: Student Rankings ───────────────────────────── */}
      <div style={{ padding: '24px', marginTop: '40px' }} className="card">
        <SectionLabel>STUDENT RANKINGS</SectionLabel>
        {data.studentStats.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>No student results yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Student Name</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Exams Taken</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Average Score</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.studentStats.map((s, i) => {
                  const isTop    = i === 0
                  const isBottom = i === data.studentStats.length - 1 && data.studentStats.length > 1
                  return (
                    <tr key={s.studentId}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      style={{ transition: 'background 150ms', borderBottom: i < data.studentStats.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={{ padding: '18px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', width: '60px' }}>
                        #{i + 1}
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link href={`/classes/${classId}/students/${s.studentId}/history`} style={{ textDecoration: 'none' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', transition: 'color 150ms' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>{s.studentName}</span>
                          </Link>
                          {isTop    && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: 'var(--color-score-strong-bg)', color: 'var(--color-green-dark)' }}>Top</span>}
                          {isBottom && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: 'var(--color-score-weak-bg)', color: 'var(--color-pink-dark)' }}>Needs support</span>}
                        </div>
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        {s.studentType ? (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--color-teal-light)', color: 'var(--color-heading)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.studentType}>
                            {s.studentType}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: '14px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '18px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'center' }}>
                        {s.examsCount}
                      </td>
                      <td style={{ padding: '18px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: cellBg(s.avgScore), color: cellColor(s.avgScore) }}>
                          {s.avgScore}%
                        </span>
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        {s.trend === 'up'   && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}><TrendingUp size={16} /><span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 400 }}>Improving</span></div>}
                        {s.trend === 'down' && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}><TrendingDown size={16} /><span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 400 }}>Declining</span></div>}
                        {s.trend === 'flat' && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}><Minus size={16} /><span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 400 }}>Steady</span></div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row 3: Topic Mastery Heatmap ──────────────────────── */}
      {data.allTopics.length > 0 && data.studentStats.length > 0 && (
        <div className="card" style={{ padding: '24px', marginTop: '40px' }}>
          <SectionLabel>TOPIC MASTERY HEATMAP</SectionLabel>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '16px' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: data.allTopics.length * 100 + 180 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '200px', borderRight: '1px solid var(--color-border)' }}>
                    Student
                  </th>
                  {data.allTopics.map((t) => (
                    <th key={t} style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', borderRight: '1px solid var(--color-border)', maxWidth: '140px', textTransform: 'uppercase' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={t}>{t}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.studentStats.map((s, i) => (
                  <tr key={s.studentId}
                    style={{ borderBottom: i < data.studentStats.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '14px 16px', borderRight: '1px solid var(--color-border)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', minWidth: '200px', backgroundColor: 'var(--color-surface)', position: 'sticky', left: 0 }}>
                      <Link href={`/classes/${classId}/students/${s.studentId}/history`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                        {s.studentName}
                      </Link>
                    </td>
                    {data.allTopics.map((topic) => {
                      const pct = data.studentTopics[s.studentId]?.[topic]
                      return (
                        <td key={topic} style={{ minWidth: '120px', padding: '14px 12px', borderRight: '1px solid var(--color-border)', textAlign: 'center', backgroundColor: pct !== undefined ? cellBg(pct) : 'var(--color-teal-light)' }}>
                          {pct !== undefined ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: cellColor(pct) }}>
                              {Math.round(pct)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', alignItems: 'center' }}>
            {[
              { bg: 'var(--color-score-weak-bg)', label: '< 50% Poor' },
              { bg: 'var(--color-score-mid-bg)', label: '50–74% Developing' }, 
              { bg: 'var(--color-score-strong-bg)', label: '≥ 75% Strong' }
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: l.bg, border: '1px solid rgba(0,0,0,0.05)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 4: Exam Breakdown ─────────────────────────────── */}
      {exams && exams.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <SectionLabel>EXAM BREAKDOWN</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {exams.map(exam => (
              <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{exam.title}</h4>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    {exam.subject} • {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {data.studentStats.length} students
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {exam.total_questions || 0} questions
                  </span>
                </div>
                
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={() => setSelectedView(exam.id)}
                    style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 150ms', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    View Analytics <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 5: AI Prompt Generator ──────────────────────── */}
      {data.studentStats.length > 0 && (
        <ClassPromptGenerator
          className={className}
          subject={subject}
          studentCount={data.studentStats.length}
          classAverage={data.classAverage}
          hardestTopics={data.hardestTopic ? [data.hardestTopic.name] : []}
          easiestTopics={[]} // Easiest topics not exposed directly over API yet
          mostCommonMistakes={data.mostCommonMistake ? [getMistakeTypeWord(data.mostCommonMistake)] : []}
          studentsNeedingSupport={data.studentStats.slice(-3).map(s => s.studentName).reverse()}
          studentsToChallenge={data.studentStats.slice(0, 3).map(s => s.studentName)}
          topicMasteryAverages={[]} // Complex metric to extract here, leaving for simple default
          syllabusType={syllabusType}
          classStandard={classStandard}
          section={section}
          schoolName={schoolName}
        />
      )}
          </div>
        ) : (
          <IndividualExamAnalytics
            examId={selectedView}
            classId={classId}
            examTitle={exams?.find(e => e.id === selectedView)?.title || 'Exam'}
            examSubject={exams?.find(e => e.id === selectedView)?.subject || subject}
            examDate={exams?.find(e => e.id === selectedView)?.created_at || new Date().toISOString()}
          />
        )}
      </div>
    </div>
  )
}
