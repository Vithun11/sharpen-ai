import { createServerSupabaseClient } from '@/lib/supabase'
import { anthropic, HAIKU } from '@/lib/ai-clients'

export async function updateCombinedAnalysis(identityId: string, teacherId: string) {
  const supabase = createServerSupabaseClient()

  // 1. Fetch all student_results for this identity_id across all classes
  const { data: siblingStudents, error: sibErr } = await supabase
    .from('students')
    .select('id')
    .eq('identity_id', identityId)

  if (sibErr || !siblingStudents || siblingStudents.length === 0) return

  const siblingIds = siblingStudents.map(s => s.id)

  const { data: results, error: resErr } = await supabase
    .from('student_results')
    .select(`
      *,
      exam:exams (
        id,
        title,
        created_at,
        class:classes(name)
      )
    `)
    .in('student_id', siblingIds)
    .order('created_at', { ascending: true })

  if (resErr || !results || results.length === 0) return

  // 2. Extract and compute averages from the 11-metric cognitive profile
  const totalExams = results.length

  let totalScore = 0

  // Cluster 1 — Understanding
  let totalConceptualClarity = 0
  let totalFoundationalGap = 0
  let totalMemoryReliability = 0

  // Cluster 2 — Execution
  let totalProceduralAccuracy = 0
  let totalLogicalSequencing = 0
  let totalVerificationInstinct = 0

  // Cluster 3 — Thinking Style
  let totalAnalyticalThinking = 0
  let totalPatternRecognition = 0

  // Cluster 4 — Under Pressure
  let totalCognitiveLoadThreshold = 0
  let totalPersistenceIndex = 0
  let totalConsistencyIndex = 0

  const allTopicMastery: Record<string, { sum: number; count: number }> = {}
  const allStrengths = new Set<string>()
  const weaknessesCount: Record<string, number> = {}
  const mistakeTypesCount: Record<string, number> = {}

  const scoreHistory = []
  const typeProgression: string[] = []

  for (const r of results) {
    const analysis = r.analysis_json || {}
    const scorePct = r.score_percentage || 0
    totalScore += scorePct

    // Read 11-metric nested cognitive profile
    const cog = analysis.cognitive_profile || {}

    const c1 = cog.cluster_1_understanding || {}
    totalConceptualClarity += c1.conceptual_clarity?.score ?? 50
    totalFoundationalGap += c1.foundational_gap?.score ?? 50
    totalMemoryReliability += c1.memory_reliability?.score ?? 50

    const c2 = cog.cluster_2_execution || {}
    totalProceduralAccuracy += c2.procedural_accuracy?.score ?? 50
    totalLogicalSequencing += c2.logical_sequencing?.score ?? 50
    totalVerificationInstinct += c2.verification_instinct?.score ?? 50

    const c3 = cog.cluster_3_thinking_style || {}
    totalAnalyticalThinking += c3.analytical_thinking?.score ?? 50
    totalPatternRecognition += c3.pattern_recognition?.score ?? 50

    const c4 = cog.cluster_4_under_pressure || {}
    totalCognitiveLoadThreshold += c4.cognitive_load_threshold?.score ?? 50
    totalPersistenceIndex += c4.persistence_index?.score ?? 50
    totalConsistencyIndex += c4.consistency_index?.score ?? 50

    // Topic mastery — new format is array of { topic, mastery_percent, status }
    const topicMasteryArr: Array<{ topic: string; mastery_percent: number; status: string }> =
      Array.isArray(analysis.topic_mastery) ? analysis.topic_mastery : []

    for (const entry of topicMasteryArr) {
      if (!entry.topic) continue
      if (!allTopicMastery[entry.topic]) {
        allTopicMastery[entry.topic] = { sum: 0, count: 0 }
      }
      allTopicMastery[entry.topic].sum += entry.mastery_percent ?? 0
      allTopicMastery[entry.topic].count += 1
    }

    // Strengths
    const strengths: string[] = Array.isArray(analysis.strengths) ? analysis.strengths : []
    for (const s of strengths) allStrengths.add(s)

    // Weaknesses
    const weaknesses: string[] = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : []
    for (const w of weaknesses) {
      weaknessesCount[w] = (weaknessesCount[w] || 0) + 1
    }

    // Mistake types — tallied from question_analysis array
    const questionAnalysis: Array<{ mistake_type: string | null }> =
      Array.isArray(analysis.question_analysis) ? analysis.question_analysis : []

    for (const q of questionAnalysis) {
      if (q.mistake_type) {
        mistakeTypesCount[q.mistake_type] = (mistakeTypesCount[q.mistake_type] || 0) + 1
      }
    }

    scoreHistory.push({
      exam_title: r.exam?.title || 'Unknown Exam',
      class_name: r.exam?.class?.name || 'Unknown Class',
      date: r.created_at,
      score_percentage: scorePct
    })

    if (r.student_type) typeProgression.push(r.student_type)
  }

  // 3. Final averages
  const overallAvg = Math.round(totalScore / totalExams)

  const avgConceptualClarity = Math.round(totalConceptualClarity / totalExams)
  const avgFoundationalGap = Math.round(totalFoundationalGap / totalExams)
  const avgMemoryReliability = Math.round(totalMemoryReliability / totalExams)
  const avgProceduralAccuracy = Math.round(totalProceduralAccuracy / totalExams)
  const avgLogicalSequencing = Math.round(totalLogicalSequencing / totalExams)
  const avgVerificationInstinct = Math.round(totalVerificationInstinct / totalExams)
  const avgAnalyticalThinking = Math.round(totalAnalyticalThinking / totalExams)
  const avgPatternRecognition = Math.round(totalPatternRecognition / totalExams)
  const avgCognitiveLoadThreshold = Math.round(totalCognitiveLoadThreshold / totalExams)
  const avgPersistenceIndex = Math.round(totalPersistenceIndex / totalExams)
  const avgConsistencyIndex = Math.round(totalConsistencyIndex / totalExams)

  // 4. Merge topic mastery
  const finalTopicMastery: Record<string, number> = {}
  for (const [topic, data] of Object.entries(allTopicMastery)) {
    finalTopicMastery[topic] = Math.round(data.sum / data.count)
  }

  // 5. Final arrays
  const finalStrengths = Array.from(allStrengths)

  const finalWeaknesses = Object.entries(weaknessesCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])

  const finalMistakeTypes = Object.entries(mistakeTypesCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])

  // 6. Most common student type
  let mostCommonType: string | null = null
  if (typeProgression.length > 0) {
    const typeCounts: Record<string, number> = {}
    let max = 0
    for (const t of typeProgression) {
      typeCounts[t] = (typeCounts[t] || 0) + 1
      if (typeCounts[t] > max) {
        max = typeCounts[t]
        mostCommonType = t
      }
    }
  }

  // 7. Improvement trend
  let improvementTrend = 'stable'
  if (totalExams > 1) {
    const firstScore = scoreHistory[0].score_percentage
    const lastScore = scoreHistory[totalExams - 1].score_percentage
    if (lastScore > firstScore + 5) improvementTrend = 'improving'
    else if (lastScore < firstScore - 5) improvementTrend = 'declining'
  }

  // 8. Identify weakest and strongest metrics for the Haiku prompt
  const metricAverages = {
    'Conceptual Clarity': avgConceptualClarity,
    'Foundational Gap': avgFoundationalGap,
    'Memory Reliability': avgMemoryReliability,
    'Procedural Accuracy': avgProceduralAccuracy,
    'Logical Sequencing': avgLogicalSequencing,
    'Verification Instinct': avgVerificationInstinct,
    'Analytical Thinking': avgAnalyticalThinking,
    'Pattern Recognition': avgPatternRecognition,
    'Cognitive Load Threshold': avgCognitiveLoadThreshold,
    'Persistence Index': avgPersistenceIndex,
    'Consistency Index': avgConsistencyIndex,
  }

  const sortedMetrics = Object.entries(metricAverages).sort((a, b) => a[1] - b[1])
  const weakestMetrics = sortedMetrics.slice(0, 3).map(([name, score]) => `${name}: ${score}`)
  const strongestMetrics = sortedMetrics.slice(-2).reverse().map(([name, score]) => `${name}: ${score}`)

  // 9. Call Haiku for projection and guidance
  const studentReq = await supabase
    .from('student_identities')
    .select('full_name')
    .eq('id', identityId)
    .single()

  const studentName = studentReq.data?.full_name || 'Student'

  const prompt = `You are analyzing a student's performance history across multiple exams.

Student name: \${studentName}
Total exams taken: \${totalExams}
Overall average score: \${overallAvg}%
Improvement trend: \${improvementTrend}
Score history (chronological): \${JSON.stringify(scoreHistory)}

Average cognitive profile (11 metrics, 0-100):
Weakest metrics: \${weakestMetrics.join(', ')}
Strongest metrics: \${strongestMetrics.join(', ')}

Top recurring mistake types: \${finalMistakeTypes.slice(0, 4).join(', ') || 'none recorded'}
Top recurring weaknesses: \${finalWeaknesses.slice(0, 4).join(', ') || 'none recorded'}
Topic mastery averages: \${JSON.stringify(finalTopicMastery)}
Most common student type across exams: \${mostCommonType || 'not yet determined'}
Student type progression: \${typeProgression.join(' → ') || 'none'}

Generate exactly two things:
1. future_projection: A specific paragraph predicting this student's likely score range on their next exam. Reference actual score numbers. Name the top 2 risk metrics and top 1 strength metric by name. Be direct and concrete.
2. combined_teacher_guidance: One paragraph identifying the single most important intervention the teacher should make right now, based on patterns across all \${totalExams} exams. Reference the weakest metric and the most recurring mistake type specifically.

Return ONLY valid JSON with no markdown, no backticks, no explanation:
{ "future_projection": "string", "combined_teacher_guidance": "string" }`

  let future_projection = 'Projections available after 2 or more exams.'
  let combined_teacher_guidance = 'Continue monitoring progress across exams.'

  if (totalExams >= 2) {
    try {
      const response = await anthropic.messages.create({
        model: HAIKU,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })

      const text = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('')

      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()

      const parsed = JSON.parse(cleaned)
      if (parsed.future_projection) future_projection = parsed.future_projection
      if (parsed.combined_teacher_guidance) combined_teacher_guidance = parsed.combined_teacher_guidance
    } catch (err) {
      console.error('[combined-analysis] Failed to generate AI projection:', err)
    }
  }

  // 10. Upsert combined analysis
  await supabase
    .from('student_combined_analysis')
    .upsert({
      identity_id: identityId,
      teacher_id: teacherId,
      total_exams_taken: totalExams,
      overall_average_score: overallAvg,

      // Store all 11 metric averages in a single JSONB column
      cognitive_profile_avg: {
        conceptual_clarity: avgConceptualClarity,
        foundational_gap: avgFoundationalGap,
        memory_reliability: avgMemoryReliability,
        procedural_accuracy: avgProceduralAccuracy,
        logical_sequencing: avgLogicalSequencing,
        verification_instinct: avgVerificationInstinct,
        analytical_thinking: avgAnalyticalThinking,
        pattern_recognition: avgPatternRecognition,
        cognitive_load_threshold: avgCognitiveLoadThreshold,
        persistence_index: avgPersistenceIndex,
        consistency_index: avgConsistencyIndex,
      },

      all_topic_mastery: finalTopicMastery,
      all_strengths: finalStrengths,
      all_weaknesses: finalWeaknesses,
      recurring_mistakes: finalMistakeTypes,
      improvement_trend: improvementTrend,
      score_history: scoreHistory,
      future_projection,
      combined_teacher_guidance,
      most_common_type: mostCommonType,
      type_progression: typeProgression.length > 0 ? typeProgression : null,
      last_updated: new Date().toISOString()
    }, { onConflict: 'identity_id' })
}
