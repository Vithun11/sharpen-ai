import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

// Allow up to 60s for AI extraction on Vercel
export const maxDuration = 60

// ─── Universal AI provider config ──────────────────────────
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'anthropic'
const AI_API_KEY  = process.env.AI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''
const AI_MODEL    = process.env.AI_MODEL ?? 'claude-sonnet-4-20250514'

const EXTRACT_PROMPT = `Extract all questions from this exam paper. For each question return:
- question_number (integer starting from 1)
- question_text (the full question as written)
- topic (infer the topic, e.g. 'Linear Equations', 'Fractions', 'Photosynthesis')
- difficulty ('easy', 'medium', or 'hard' based on complexity)
- expected_method (brief description of the correct approach)

Return ONLY a valid JSON array of objects with these exact keys. No explanation. No markdown. No code blocks.`

const STRICT_PROMPT = `${EXTRACT_PROMPT}

IMPORTANT: Your entire response must be a raw JSON array starting with [ and ending with ]. Nothing else.`

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'

async function extractWithAnthropic(base64Data: string, mediaType: SupportedMediaType, useStrict = false) {
  const client = new Anthropic({ apiKey: AI_API_KEY })

  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: 'You are an expert at reading exam papers. Extract every question clearly and accurately.',
    messages: [{
      role: 'user',
      content: [
        contentBlock,
        { type: 'text', text: useStrict ? STRICT_PROMPT : EXTRACT_PROMPT },
      ],
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function extractWithOpenAI(base64Data: string, mediaType: SupportedMediaType, useStrict = false) {
  const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1'
  const dataUrl = `data:${mediaType};base64,${base64Data}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are an expert at reading exam papers. Extract every question clearly and accurately.' },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: useStrict ? STRICT_PROMPT : EXTRACT_PROMPT },
          ],
        },
      ],
    }),
  })
  const json = await response.json()
  return json.choices?.[0]?.message?.content ?? ''
}

function parseQuestionsJSON(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Response is not a JSON array')
  return parsed
}

export async function POST(request: Request, { params }: { params: { examId: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const serviceClient = createServiceClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const examId = params.examId
    
    // Verify ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('id, class_id, question_paper_url, classes!inner(teacher_id)')
      .eq('id', examId)
      .single()
      
    if (!exam || (exam.classes as any).teacher_id !== session.user.id) {
      return NextResponse.json({ error: 'Exam not found or access denied.' }, { status: 403 })
    }

    // ── Parse JSON body (file already in Supabase Storage) ───
    const body = await request.json()
    const filePath = body.file_path as string
    const fileType = body.file_type as string

    if (!filePath) return NextResponse.json({ error: 'file_path is required.' }, { status: 400 })

    // Download file from Supabase Storage
    const { data: fileData, error: dlError } = await serviceClient.storage
      .from('question-papers')
      .download(filePath)

    if (dlError || !fileData) {
      console.error('[replace-paper] Download error:', dlError)
      return NextResponse.json({ error: 'Failed to download uploaded file.' }, { status: 500 })
    }

    const allowed: SupportedMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const mediaType = (fileType || fileData.type) as SupportedMediaType
    if (!allowed.includes(mediaType)) {
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 })
    }

    // Delete old question paper from storage
    const oldUrl = exam.question_paper_url
    if (oldUrl) {
      const { error: removeErr } = await serviceClient.storage.from('question-papers').remove([oldUrl])
      if (removeErr) console.error('[replace-paper] Failed to delete old question paper', removeErr)
    }

    // The file is already in storage at filePath, use it as the new URL
    const newQuestionPaperUrl = filePath

    // ── MOCK MODE (MOCK_AI=true in .env.local) ───────────────
    if (process.env.MOCK_AI === 'true') {
      const mockQuestions = [
        { question_number: 1, question_text: 'Solve for x: 2x + 5 = 13', topic: 'Linear Equations', difficulty: 'easy', expected_method: 'Isolate x' },
        { question_number: 2, question_text: 'Find the area of a circle with radius 7 cm.', topic: 'Mensuration', difficulty: 'medium', expected_method: 'A = πr²' },
      ]
      
      // Update DB
      await serviceClient.from('questions').delete().eq('exam_id', examId)
      const qInserts = mockQuestions.map(q => ({ exam_id: examId, ...q }))
      await serviceClient.from('questions').insert(qInserts)
      await serviceClient.from('exams').update({ question_paper_url: newQuestionPaperUrl, total_questions: mockQuestions.length }).eq('id', examId)
      
      return NextResponse.json({ success: true, questions: mockQuestions, question_paper_url: newQuestionPaperUrl })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64Data = buffer.toString('base64')

    // AI Extraction
    let rawText: string
    try {
      rawText = AI_PROVIDER === 'openai' || AI_PROVIDER === 'openai-compatible'
        ? await extractWithOpenAI(base64Data, mediaType, false)
        : await extractWithAnthropic(base64Data, mediaType, false)
    } catch (err) {
      rawText = AI_PROVIDER === 'openai' || AI_PROVIDER === 'openai-compatible'
        ? await extractWithOpenAI(base64Data, mediaType, true)
        : await extractWithAnthropic(base64Data, mediaType, true)
    }

    let questions
    try {
      questions = parseQuestionsJSON(rawText)
    } catch {
      try {
        const retryText = AI_PROVIDER === 'openai' || AI_PROVIDER === 'openai-compatible'
          ? await extractWithOpenAI(base64Data, mediaType, true)
          : await extractWithAnthropic(base64Data, mediaType, true)
        questions = parseQuestionsJSON(retryText)
      } catch {
        return NextResponse.json({ error: 'Could not extract questions from this file.' }, { status: 422 })
      }
    }

    // Proceed to delete and insert
    await serviceClient.from('questions').delete().eq('exam_id', examId)

    const questionsToInsert = questions.map((q: any, idx: number) => ({
      exam_id: examId,
      question_number: q.question_number ?? idx + 1,
      question_text: q.question_text,
      topic: q.topic ?? null,
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty ?? '') ? q.difficulty : null,
      expected_method: q.expected_method ?? null,
    }))

    const { error: qErr } = await serviceClient.from('questions').insert(questionsToInsert)
    if (qErr) throw qErr

    await serviceClient.from('exams').update({ question_paper_url: newQuestionPaperUrl, total_questions: questionsToInsert.length }).eq('id', examId)

    return NextResponse.json({ success: true, questions: questionsToInsert, question_paper_url: newQuestionPaperUrl })
  } catch (err) {
    console.error('[POST /api/exams/[examId]/replace-paper]', err)
    return NextResponse.json({ error: 'Failed to replace paper.' }, { status: 500 })
  }
}
