'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import ClassPromptGenerator from './ClassPromptGenerator'

interface Props {
  examId: string
  classId: string
  examTitle: string
  examSubject: string
  examDate: string
}

interface StudentResultData {
  id: string
  score_percentage: number
  analysis_json: any
  students: {
    id: string
    full_name: string
    roll_number: string | null
  }
}

interface ExamAnalyticsData {
  averageScore: number
  hardestQuestion: { qNum: number; topic: string; wrongCount: number; studentCount: number } | null
  mostCommonMistake: string | null
  studentCount: number
  studentResults: {
    studentId: string
    studentName: string
    scorePct: number
    questions: { qNum: number; isCorrect: boolean }[]
    mistakes: string[]
  }[]
  questionDifficulty: {
    qNum: number
    topic: string
    correctCount: number
    totalCount: number
    correctPct: number
  }[]
  topicMastery: {
    topic: string
    avgMastery: number
  }[]
  allQuestions: number[]
  allTopics: string[]
  studentTopics: Record<string, Record<string, number>>
  examQuestions: { question_number: number; topic: string; difficulty: string; question_text: string }[]
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

function cellColor(pct: number) {
  if (pct < 50) return 'var(--color-pink-dark)'
  if (pct < 75) return 'var(--color-yellow-dark)'
  return 'var(--color-green-dark)'
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

function renderMistakeTag(m: string, idx: number) {
  let bg = 'var(--color-teal-light)'
  let color = 'var(--text-muted)'
  const mLower = m.toLowerCase()
  if (mLower.includes('arithmetic')) { bg = 'var(--color-score-mid-bg)'; color = 'var(--color-yellow-dark)' }
  else if (mLower.includes('concept')) { bg = 'var(--color-score-weak-bg)'; color = 'var(--color-pink-dark)' }
  else if (mLower.includes('memoris') || mLower.includes('memoriz')) { bg = 'var(--color-cognitive-bg)'; color = 'var(--color-cognitive-text)' }
  else if (mLower.includes('formula')) { bg = 'var(--color-electric-light)'; color = 'var(--color-electric-dark)' }
  
  return (
    <span key={idx} style={{ background: bg, color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
      {getMistakeTypeWord(m)}
    </span>
  )
}

export default function IndividualExamAnalytics({ examId, classId, examTitle, examSubject, examDate }: Props) {
  const [data, setData] = useState<ExamAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data: results, error: fetchError } = await supabase
          .from('student_results')
          .select(`
            id,
            score_percentage,
            analysis_json,
            students:student_id (
              id,
              full_name,
              roll_number
            )
          `)
          .eq('exam_id', examId)

        if (fetchError) throw fetchError

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('question_number, topic, difficulty, question_text')
          .eq('exam_id', examId)
          .order('question_number', { ascending: true })

        if (questionsError) throw questionsError
        if (!isMounted) return

        if (!results || results.length === 0) {
          setData(null)
          return
        }

        // Process results
        let totalScore = 0
        let tempQDiff: Record<number, { correct: number; total: number; topic: string }> = {}
        const mistakeCounts: Record<string, number> = {}
        const topicSums: Record<string, { sum: number; count: number }> = {}
        const studentTopicsMap: Record<string, Record<string, number>> = {}

        const parsedResults = results.map((r: any) => {
          totalScore += r.score_percentage || 0
          
          let parsedAny = r.analysis_json
          if (typeof parsedAny === 'string') {
            try { parsedAny = JSON.parse(parsedAny) } catch (e) { parsedAny = {} }
          }
          const analysis = parsedAny || {}
          const questions = Array.isArray(analysis.question_analysis) ? analysis.question_analysis : []

          // Student Questions
          const studentQData: { qNum: number; isCorrect: boolean }[] = []
          const mistakesFromQuestions: string[] = []
          
          questions.forEach((q: any) => {
            const qNum = parseInt(q.questionNumber || q.question_number, 10)
            if (isNaN(qNum)) return
            
            const isCorrect = Boolean(q.isCorrect || q.is_correct)
            const topic = q.topic || 'Unknown'
            
            studentQData.push({ qNum, isCorrect })

            if (!tempQDiff[qNum]) {
              tempQDiff[qNum] = { correct: 0, total: 0, topic }
            }
            tempQDiff[qNum].total++
            if (isCorrect) tempQDiff[qNum].correct++
            
            if (q.mistake_type && typeof q.mistake_type === 'string' && !isCorrect) {
               mistakesFromQuestions.push(q.mistake_type)
            }
          })

          let mistakes = Array.from(new Set(mistakesFromQuestions))
          if (mistakes.length === 0 && Array.isArray(analysis.common_mistakes)) {
            mistakes = analysis.common_mistakes
          }

          // Mistakes
          mistakes.forEach((m: string) => {
            mistakeCounts[m] = (mistakeCounts[m] || 0) + 1
          })

          // Topics
          studentTopicsMap[r.students.id] = {}
          const topicArray = Array.isArray(analysis.topic_mastery) ? analysis.topic_mastery : []
          
          if (topicArray.length > 0) {
            topicArray.forEach((tm: any) => {
              const tName = tm.topic
              const pct = tm.mastery_percent
              if (tName && typeof pct === 'number') {
                if (!topicSums[tName]) topicSums[tName] = { sum: 0, count: 0 }
                topicSums[tName].sum += pct
                topicSums[tName].count++
                studentTopicsMap[r.students.id][tName] = pct
              }
            })
          } else {
            const topicScores: Record<string, { awarded: number; total: number }> = {}
            questions.forEach((q: any) => {
              const topic = q.topic || 'Unknown'
              const awarded = typeof q.marks_awarded === 'number' ? q.marks_awarded : (q.is_correct ? 1 : 0)
              const total = typeof q.marks_total === 'number' ? q.marks_total : 1
              
              if (!topicScores[topic]) topicScores[topic] = { awarded: 0, total: 0 }
              topicScores[topic].awarded += awarded
              topicScores[topic].total += total
            })
            
            Object.entries(topicScores).forEach(([tName, scores]) => {
              if (scores.total > 0) {
                const pct = Math.round((scores.awarded / scores.total) * 100)
                if (!topicSums[tName]) topicSums[tName] = { sum: 0, count: 0 }
                topicSums[tName].sum += pct
                topicSums[tName].count++
                studentTopicsMap[r.students.id][tName] = pct
              }
            })
          }

          return {
            studentId: r.students.id,
            studentName: r.students.full_name || 'Unknown Student',
            scorePct: r.score_percentage || 0,
            questions: studentQData,
            mistakes
          }
        })

        // Sort students by score descending
        parsedResults.sort((a, b) => b.scorePct - a.scorePct)

        const studentCount = parsedResults.length
        const averageScore = Math.round(totalScore / studentCount)

        let mostCommonMistake = null
        const sortedMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])
        if (sortedMistakes.length > 0) {
          const maxCount = sortedMistakes[0][1]
          const topMistakes = sortedMistakes.filter(m => m[1] === maxCount).map(m => getMistakeTypeWord(m[0]))
          mostCommonMistake = topMistakes.join(', ')
        }

        const questionDifficultyList = Object.entries(tempQDiff).map(([qNumStr, stats]) => {
          return {
            qNum: parseInt(qNumStr, 10),
            topic: stats.topic,
            correctCount: stats.correct,
            totalCount: stats.total,
            correctPct: Math.round((stats.correct / stats.total) * 100)
          }
        }).sort((a, b) => a.qNum - b.qNum)

        const allQuestions = questionDifficultyList.map(q => q.qNum)

        let hardestQuestion = null
        if (questionDifficultyList.length > 0) {
          const sortedByHardest = [...questionDifficultyList].sort((a, b) => a.correctPct - b.correctPct)
          const hardest = sortedByHardest[0]
          if (hardest) {
            hardestQuestion = {
              qNum: hardest.qNum,
              topic: hardest.topic,
              wrongCount: hardest.totalCount - hardest.correctCount,
              studentCount: hardest.totalCount
            }
          }
        }

        const topicMasteryList = Object.entries(topicSums).map(([topic, stats]) => ({
          topic,
          avgMastery: Math.round(stats.sum / stats.count)
        }))
        const allTopics = topicMasteryList.map(t => t.topic)

        setData({
          averageScore,
          hardestQuestion,
          mostCommonMistake,
          studentCount,
          studentResults: parsedResults,
          questionDifficulty: questionDifficultyList,
          topicMastery: topicMasteryList,
          allQuestions,
          allTopics,
          studentTopics: studentTopicsMap,
          examQuestions: questionsData || []
        })

      } catch (err: any) {
        if (!isMounted) return
        setError(err.message || 'Failed to load exam analytics')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [examId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
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
        <BookOpen size={32} color="var(--color-border)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>No student results yet</p>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>
          Once you upload and process student answer sheets for this exam, analytics will appear here.
        </p>
      </div>
    )
  }

