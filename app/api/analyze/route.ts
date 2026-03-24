import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { ANALYSIS_PROMPT } from '@/lib/prompts'
import { anthropic, SONNET } from '@/lib/ai-clients'
import { updateCombinedAnalysis } from '@/lib/combined-analysis'
import { pdf } from 'pdf-to-img'

// Allow up to 60s for AI analysis on Vercel
export const maxDuration = 60

function enforceStudentName(analysisJson: any, studentName: string | null): any {
  if (!studentName) return analysisJson
  
  const name = studentName.trim()
  const nameLower = name.toLowerCase()
  
  if (analysisJson.how_to_speak) {
    const textStart = analysisJson.how_to_speak.substring(0, studentName.length + 3).toLowerCase()
    const nameAlreadyAtStart = textStart.includes(nameLower)
    
    if (!nameAlreadyAtStart && !analysisJson.how_to_speak.toLowerCase().includes(nameLower)) {
      analysisJson.how_to_speak = name + ', ' + analysisJson.how_to_speak
    }
  }
  
  if (analysisJson.teacher_guidance?.how_to_speak) {
    const textStart = analysisJson.teacher_guidance.how_to_speak.substring(0, studentName.length + 3).toLowerCase()
    const nameAlreadyAtStart = textStart.includes(nameLower)
    
    if (!nameAlreadyAtStart && !analysisJson.teacher_guidance.how_to_speak.toLowerCase().includes(nameLower)) {
      analysisJson.teacher_guidance.how_to_speak = name + ', ' + analysisJson.teacher_guidance.how_to_speak
    }
  }
  
  return analysisJson
}

function recomputeScore(analysisJson: any): any {
  const questions = analysisJson.question_analysis || []
  
  const attemptedQuestions = questions.filter((q: any) => 
    q.marks_total !== undefined && 
    q.marks_total !== null &&
    Number(q.marks_total) > 0
  )
  
  const total_marks_awarded = attemptedQuestions.reduce((sum: number, q: any) => sum + (Number(q.marks_awarded) || 0), 0)
  const total_marks_total = attemptedQuestions.reduce((sum: number, q: any) => sum + (Number(q.marks_total) || 0), 0)
  
  const percentage = total_marks_total > 0
    ? Math.round((total_marks_awarded / total_marks_total) * 100)
    : 0
  
  if (total_marks_total === 0) {
    console.error('[analyze] SCORE ERROR: total_marks_total is 0. question_analysis may be empty.')
  }
  
  if (total_marks_total > 200) {
    console.warn('[analyze] SCORE WARNING: total_marks_total is ' + total_marks_total + '. Verify mark scheme.')
  }
  
  if (percentage > 100) {
    console.error('[analyze] SCORE ERROR: percentage exceeds 100. Capping.')
  }
  
  analysisJson.score = {
    ...analysisJson.score,
    marks_awarded: total_marks_awarded,
    marks_total: total_marks_total,
    percentage: Math.min(percentage, 100)
  }
  
  return analysisJson
}

function fixSkippedQuestions(analysisJson: any): any {
  const questions = analysisJson.question_analysis || []
  
  const fixedQuestions = questions.map((q: any) => {
    const isOptionalSkip = q.evidence && (
      q.evidence.toLowerCase().includes('skipped') ||
      q.evidence.toLowerCase().includes('not attempted') ||
      q.evidence.toLowerCase().includes('by student choice') ||
      q.evidence.toLowerCase().includes('optional')
    ) && (q.marks_awarded === 0 || q.marks_awarded === null)
    
    if (isOptionalSkip) {
      return {
        ...q,
        marks_total: 0,
        marks_awarded: 0,
        is_correct: null,
        mistake_type: null,
        evidence: q.evidence + ' — excluded from score calculation per optional question rules.'
      }
    }
    return q
  })
  
  analysisJson.question_analysis = fixedQuestions
  
  const skippedTopics = new Set(
    fixedQuestions
      .filter((q: any) => q.marks_total === 0 && q.is_correct === null)
      .map((q: any) => q.topic)
  )
  
  if (analysisJson.topic_mastery) {
    analysisJson.topic_mastery = analysisJson.topic_mastery.filter((t: any) => !skippedTopics.has(t.topic))
  }
  
  return analysisJson
}

