import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { ANALYSIS_PROMPT } from '@/lib/prompts'
import { updateCombinedAnalysis } from '@/lib/combined-analysis'

// Allow up to 60s for AI analysis on Vercel
export const maxDuration = 60

const ANALYSIS_TIMEOUT_MS = 55_000  // slightly under maxDuration

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

function buildPrompt(questionsJson: string): string {
  return ANALYSIS_PROMPT.replace(
    '1. The exam questions with expected methods\n2. The student\'s handwritten answer sheet (as an image)',
    `1. The exam questions with expected methods:\n${questionsJson}\n2. The student's handwritten answer sheet (as an image)`
  )
}

async function callAI(base64: string, mimeType: string, prompt: string, attempt: number): Promise<string> {
  const apiKey   = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY
  const model    = process.env.AI_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
  const provider = process.env.AI_PROVIDER ?? 'anthropic'

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS)

  const strictSuffix = attempt > 1 ? '\n\nIMPORTANT: Return ONLY valid JSON. Nothing else.' : ''
  const fullPrompt   = prompt + strictSuffix

  try {
    if (provider === 'openai-compatible' || provider === 'openai') {
      const baseUrl  = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1'
      const dataUrl  = `data:${mimeType};base64,${base64}`

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: 'You are an expert educational analyst. Analyze student exam answers with precision and generate structured learning insights.' },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: fullPrompt }] },
          ],
        }),
      })
      clearTimeout(timer)
      if (!res.ok) { const e = await res.text(); throw new Error(`API error ${res.status}: ${e}`) }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-api-key': apiKey!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: 'You are an expert educational analyst. Analyze student exam answers with precision and generate structured learning insights.',
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }, { type: 'text', text: fullPrompt }] }],
      }),
    })
    clearTimeout(timer)
    if (!res.ok) { const e = await res.text(); throw new Error(`Claude error ${res.status}: ${e}`) }
    const data = await res.json()
    return data.content?.[0]?.text ?? ''

  } catch (err) {
    clearTimeout(timer)
    if ((err as Error).name === 'AbortError') throw new Error('TIMEOUT')
    throw err
  }
}

export async function POST(request: Request, { params }: { params: { resultId: string } }) {
  try {
    const supabase    = createServerSupabaseClient()
    const serviceClient = createServiceClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resultId = params.resultId

    // Get current result
    const { data: currentResult } = await supabase
      .from('student_results')
      .select('id, student_id, exam_id, answer_sheet_url, exams(class_id), students(identity_id)')
      .eq('id', resultId)
      .single()

    if (!currentResult) return NextResponse.json({ error: 'Result not found.' }, { status: 404 })

    const studentId = currentResult.student_id
    const examId = currentResult.exam_id
    const classId = (currentResult.exams as any).class_id
    const identityId = (currentResult.students as any).identity_id

    const { data: cls } = await supabase.from('classes').select('id').eq('id', classId).eq('teacher_id', session.user.id).single()
    if (!cls) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

    // ── Parse JSON body (file already in Supabase Storage) ───
    const body = await request.json()
    const filePath = body.file_path as string
    const fileType = body.file_type as string

    if (!filePath) return NextResponse.json({ error: 'file_path is required.' }, { status: 400 })

    // Download file from Supabase Storage
    const { data: fileData, error: dlError } = await serviceClient.storage
      .from('answer-sheets')
      .download(filePath)

    if (dlError || !fileData) {
      console.error('[replace-sheet] Download error:', dlError)
      return NextResponse.json({ error: 'Failed to download uploaded file.' }, { status: 500 })
    }

    const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!ALLOWED.includes(fileType || fileData.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and PDF files are supported.' }, { status: 400 })
    }

    const { data: questions } = await supabase
      .from('questions')
      .select('question_number, question_text, topic, difficulty, expected_method')
      .eq('exam_id', examId)
      .order('question_number', { ascending: true })

    if (!questions || questions.length === 0) return NextResponse.json({ error: 'No questions found for this exam.' }, { status: 400 })

    // Old file cleanup
    if (currentResult.answer_sheet_url) {
       await serviceClient.storage.from('answer-sheets').remove([currentResult.answer_sheet_url])
    }

    // The file is already uploaded at filePath
    const answerSheetUrl = filePath

    // Execute Analysis
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64   = buffer.toString('base64')
    const mimeType = (fileType || fileData.type) === 'application/pdf' ? 'image/jpeg' : (fileType || fileData.type) as 'image/jpeg' | 'image/png'
    const prompt   = buildPrompt(JSON.stringify(questions, null, 2))

    let analysisJson: Record<string, unknown> | null = null

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw     = await callAI(base64, mimeType, prompt, attempt)
        const cleaned = stripFences(raw)
        analysisJson  = JSON.parse(cleaned)
        break
      } catch (err) {
        const msg = (err as Error).message
        if (msg === 'TIMEOUT') return NextResponse.json({ error: 'Analysis timed out.' }, { status: 504 })
        if (attempt === 2) return NextResponse.json({ error: 'Could not read the answer sheet. Try a clearer image.' }, { status: 500 })
      }
    }

    if (!analysisJson) return NextResponse.json({ error: 'Could not parse response.' }, { status: 500 })

    const score = (analysisJson.score as any) ?? {}
    const correctAnswers  = score.correct_answers  ?? 0
    const scorePercentage = score.percentage       ?? 0

    const { data: updatedResult, error: saveErr } = await serviceClient
      .from('student_results')
      .update({
        answer_sheet_url: answerSheetUrl,
        score_percentage: scorePercentage,
        correct_answers:  correctAnswers,
        analysis_json:    analysisJson,
        analyzed_at:      new Date().toISOString(),
      })
      .eq('id', resultId)
      .select()
      .single()

    if (saveErr) throw saveErr

    if (identityId) {
      setTimeout(async () => {
        try { await updateCombinedAnalysis(identityId, session.user.id) }
        catch (err) { console.error('[bg task] updateCombinedAnalysis failed', err) }
      }, 0)
    }

    return NextResponse.json({
      data: {
        result_id:        updatedResult.id,
        score_percentage: scorePercentage,
        correct_answers:  correctAnswers,
        total_questions:  questions.length,
        analysis:         analysisJson,
      }
    })

  } catch (err) {
    console.error('[POST /api/results/[resultId]/replace-sheet]', err)
    return NextResponse.json({ error: 'Replacement failed.' }, { status: 500 })
  }
}
