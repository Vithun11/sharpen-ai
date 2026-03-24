import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { anthropic, HAIKU } from '@/lib/ai-clients'

// Allow up to 60s for AI extraction on Vercel
export const maxDuration = 60

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

async function extractWithAnthropic(
  base64Data: string,
  mediaType: SupportedMediaType,
  useStrict = false
) {
  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } }

  const response = await anthropic.messages.create({
    model: HAIKU,
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



function parseQuestionsJSON(raw: string) {
  // Strip any markdown code fences if the model wraps in them
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Response is not a JSON array')
  return parsed
}

// POST /api/exams/extract-questions
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const serviceClient = createServiceClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      console.error('[extract-questions] Download error:', dlError)
      return NextResponse.json({ error: 'Failed to download uploaded file.' }, { status: 500 })
    }

    // Validate type
    const allowed: SupportedMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const mediaType = (fileType || fileData.type) as SupportedMediaType
    if (!allowed.includes(mediaType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a JPG, PNG, or PDF.' },
        { status: 400 }
      )
    }

    // ── MOCK MODE (MOCK_AI=true in .env.local) ───────────────
    if (process.env.MOCK_AI === 'true') {
      console.log('[extract-questions] MOCK_AI mode — returning mock questions')
      const mockQuestions = [
        { question_number: 1, question_text: 'Solve for x: 2x + 5 = 13', topic: 'Linear Equations', difficulty: 'easy', expected_method: 'Isolate x by subtracting 5 then dividing by 2' },
        { question_number: 2, question_text: 'Find the area of a circle with radius 7 cm. (Use π = 22/7)', topic: 'Mensuration', difficulty: 'easy', expected_method: 'Apply A = πr² and compute' },
        { question_number: 3, question_text: 'If a train travels 240 km in 3 hours, find its speed in km/h. If it then travels at 90 km/h for 2 hours, find total distance.', topic: 'Speed, Distance & Time', difficulty: 'medium', expected_method: 'Speed = Distance / Time, then add distances' },
        { question_number: 4, question_text: 'Factorise: x² + 7x + 12', topic: 'Algebra – Factorisation', difficulty: 'medium', expected_method: 'Find two numbers that multiply to 12 and add to 7, then write as (x+3)(x+4)' },
        { question_number: 5, question_text: 'In triangle ABC, angle A = 60°, angle B = 75°. Find angle C. If BC = 8 cm and AC = 6 cm, find the length of the altitude from A to BC.', topic: 'Triangles & Geometry', difficulty: 'hard', expected_method: 'Use angle sum property then apply area formula to find altitude' },
      ]
      return NextResponse.json({ data: mockQuestions })
    }

    // Convert to base64
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64Data = buffer.toString('base64')

    // Extract questions with retry
    let rawText: string
    try {
      rawText = await extractWithAnthropic(base64Data, mediaType, false)
    } catch (err) {
      console.error('[extract] First attempt failed, retrying strictly', err)
      rawText = await extractWithAnthropic(base64Data, mediaType, true)
    }

    // Parse JSON
    let questions
    try {
      questions = parseQuestionsJSON(rawText)
    } catch {
      // Retry with stricter prompt if parsing fails
      try {
        const retryText = await extractWithAnthropic(base64Data, mediaType, true)
        questions = parseQuestionsJSON(retryText)
      } catch {
        return NextResponse.json(
          { error: 'Could not extract questions from this file. Please try a clearer image or PDF.' },
          { status: 422 }
        )
      }
    }

    return NextResponse.json({ data: questions })
  } catch (err) {
    console.error('[POST /api/exams/extract-questions]', err)
    return NextResponse.json({ error: 'Failed to extract questions. Please try again.' }, { status: 500 })
  }
}