/**
 * Download files from Supabase Storage and convert to base64 images.
 * Handles both image files and PDFs (converting PDF pages to images).
 */
async function storagePathsToBase64Images(
  serviceClient: any,
  storagePaths: string[]
): Promise<Array<{ base64: string; mediaType: string }>> {
  const results = []

  for (const path of storagePaths) {
    const { data, error } = await serviceClient.storage
      .from('answer-sheets')
      .download(path)

    if (error || !data) {
      console.error(`[analyze] Failed to download ${path}:`, error)
      throw new Error(`Failed to download file: ${path}`)
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    const isPdf = path.toLowerCase().endsWith('.pdf') || data.type === 'application/pdf'

    if (isPdf) {
      const document = await pdf(buffer, { scale: 2.0 })
      for await (const page of document) {
        results.push({
          base64: page.toString('base64'),
          mediaType: 'image/png'
        })
      }
    } else {
      results.push({
        base64: buffer.toString('base64'),
        mediaType: data.type || 'image/jpeg'
      })
    }
  }

  return results
}

function buildMockAnalysis(questions: { question_number: number; question_text: string; topic?: string | null }[]) {
  const total = questions.length
  const correct = Math.floor(total * 0.72)
  return {
    question_analysis: questions.map((q, i) => ({
      question_number: q.question_number,
      what_student_did: i % 4 === 0 ? 'Blank paper' : `Wrote down step 1 of Q${q.question_number}.`,
      student_answer: i % 4 === 0 ? 'Left blank' : `Answer to Q${q.question_number} — student showed working clearly.`,
      is_correct: i < correct,
      marks_awarded: i < correct ? 4 : 1,
      marks_total: 4,
      mistake_type: i >= correct ? (['arithmetic_error','conceptual_error','method_error','sign_error'] as const)[i % 4] : null,
      root_cause: i >= correct ? 'Careless calculation error' : null,
      why_correct: i < correct ? 'Correctly identified the standard approach and executed it flawlessly.' : null,
      why_wrong: i >= correct ? 'Applied the wrong formula resulting in an incorrect answer.' : null,
      what_caused_it: i >= correct ? 'Rushed working' : null,
      concept_understanding: i < correct ? 'excellent' : 'basic',
    })),
    score: { 
      correct_answers: correct, 
      total_questions: total, 
      marks_obtained: correct * 4 + (total - correct) * 1,
      marks_total: total * 4,
      percentage: Math.round((correct / total) * 100) 
    },
    cognitive_profile: {
      problem_solving_style: 'sequential_logical',
      concept_understanding: 88,
      logical_reasoning: 75,
      calculation_accuracy: 60,
      method_consistency: 90,
      concept_understanding_justification: 'Showed strong grasp of algebra concepts.',
      logical_reasoning_justification: 'Followed logical steps mostly.',
      calculation_accuracy_justification: 'Made a few arithmetic errors.',
      method_consistency_justification: 'Consistently applied taught methods.'
    },
    topic_mastery: Object.fromEntries(
      Array.from(new Set(questions.map((q) => q.topic ?? 'General'))).map((t, i) => [t, [85, 60, 40, 90, 72][i % 5]])
    ),
    strengths: ['Shows clear step-by-step working', 'Consistent method throughout', 'Strong conceptual foundation in core topics'],
    weaknesses: ['Arithmetic errors under time pressure', 'Struggles with multi-step problems', 'Skips verification of answers'],
    common_mistakes: ['Sign errors in algebra', 'Incomplete final answers', 'Formula misapplication'],
    mistake_pattern: {
      recurring_types: 'Often drops negative signs when transferring terms across the equals sign in algebraic equations, particularly visible in multi-step problems.',
      knowledge_gaps_vs_careless: 'The core concepts are well understood. The errors are almost universally execution slips (careless calculations) rather than fundamental knowledge gaps.',
      risk_questions: 'Likely to lose marks on lengthy algebraic manipulation questions or questions requiring precise arithmetic.'
    },
    teacher_guidance: {
      what_student_is_good_at: 'This student demonstrates a solid understanding of core concepts. They structure their working logically and know which formulas apply to given scenarios.',
      what_to_focus_on: 'The primary focus must be on mitigating careless arithmetic errors, particularly in multi-step calculations.',
      root_cause_of_pattern: 'The student often rushes the final step to arrive at the answer quickly once the core setup is solved.',
      exercises_to_assign: 'Timed practice focusing specifically on the final computation steps. Multi-step algebra worksheets that reward accuracy.',
      how_to_speak_to_student: 'Acknowledge their strong logical foundation, but emphasise slowing down at the final hurdle. Share the idea that "the last step is just as important as the first."'
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase    = createServerSupabaseClient()
    const serviceClient = createServiceClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Parse JSON body (files already in Supabase Storage) ───
    const body = await request.json()
    const studentId    = body.student_id as string
    const examId       = body.exam_id as string
    const storagePaths = body.storage_paths as string[]
    const syllabusType = body.syllabus_type as string | null
    const classStandard = body.class_standard as string | null

    if (!studentId || !examId || !storagePaths || storagePaths.length === 0) {
      return NextResponse.json({ error: 'student_id, exam_id, and storage_paths are required.' }, { status: 400 })
    }

    if (storagePaths.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 pages allowed.' }, { status: 400 })
    }

    const { data: student } = await supabase.from('students').select('full_name').eq('id', studentId).single()
    const studentName = student?.full_name || null

    // ── Verify ownership ─────────────────────────────────────
    const { data: exam } = await supabase
      .from('exams')
      .select('id, class_id, title')
      .eq('id', examId)
      .single()

    if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 })

    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', exam.class_id)
      .eq('teacher_id', session.user.id)
      .single()

    if (!cls) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

    // ── Fetch questions ──────────────────────────────────────
    const { data: questions } = await supabase
      .from('questions')
      .select('question_number, question_text, topic, difficulty, expected_method')
      .eq('exam_id', examId)
      .order('question_number', { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this exam.' }, { status: 400 })
    }

    // ── MOCK MODE (MOCK_AI=true in .env.local) ───────────────
    if (process.env.MOCK_AI === 'true') {
      console.log('[analyze] MOCK_AI mode — skipping Claude API')
      await new Promise((r) => setTimeout(r, 2000)) // simulate processing
      const mockAnalysis = buildMockAnalysis(questions)
      const { data: result, error: saveErr } = await supabase
        .from('student_results')
        .upsert({
          student_id:       studentId,
          exam_id:          examId,
          answer_sheet_url: JSON.stringify(storagePaths),
          score_percentage: mockAnalysis.score.percentage,
          correct_answers:  mockAnalysis.score.correct_answers,
          analysis_json:    mockAnalysis,
          analyzed_at:      new Date().toISOString(),
        }, { onConflict: 'student_id,exam_id' })
        .select().single()
      if (saveErr) throw saveErr
      return NextResponse.json({ data: {
        result_id:        result.id,
        score_percentage: mockAnalysis.score.percentage,
        correct_answers:  mockAnalysis.score.correct_answers,
        total_questions:  questions.length,
        analysis:         mockAnalysis,
      }})
    }

    // ── Download & convert to images from Supabase Storage ───
    const pages = await storagePathsToBase64Images(serviceClient, storagePaths)
    if (pages.length > 20) {
      return NextResponse.json({ error: 'Answer sheet exceeds 20 pages. Please split into separate uploads.' }, { status: 400 })
    }

    const answerSheetUrl = JSON.stringify(storagePaths)

    // ── Call Anthropic (Sonnet) ───────────────────────────────
    let analysis: Record<string, unknown>

    try {
      const imageBlocks = pages.map(page => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: page.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: page.base64
        }
      }))

      const multiPageNote = pages.length > 1
         ? `\n\nNOTE: This answer sheet spans ${pages.length} pages. All pages are provided above in order. Analyse all pages as one continuous answer booklet. Questions may continue across pages.`
         : ''

      const studentNameInstruction = studentName
        ? `\nCRITICAL — STUDENT IDENTITY:\n` +
          `The student being analysed is: ` +
          `${studentName}\n` +
          `Use ONLY this name everywhere in ` +
          `the JSON output where a student ` +
          `name appears.\n` +
          `Never use any other name.\n` +
          `Never use a name from any previous ` +
          `analysis or context.\n`
        : `\nSTUDENT IDENTITY:\n` +
          `Student name is not available.\n` +
          `Use "this student" wherever a name ` +
          `would appear.\n`

      const response = await anthropic.messages.create({
        model: SONNET,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: ANALYSIS_PROMPT
                  .replace('{syllabus_type}', syllabusType || 'Not specified')
                  .replace('{class_standard}', classStandard || 'Not specified')
                  + studentNameInstruction
                  + multiPageNote
                  + "\n\nEXTRACTED QUESTIONS:\n" + JSON.stringify(questions, null, 2),
                cache_control: { type: "ephemeral" }
              }
            ]
          }
        ]
      })

      const analysisText = response.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("")

      const cleanText = analysisText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      analysis = JSON.parse(cleanText)
      
      analysis = enforceStudentName(analysis, studentName)
      analysis = recomputeScore(analysis)
      analysis = fixSkippedQuestions(analysis)
    } catch (err) {
      console.error('[analyze] AI call failed:', err)
      return NextResponse.json(
        { error: 'Could not read the answer sheet clearly. Please try a clearer image.' },
        { status: 500 }
      )
    }

    // ── Save to student_results ──────────────────────────────
    const { data: result, error: saveErr } = await supabase
      .from('student_results')
      .upsert({
        student_id:            studentId,
        exam_id:               examId,
        answer_sheet_url:      answerSheetUrl,
        score_percentage:      (analysis as any).score.percentage,
        marks_awarded:         (analysis as any).score.marks_awarded,
        marks_total:           (analysis as any).score.marks_total,
        correct_answers:       (analysis as any).score.correct_answers || 0,
        analysis_json:         analysis,
        overall_confidence:    (analysis.confidence as any)?.overall_confidence || null,
        confidence_reasoning:  (analysis.confidence as any)?.confidence_reasoning,
        student_type:          analysis.student_type,
        has_teacher_check_flags: (analysis.question_analysis as any[])?.some(
          (q: any) => q.needs_teacher_check
        ) ?? false,
        analyzed_at:           new Date().toISOString(),
      }, { onConflict: 'student_id,exam_id' })
      .select()
      .single()

    if (saveErr) {
      console.error('[analyze] Save error:', saveErr)
      throw saveErr
    }

    // ── Trigger Combined Analysis ────────────────────────────
    setTimeout(async () => {
      try {
        const { data: stu } = await supabase.from('students').select('identity_id').eq('id', studentId).single()
        if (stu?.identity_id) {
          await updateCombinedAnalysis(stu.identity_id, session.user.id)
        }
      } catch (err) {
        console.error('[analyze bg task] Combined analysis failed', err)
      }
    }, 0)

    return NextResponse.json({
      data: {
        result_id:        result.id,
        score_percentage: (analysis as any).score.percentage,
        correct_answers:  (analysis as any).score.correct_answers || 0,
        total_questions:  questions.length,
        analysis:         analysis,
      }
    })

  } catch (err) {
    console.error('[POST /api/analyze]', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