  const getTopicForQuestion = (questionNumber: number) => {
    const q = data.examQuestions?.find((q: any) => q.question_number === questionNumber)
    return q?.topic || 'Unknown'
  }

  const getDifficultyForQuestion = (questionNumber: number) => {
    const q = data.examQuestions?.find((q: any) => q.question_number === questionNumber)
    return q?.difficulty || null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="analytics-content">
      {/* ── HEADER ROW ────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {examTitle}
        </h2>
        <span style={{ background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', padding: '4px 12px', borderRadius: '20px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500 }}>
          {examSubject}
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
          {new Date(examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
          • {data.studentCount} students analyzed
        </span>
      </div>

      {/* ── STAT CARDS ROW ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Exam Average */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>EXAM AVERAGE</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '42px', fontWeight: 700, color: scoreColour(data.averageScore), lineHeight: 1 }}>
              {data.averageScore}%
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            across {data.studentCount} students
          </p>
        </div>

        {/* Hardest Question */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>HARDEST QUESTION</SectionLabel>
          {data.hardestQuestion ? (
            <>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.3 }}>
                Q{data.hardestQuestion.qNum} — {getTopicForQuestion(data.hardestQuestion.qNum)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
                <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((data.hardestQuestion.wrongCount / data.hardestQuestion.studentCount) * 100)}%`, backgroundColor: 'var(--color-score-weak-text)', borderRadius: '4px' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {data.hardestQuestion.wrongCount} of {data.hardestQuestion.studentCount} students got this wrong
                </span>
              </div>
            </>
          ) : <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>No question data</p>}
        </div>

        {/* Most Common Mistake */}
        <div className="card" style={{ padding: '28px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>MOST Common Mistake</SectionLabel>
          {data.mostCommonMistake ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '8px' }}>
              <AlertTriangle size={18} color="var(--color-score-mid-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{data.mostCommonMistake}</p>
            </div>
          ) : <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>No mistakes found</p>}
        </div>

      </div>

      {/* ── STUDENT RESULTS TABLE ─────────────────────────────── */}
      <div style={{ marginTop: '40px' }}>
        <SectionLabel>STUDENT RESULTS</SectionLabel>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</th>
                <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '150px' }}>Student</th>
                <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Score</th>
                {data.allQuestions.map(q => (
                  <th key={q} title={getTopicForQuestion(q)} style={{ padding: '12px 12px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                    Q{q}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '200px' }}>Mistakes</th>
              </tr>
            </thead>
            <tbody>
              {data.studentResults.map((s, i) => (
                <tr key={s.studentId}
                  style={{ borderBottom: i < data.studentResults.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 150ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    #{i + 1}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/classes/${classId}/exams/${examId}/results/${s.studentId}`} style={{ textDecoration: 'none' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', display: 'block', transition: 'color 150ms' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>
                        {s.studentName}
                      </span>
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, background: cellBg(s.scorePct), color: cellColor(s.scorePct), display: 'inline-block' }}>
                      {s.scorePct}%
                    </span>
                  </td>
                  {data.allQuestions.map(q => {
                    const qData = s.questions.find(sq => sq.qNum === q)
                    const isCorrect = qData?.isCorrect
                    return (
                      <td key={q} style={{ padding: '14px 12px', textAlign: 'center', backgroundColor: isCorrect ? 'var(--color-score-strong-bg)' : (isCorrect === false ? 'var(--color-score-weak-bg)' : 'transparent'), borderLeft: '1px solid var(--color-border)' }}>
                        {isCorrect ? (
                          <span style={{ color: 'var(--color-green-dark)', fontWeight: 600 }}>✓</span>
                        ) : isCorrect === false ? (
                          <span style={{ color: 'var(--color-pink-dark)', fontWeight: 600 }}>✗</span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>-</span>
                        )}
                      </td>
                    )
                  })}
                  <td style={{ padding: '14px 16px', borderLeft: '1px solid var(--color-border)' }}>
                    {s.mistakes && s.mistakes.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {s.mistakes.map((m, idx) => renderMistakeTag(m, idx))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── QUESTION DIFFICULTY BREAKDOWN ─────────────────────── */}
      <div style={{ marginTop: '40px' }}>
        <SectionLabel>QUESTION DIFFICULTY</SectionLabel>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.questionDifficulty.length === 0 ? (
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', margin: '16px 0' }}>
              Question-level data not available for this exam. 
              <br/>Re-analyze answer sheets to see this breakdown.
            </p>
          ) : data.questionDifficulty.map(q => {
            const diff = getDifficultyForQuestion(q.qNum);
            return (
            <div key={q.qNum} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
              <div style={{ width: '60px', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Q{q.qNum}
                </span>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '12px', borderRadius: '6px', backgroundColor: 'var(--color-border)', width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${q.correctPct}%`, backgroundColor: q.correctPct >= 75 ? 'var(--color-score-strong-text)' : (q.correctPct >= 50 ? 'var(--color-score-mid-text)' : 'var(--color-score-weak-text)'), borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {getTopicForQuestion(q.qNum)}
                  </span>
                  {diff && (
                    <span style={{ 
                      background: diff === 'easy' ? 'var(--color-score-strong-bg)' : (diff === 'medium' ? 'var(--color-score-mid-bg)' : 'var(--color-score-weak-bg)'),
                      color: diff === 'easy' ? 'var(--color-green-dark)' : (diff === 'medium' ? 'var(--color-yellow-dark)' : 'var(--color-pink-dark)'),
                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'capitalize'
                    }}>
                      {diff}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {q.correctCount}/{q.totalCount} correct
                </span>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* ── TOPIC MASTERY FOR THIS EXAM ───────────────────────── */}
      {data.allTopics.length > 0 && data.studentResults.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <SectionLabel>TOPIC MASTERY — THIS EXAM</SectionLabel>
          <div className="card">
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid transparent' }}>
              <table style={{ minWidth: data.allTopics.length * 100 + 180, borderCollapse: 'collapse' }}>
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
                  {data.studentResults.map((s, i) => (
                    <tr key={s.studentId} style={{ borderBottom: i < data.studentResults.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
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
          </div>
        </div>
      )}

      {/* ── GENERATE PRACTICE PAPER ──────────────────────────── */}
      {data.studentResults.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <ClassPromptGenerator
            className={"This class"}
            subject={examSubject}
            studentCount={data.studentCount}
            classAverage={data.averageScore}
            hardestTopics={data.hardestQuestion ? [getTopicForQuestion(data.hardestQuestion.qNum)] : []}
            easiestTopics={[]}
            mostCommonMistakes={data.mostCommonMistake ? [data.mostCommonMistake] : []}
            studentsNeedingSupport={data.studentResults.slice(-3).map(s => s.studentName).reverse()}
            studentsToChallenge={data.studentResults.slice(0, 3).map(s => s.studentName)}
            topicMasteryAverages={[]}
            syllabusType={null}
            classStandard={null}
            section={null}
            schoolName={null}
            examSpecificData={{ title: examTitle, date: examDate }}
          />
        </div>
      )}

    </div>
  )
}
