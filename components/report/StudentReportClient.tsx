'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, Printer } from 'lucide-react'
import StudentPromptGenerator from '@/components/student/StudentPromptGenerator'

// ── Types for the New AnalysisJSON Structure ────────────────────────────────────

interface Confidence {
  overall_confidence: number
  confidence_reasoning: string
  per_question_confidence: {
    question_number: number
    confidence: number
    needs_teacher_check: boolean
  }[]
}

interface StudentSummary {
  line_1: string
  line_2: string
  line_3: string
}

interface QuestionAnalysis {
  question_number: number
  topic: string
  difficulty: "easy" | "medium" | "hard"
  marks_total: number
  marks_awarded: number
  is_correct: boolean
  student_answer: string
  correct_answer: string
  steps_shown: number
  steps_optimal: number
  method_correct: boolean
  mistake_type: "arithmetic_slip" | "conceptual_gap" | "memorisation_gap" | "formula_error" | null
  false_verification: boolean
  evidence: string
  question_confidence: number
  needs_teacher_check: boolean
}

interface Metric {
  score: number
  evidence: string
  trend: "strength" | "developing" | "risk"
  root_concept?: string | null
}

interface CognitiveProfile {
  cluster_1_understanding: {
    conceptual_clarity: Metric
    foundational_gap: Metric
    memory_reliability: Metric
  }
  cluster_2_execution: {
    procedural_accuracy: Metric
    logical_sequencing: Metric
    verification_instinct: Metric
  }
  cluster_3_thinking_style: {
    analytical_thinking: Metric
    pattern_recognition: Metric
  }
  cluster_4_under_pressure: {
    cognitive_load_threshold: Metric
    persistence_index: Metric
    consistency_index: Metric
  }
}

interface CausalChain {
  chain_name: string
  chain_type: "damaging" | "protective"
  steps: string[]
  root_metric: string
  affected_metrics: string[]
  estimated_marks_lost: number
  fix: string
}

interface CascadingImpact {
  current_exam_score_percent: number
  estimated_score_after_fix: number
  affected_metrics: {
    metric_name: string
    current_score: number
    estimated_new_score: number
    reasoning: string
  }[]
}

interface TopicMastery {
  topic: string
  mastery_percent: number
  status: "strong" | "developing" | "weak"
}

interface FourWeekPlan {
  week_number: number
  title: string
  focus_metric: string
  daily_action: string
  success_indicator: string
}

interface AnalysisJSON {
  confidence: Confidence
  student_summary: StudentSummary
  student_type: string
  student_type_reasoning: string
  student_type_tags: string[]
  score: {
    marks_awarded: number
    marks_total: number
    percentage: number
  }
  question_analysis: QuestionAnalysis[]
  cognitive_profile: CognitiveProfile
  causal_chains: CausalChain[]
  cascading_impact: CascadingImpact
  topic_mastery: TopicMastery[]
  four_week_plan: FourWeekPlan[]
  strengths: string[]
  weaknesses: string[]
  how_to_speak: string
  mistake_pattern: {
    recurring_types: string
    knowledge_gaps_vs_careless: string
    risk_questions: string
  }
  teacher_guidance: {
    what_student_is_good_at: string
    what_to_focus_on: string
    root_cause: string
    exercises_to_assign: string
    how_to_speak: string
  }
}

interface Props {
  student: { id: string; full_name: string; roll_number?: string | null }
  exam: { id: string; title: string; subject: string; total_questions: number }
  className: string
  classId: string
  result: {
    id: string
    score_percentage: number
    correct_answers: number
    analyzed_at: string
    analysis_json: any
  }
  teacherName?: string
  syllabusType?: string | null
  classStandard?: string | null
  section?: string | null
  schoolName?: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SectionLabel({ children, color = 'var(--color-teal)' }: { children: React.ReactNode, color?: string }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color,
      marginBottom: '16px',
    }}>
      {children}
    </h3>
  )
}

