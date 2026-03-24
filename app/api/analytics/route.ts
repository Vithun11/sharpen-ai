import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    if (!classId) return NextResponse.json({ error: 'class_id is required' }, { status: 400 })

    // Verify class ownership
    const { data: cls } = await supabase
      .from('classes').select('id').eq('id', classId).eq('teacher_id', session.user.id).single()
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    // Fetch all exams in the class
    const { data: exams } = await supabase
      .from('exams').select('id, title, created_at').eq('class_id', classId)
    if (!exams || exams.length === 0) return NextResponse.json({ data: null })

    const examIds = exams.map((e) => e.id)

    // Fetch all students in the class
    const { data: students } = await supabase
      .from('students').select('id, full_name').eq('class_id', classId).order('full_name')

    // Fetch all results with analysis JSON
    const { data: results } = await supabase
      .from('student_results')
      .select('student_id, exam_id, score_percentage, analysis_json, analyzed_at, student_type')
      .in('exam_id', examIds)

    if (!results || results.length === 0) return NextResponse.json({ data: null })

    // ── Compute class average ─────────────────────────────────
    const classAverage = results.reduce((sum, r) => sum + (r.score_percentage ?? 0), 0) / results.length

    // ── Topic mastery aggregation ─────────────────────────────
    const topicTotals: Record<string, number[]> = {}
    const studentTopics: Record<string, Record<string, number>> = {}

    // ── Common mistakes aggregation ───────────────────────────
    const mistakeCounts: Record<string, number> = {}

    for (const r of results) {
      const aj = r.analysis_json as {
        topic_mastery?: { topic: string; mastery_percent: number; status?: string }[]
        question_analysis?: { mistake_type?: string | null }[]
      } | null

      if (!aj) continue

      // Topic mastery — per student
      if (Array.isArray(aj.topic_mastery)) {
        if (!studentTopics[r.student_id]) studentTopics[r.student_id] = {}
        for (const tm of aj.topic_mastery) {
          const topic = tm.topic
          const pct = tm.mastery_percent
          if (!topic || typeof pct !== 'number') continue
          
          if (!(topic in topicTotals)) topicTotals[topic] = []
          topicTotals[topic].push(pct)
          // Average per student per topic (if multiple exams)
          if (studentTopics[r.student_id][topic] === undefined) {
            studentTopics[r.student_id][topic] = pct
          } else {
            studentTopics[r.student_id][topic] = (studentTopics[r.student_id][topic] + pct) / 2
          }
        }
      }

      // Common mistakes
      if (Array.isArray(aj.question_analysis)) {
        for (const qa of aj.question_analysis) {
          if (qa.mistake_type) mistakeCounts[qa.mistake_type] = (mistakeCounts[qa.mistake_type] ?? 0) + 1
        }
      }
    }

    // Hardest topic (lowest avg mastery)
    let hardestTopic: { name: string; avgMastery: number } | null = null
    for (const [topic, vals] of Object.entries(topicTotals)) {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length
      if (!hardestTopic || avg < hardestTopic.avgMastery) {
        hardestTopic = { name: topic, avgMastery: Math.round(avg) }
      }
    }

    // Most common mistake
    const mostCommonMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // ── Per-student stats ─────────────────────────────────────
    const studentMap = Object.fromEntries((students ?? []).map((s) => [s.id, s.full_name]))

    // Group results by student, sorted by exam date
    const resultsByStudent: Record<string, { score: number; date: string; student_type?: string }[]> = {}
    for (const r of results) {
      if (!resultsByStudent[r.student_id]) resultsByStudent[r.student_id] = []
      resultsByStudent[r.student_id].push({ score: r.score_percentage, date: r.analyzed_at, student_type: r.student_type })
    }

    const studentStats = Object.entries(resultsByStudent).map(([studentId, scores]) => {
      scores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const avgScore = scores.reduce((s, r) => s + r.score, 0) / scores.length
      let trend: 'up' | 'down' | 'flat' = 'flat'
      if (scores.length >= 2) {
        const diff = scores[scores.length - 1].score - scores[scores.length - 2].score
        trend = diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat'
      }
      return {
        studentId,
        studentName: studentMap[studentId] ?? 'Unknown',
        studentType: scores[scores.length - 1].student_type || null,
        examsCount: scores.length,
        avgScore: Math.round(avgScore * 10) / 10,
        trend,
      }
    }).sort((a, b) => b.avgScore - a.avgScore)

    // All topics that appear in at least one analysis
    const allTopics = Object.keys(topicTotals).sort()

    return NextResponse.json({
      data: {
        classAverage: Math.round(classAverage * 10) / 10,
        hardestTopic,
        mostCommonMistake,
        studentStats,
        studentTopics,   // { studentId: { topic: pct } }
        allTopics,
        examCount: exams.length,
      }
    })
  } catch (err) {
    console.error('[GET /api/analytics]', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