function humanizeMetric(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getMistakeTypeWord(name: string) {
  if (name === 'arithmetic_slip') return 'Slip'
  if (name === 'conceptual_gap') return 'Conceptual'
  if (name === 'memorisation_gap') return 'Memory'
  if (name === 'formula_error') return 'Formula'
  return humanizeMetric(name).split(' ')[0]
}

function trendColor(trend: string) {
  if (trend === 'strength') return 'var(--color-score-strong-text)'
  if (trend === 'developing') return 'var(--color-score-mid-text)'
  if (trend === 'risk') return 'var(--color-score-weak-text)'
  return 'var(--color-border)'
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    strong: 'var(--color-score-strong-text)',
    developing: 'var(--color-score-mid-text)',
    weak: 'var(--color-score-weak-text)'
  }
  const color = colors[status as keyof typeof colors] || 'var(--color-border)'
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      color,
      border: `1px solid ${color}`,
      borderRadius: '4px',
      padding: '2px 6px',
      backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      textTransform: 'capitalize'
    }}>
      {status}
    </span>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export default function StudentReportClient({ student, exam, className, classId, result, teacherName = 'Teacher', syllabusType, classStandard, section, schoolName }: Props) {
  const aj = result.analysis_json as AnalysisJSON

  // Safety checks in case analysis shape is malformed or an old version
  if (!aj.confidence || !aj.cognitive_profile || !aj.student_summary) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <p>This report uses an older format. Please re-analyze the answer sheet to see the new structured report.</p>
      </div>
    )
  }

  const {
    confidence, student_summary, student_type, student_type_reasoning, student_type_tags,
    score, question_analysis, cognitive_profile: cp, causal_chains, cascading_impact,
    topic_mastery, four_week_plan, how_to_speak, teacher_guidance
  } = aj

  const analyzedDate = new Date(result.analyzed_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // Format properties for print layout
  const formattedDate = new Date().toLocaleDateString('en-IN')

  // Compute cluster averages
  const c1 = [cp.cluster_1_understanding.conceptual_clarity.score, cp.cluster_1_understanding.foundational_gap.score, cp.cluster_1_understanding.memory_reliability.score]
  const c1_avg = c1.reduce((a,b)=>a+b,0) / c1.length
  const c2 = [cp.cluster_2_execution.procedural_accuracy.score, cp.cluster_2_execution.logical_sequencing.score, cp.cluster_2_execution.verification_instinct.score]
  const c2_avg = c2.reduce((a,b)=>a+b,0) / c2.length
  const c3 = [cp.cluster_3_thinking_style.analytical_thinking.score, cp.cluster_3_thinking_style.pattern_recognition.score]
  const c3_avg = c3.reduce((a,b)=>a+b,0) / c3.length
  const c4 = [cp.cluster_4_under_pressure.cognitive_load_threshold.score, cp.cluster_4_under_pressure.persistence_index.score, cp.cluster_4_under_pressure.consistency_index.score]
  const c4_avg = c4.reduce((a,b)=>a+b,0) / c4.length

  const clusters = [
    { name: 'UNDERSTANDING', avg: Math.round(c1_avg) },
    { name: 'EXECUTION', avg: Math.round(c2_avg) },
    { name: 'THINKING STYLE', avg: Math.round(c3_avg) },
    { name: 'UNDER PRESSURE', avg: Math.round(c4_avg) },
  ]

  // Flatten metrics for risk thermometer and full list
  const allMetricsList = [
    { id: 'conceptual_clarity', name: 'Conceptual Clarity', ...cp.cluster_1_understanding.conceptual_clarity, cluster: 'Understanding' },
    { id: 'foundational_gap', name: 'Foundational Gap Score', ...cp.cluster_1_understanding.foundational_gap, cluster: 'Understanding' },
    { id: 'memory_reliability', name: 'Memory Reliability', ...cp.cluster_1_understanding.memory_reliability, cluster: 'Understanding' },
    { id: 'procedural_accuracy', name: 'Procedural Accuracy', ...cp.cluster_2_execution.procedural_accuracy, cluster: 'Execution' },
    { id: 'logical_sequencing', name: 'Logical Sequencing', ...cp.cluster_2_execution.logical_sequencing, cluster: 'Execution' },
    { id: 'verification_instinct', name: 'Verification Instinct', ...cp.cluster_2_execution.verification_instinct, cluster: 'Execution' },
    { id: 'analytical_thinking', name: 'Analytical Thinking Index', ...cp.cluster_3_thinking_style.analytical_thinking, cluster: 'Thinking Style' },
    { id: 'pattern_recognition', name: 'Pattern Recognition Strength', ...cp.cluster_3_thinking_style.pattern_recognition, cluster: 'Thinking Style' },
    { id: 'cognitive_load_threshold', name: 'Cognitive Load Threshold', ...cp.cluster_4_under_pressure.cognitive_load_threshold, cluster: 'Under Pressure' },
    { id: 'persistence_index', name: 'Persistence Index', ...cp.cluster_4_under_pressure.persistence_index, cluster: 'Under Pressure' },
    { id: 'consistency_index', name: 'Consistency Index', ...cp.cluster_4_under_pressure.consistency_index, cluster: 'Under Pressure' },
  ]

  const riskMetrics = allMetricsList
    .filter(m => m.trend === 'risk' || m.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)

  // Question warnings check
  const hasTeacherCheck = question_analysis.some(qa => qa.needs_teacher_check)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { max-width: 100% !important; }
          .print-visible { display: block !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="print-area" style={{ maxWidth: 800 }}>

        {/* ── PRINT HEADER ── */}
        <div className="print-header">
          <div className="print-header-top">
            <div className="print-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/azmuth-logo.png" alt="Azmuth" style={{ width: '24px', height: '24px' }} />
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1F8F8A' }}>Azmuth</span>
            </div>
            <div className="print-meta">
              <div>Teacher: {teacherName}</div>
              <div>Class: {className}</div>
              <div>Exam: {exam.title}</div>
              <div>Generated: {formattedDate}</div>
              {confidence.overall_confidence < 90 && (
                <div style={{ color: 'var(--color-score-weak-text)', marginTop: '4px', maxWidth: '300px', whiteSpace: 'normal', fontSize: '10px' }}>
                  Note: {confidence.confidence_reasoning}
                </div>
              )}
            </div>
          </div>
          <div className="print-student-name">{student.full_name}</div>
          <div className="print-exam-info">
            {exam.subject} · {className} {student.roll_number ? `· Roll No. ${student.roll_number}` : ''}
          </div>
          {confidence.overall_confidence < 90 && (
            <div style={{ marginTop: '6px', fontSize: '9pt', color: '#6B6B6B' }}>
              Note: {confidence.overall_confidence}% Analysis Confidence. {question_analysis.filter((qa: any) => qa.needs_teacher_check).length > 0 ? `Unclear handwriting on Q${question_analysis.filter((qa: any) => qa.needs_teacher_check).map((qa: any) => qa.question_number).join(', ')}.` : ''}
            </div>
          )}
        </div>

        {/* ── BACK LINK ── */}
        <div className="no-print" style={{ marginBottom: '24px' }}>
          <Link
            href={`/classes/${classId}/exams/${exam.id}`}
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            className="hover:text-[var(--color-primary)] transition-colors duration-150"
          >
            ← Back to {exam.title}
          </Link>
        </div>

        {/* ── 1. CONFIDENCE BANNER (no-print) ── */}
        {confidence.overall_confidence < 90 && (
          <div className="no-print" style={{
            backgroundColor: confidence.overall_confidence >= 70 ? 'var(--color-score-mid-bg)' : 'var(--color-score-weak-bg)',
            borderLeft: `3px solid ${confidence.overall_confidence >= 70 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'}`,
            padding: '16px',
            borderRadius: '0 8px 8px 0',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} color={confidence.overall_confidence >= 70 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: confidence.overall_confidence >= 70 ? 'var(--color-yellow-dark)' : 'var(--color-pink-dark)', lineHeight: 1.5 }}>
              <strong>{confidence.overall_confidence >= 70 ? 'Handwriting partially unclear. ' : 'Low confidence analysis. '}</strong>
              {confidence.confidence_reasoning}
              {confidence.overall_confidence < 70 ? ' Please verify flagged questions manually before sharing this report.' : ' Flagged questions are marked below.'}
            </span>
          </div>
        )}

        {/* ── HEADER ROW (no-print) ── */}
        <div className="no-print" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-body)', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {student.full_name}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Analyzed {analyzedDate}
            </p>
          </div>
          <button 
            onClick={() => window.print()} 
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={16} />
            Download
          </button>
        </div>

        {/* ── 2. STUDENT TYPE PORTRAIT CARD ── */}
        <div style={{
          backgroundColor: 'var(--color-teal-light)',
          border: '1px solid var(--color-heading)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          gap: '20px',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-heading)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 500, flexShrink: 0
          }}>
            {getInitials(student.full_name)}
          </div>
          <div style={{ paddingRight: '80px' }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              {student.full_name}
            </h2>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 500, color: 'var(--color-heading)' }}>
              {student_type}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '6px', margin: 0 }}>
              {student_type_reasoning}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {student_type_tags.map(tag => (
                <span key={tag} style={{
                  backgroundColor: 'var(--color-heading)', color: 'white', fontFamily: 'var(--font-body)',
                  fontSize: '11px', padding: '3px 10px', borderRadius: '10px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', top: '24px', right: '24px', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '28px', color: 'var(--color-heading)', lineHeight: 1 }}>
              {score.percentage}%
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {score.marks_awarded} / {score.marks_total} marks
            </div>
          </div>
        </div>

        {/* ── 3. 4-SIGNAL CLUSTER OVERVIEW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {clusters.map(c => {
            const filledDots = Math.round(c.avg / 20)
            const color = trendColor(c.avg >= 75 ? 'strength' : c.avg >= 50 ? 'developing' : 'risk')
            return (
              <div key={c.name} style={{ backgroundColor: 'var(--color-teal-light)', borderRadius: 'var(--border-radius-md)', padding: '14px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {c.name}
                </div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '6px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: i <= filledDots ? color : 'var(--color-border)',
                      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                    }} />
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500, color }}>
                  {c.avg}%
                </div>
              </div>
            )
          })}
        </div>

        {/* ── 4. 3-LINE TEACHER SUMMARY ── */}
        <div style={{ backgroundColor: '#042C53', borderRadius: '12px', padding: '20px 24px', marginBottom: '32px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          {[
            { text: student_summary.line_1, color: 'var(--color-primary)' },
            { text: student_summary.line_2, color: 'var(--color-teal)' },
            { text: student_summary.line_3, color: 'var(--color-score-strong-text)' }
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: line.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: 'white', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500
              }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'white', lineHeight: 1.7 }}>
                {line.text}
              </div>
            </div>
          ))}
        </div>

        {/* ── 5. RISK THERMOMETER ── */}
        {riskMetrics.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <SectionLabel color="var(--color-score-weak-text)">Risk Thermometer</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {riskMetrics.map((m, i) => {
                const isCritical = m.score < 40
                const isHigh = m.score >= 40 && m.score < 60
                const isMedium = m.score >= 60 && m.score < 70
                const redSegments = Math.round((100 - m.score) / 20)
                const segColor = isMedium ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'
                const severityLabel = isCritical ? 'Critical' : isHigh ? 'High' : 'Medium'
                const labelColor = isCritical ? 'var(--color-score-weak-text)' : isHigh ? 'var(--color-yellow-dark)' : 'var(--color-score-mid-text)'

                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < riskMetrics.length - 1 ? '0.5px solid var(--color-border)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.evidence}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {[1,2,3,4,5].map(j => (
                        <div key={j} style={{
                          width: '12px', height: '16px', borderRadius: '2px',
                          backgroundColor: j <= redSegments ? segColor : 'var(--color-teal-light)',
                          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                        }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: labelColor, width: '60px', textAlign: 'right', flexShrink: 0 }}>
                      {severityLabel}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 6. CAUSAL CHAINS ── */}
        {causal_chains.length > 0 && (
          <div className="card print-visible" style={{ padding: '24px', marginBottom: '24px' }}>
            <SectionLabel color="var(--color-cognitive-text)">Why These Failures Connect</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {causal_chains.map((chain, i) => {
                const isDamaging = chain.chain_type === 'damaging'
                const primaryColor = isDamaging ? 'var(--color-score-weak-text)' : 'var(--color-score-strong-text)'
                const bgColor = isDamaging ? 'var(--color-score-weak-bg)' : 'var(--color-score-strong-bg)'
                const darkColor = isDamaging ? 'var(--color-pink-dark)' : 'var(--color-green-dark)'

                return (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: primaryColor, marginBottom: '8px' }}>
                      {chain.chain_name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      {chain.steps.map((step, si) => (
                        <React.Fragment key={si}>
                          <div style={{
                            backgroundColor: bgColor, color: darkColor, borderRadius: '16px', padding: '4px 12px',
                            fontFamily: 'var(--font-body)', fontSize: '12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                          }}>
                            {step}
                          </div>
                          {si < chain.steps.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={{ backgroundColor: 'var(--color-teal-light)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>{chain.estimated_marks_lost} marks affected.</strong> {chain.fix}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 7. ALL 11 METRICS DETAIL ── */}
        <div className="card print-visible" style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionLabel>Full Cognitive Profile</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Split metrics into clusters */}
            {[['Cluster 1: Understanding', allMetricsList.slice(0, 3), c1_avg],
              ['Cluster 2: Execution', allMetricsList.slice(3, 6), c2_avg],
              ['Cluster 3: Thinking Style', allMetricsList.slice(6, 8), c3_avg],
              ['Cluster 4: Under Pressure', allMetricsList.slice(8, 11), c4_avg]
            ].map((tuple, ci) => {
              const clusterName = tuple[0] as string
              const metrics = tuple[1] as typeof allMetricsList
              const avg = tuple[2] as number
              return (
                <div key={ci}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: trendColor(avg >= 75 ? 'strength' : avg >= 50 ? 'developing' : 'risk'), WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{clusterName}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(avg)}% avg</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {metrics.map(m => (
                      <div key={m.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: trendColor(m.trend) }}>{m.score}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, backgroundColor: 'var(--color-border)', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${m.score}%`, height: '100%', backgroundColor: trendColor(m.trend), WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {m.evidence} {m.root_concept ? `(Root concept: ${m.root_concept})` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 8. CASCADING IMPACT ── */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionLabel color="var(--color-heading)">Fix This First</SectionLabel>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '-8px' }}>
            Estimated improvement if the top priority fix is addressed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overall Score Row */}
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-teal-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600 }}>
                <span>Overall Exam Score</span>
                <span style={{ color: 'var(--color-score-strong-text)' }}>+{cascading_impact.estimated_score_after_fix - cascading_impact.current_exam_score_percent} points</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: `${cascading_impact.current_exam_score_percent}%`, backgroundColor: 'var(--color-border)', height: '10px', borderRadius: '4px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{cascading_impact.current_exam_score_percent}% (Current)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: `${cascading_impact.estimated_score_after_fix}%`, backgroundColor: 'var(--color-heading)', height: '10px', borderRadius: '4px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-heading)' }}>{cascading_impact.estimated_score_after_fix}% (Est)</span>
                </div>
              </div>
            </div>

            {cascading_impact.affected_metrics.map((am, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500 }}>
                  <span>{am.metric_name}</span>
                  <span style={{ color: 'var(--color-score-strong-text)' }}>+{am.estimated_new_score - am.current_score} points</span>
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ width: '100%', height: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: `${am.estimated_new_score}%`, backgroundColor: 'var(--color-teal-light)', height: '100%', borderRadius: '4px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: `${am.current_score}%`, backgroundColor: 'var(--color-border)', height: '100%', borderRadius: '4px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>{am.reasoning}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 9. QUESTION BREAKDOWN TABLE ── */}
        {question_analysis.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', overflowX: 'auto' }}>
            <SectionLabel>Question Breakdown</SectionLabel>
            {hasTeacherCheck && (
              <div className="no-print" style={{ backgroundColor: 'var(--color-score-mid-bg)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-yellow-dark)' }}>
                  <strong>Note:</strong> Questions marked ⚠ had unclear handwriting. Please verify these answers before sharing this report with the student.
                </span>
              </div>
            )}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-teal-light)' }}>
                    {['Q#', 'Student Answer', 'Result', 'Mistake Type', 'Confidence', 'Evidence'].map((col) => (
                      <th key={col} style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question_analysis.map((qa, i, arr) => (
                    <tr key={i} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>Q{qa.question_number}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', maxWidth: '200px' }}>
                        {qa.student_answer}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {qa.is_correct === true && (
                          <span className="text-[#4AAA00]" style={{ fontSize: '11px', fontWeight: 500 }}>
                            ✓ Correct
                          </span>
                        )}
                        {qa.is_correct === false && (
                          <span className="text-[#D4607E]" style={{ fontSize: '11px', fontWeight: 500 }}>
                            ✗ Wrong
                          </span>
                        )}
                        {qa.is_correct === null && (
                          <span className="text-[#9DB8B8]" style={{ fontSize: '11px', fontWeight: 500 }}>
                            — Skipped
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {qa.mistake_type ? getMistakeTypeWord(qa.mistake_type) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {qa.needs_teacher_check ? (
                          <span style={{ backgroundColor: 'var(--color-score-mid-bg)', color: 'var(--color-yellow-dark)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            ⚠ Check
                          </span>
                        ) : qa.question_confidence < 90 ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{qa.question_confidence}%</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px' }}>
                        {qa.evidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 10. TOPIC MASTERY BARS ── */}
        {topic_mastery.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <SectionLabel>Topic Mastery</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topic_mastery.sort((a,b) => b.mastery_percent - a.mastery_percent).map((topic, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>{topic.topic}</span>
                      <StatusBadge status={topic.status} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '13px', color: 'var(--text-muted)' }}>{Math.round(topic.mastery_percent)}%</span>
                  </div>
                  <div style={{ backgroundColor: 'var(--color-border)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', width: `${topic.mastery_percent}%`, 
                      backgroundColor: trendColor(topic.status === 'strong' ? 'strength' : topic.status === 'developing' ? 'developing' : 'risk'),
                      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' 
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 11. TEACHER GUIDANCE + HOW TO SPEAK ── */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionLabel>Guidance for Teacher</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-teal)', marginBottom: '6px' }}>What the student is genuinely good at</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{teacher_guidance.what_student_is_good_at}</p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-teal)', marginBottom: '6px' }}>What to focus on</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{teacher_guidance.what_to_focus_on}</p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-teal)', marginBottom: '6px' }}>Root cause of pattern</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{teacher_guidance.root_cause}</p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-teal)', marginBottom: '6px' }}>Specific exercises to assign</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{teacher_guidance.exercises_to_assign}</p>
            </div>
            
            <div style={{
              borderLeft: '4px solid var(--color-teal)', backgroundColor: 'var(--color-teal-light)',
              padding: '16px', borderRadius: '0 8px 8px 0', marginTop: '8px',
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
            }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-teal-dark)', marginBottom: '8px' }}>
                How to Speak to this Student
              </h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-teal-dark)', lineHeight: 1.7, margin: 0 }}>
                {how_to_speak || teacher_guidance.how_to_speak}
              </p>
            </div>
          </div>
        </div>

        {/* ── 12. 4-WEEK PLAN ── */}
        <div className="card print-visible" style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionLabel>4-Week Action Plan</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {four_week_plan.map((week, i) => {
              const theme = i === 0 ? 'var(--color-heading)' : i === 1 ? 'var(--color-teal)' : i === 2 ? 'var(--color-score-strong-text)' : 'var(--color-score-mid-text)'
              return (
                <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <div style={{ backgroundColor: theme, padding: '12px 14px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Week {week.week_number}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{week.title}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--color-teal-light)', padding: '12px 14px', height: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {week.daily_action}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Done when: {week.success_indicator}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 13. GENERATE PRACTICE PAPER (no-print) ── */}
        <div className="no-print">
          <StudentPromptGenerator
            studentName={student.full_name}
            subject={exam.subject}
            averageScore={Number(score.percentage.toFixed(0))}
            strongestTopics={aj.strengths?.slice(0, 3) || []}
            weakestTopics={aj.weaknesses?.slice(0, 3) || []}
            recurringMistakes={aj.mistake_pattern?.recurring_types ? [aj.mistake_pattern.recurring_types] : []}
            learningStyle={humanizeMetric(student_type)}
            conceptUnderstanding={cp.cluster_1_understanding.conceptual_clarity.score}
            calculationAccuracy={cp.cluster_2_execution.procedural_accuracy.score}
            syllabusType={syllabusType}
            classStandard={classStandard}
            section={section}
            schoolName={schoolName}
            studentType={student_type}
            studentTypeReasoning={student_type_reasoning}
            cognitiveRisks={riskMetrics.map((m: any) => m.name)}
            topPriorityFix={cascading_impact.affected_metrics[0]?.metric_name || null}
          />
        </div>

        {/* ── PRINT BUTTON ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '48px', marginTop: '24px' }}>
          <button
            onClick={() => window.print()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>

        {/* PRINT FOOTER */}
        <div className="print-footer">
          <span>Azmuth — Student Learning Report</span>
          <span>{student.full_name} · {exam.title}</span>
        </div>

      </div>
    </>
  )
}
