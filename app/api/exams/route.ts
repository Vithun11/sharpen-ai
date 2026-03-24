import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/exams?class_id=xxx — list exams for a class
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    if (!classId) return NextResponse.json({ error: 'class_id is required.' }, { status: 400 })

    // Verify class belongs to teacher
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', session.user.id)
      .single()
    if (!cls) return NextResponse.json({ error: 'Class not found.' }, { status: 404 })

    const { data, error } = await supabase
      .from('exams')
      .select('*, questions(count)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const exams = (data ?? []).map((e) => ({
      ...e,
      question_count: (e.questions as unknown as { count: number }[])[0]?.count ?? 0,
      questions: undefined,
    }))

    return NextResponse.json({ data: exams })
  } catch (err) {
    console.error('[GET /api/exams]', err)
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 })
  }
}

// POST /api/exams — create exam + questions atomically
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { class_id, title, subject, questions, file_path } = body

    if (!class_id || !title?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: 'class_id, title, and subject are required.' }, { status: 400 })
    }

    // Verify class belongs to teacher
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', class_id)
      .eq('teacher_id', session.user.id)
      .single()
    if (!cls) return NextResponse.json({ error: 'Class not found.' }, { status: 404 })

    // 1. Create exam
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .insert({
        class_id,
        title: title.trim(),
        subject: subject.trim(),
        total_questions: questions?.length ?? 0,
        question_paper_url: file_path ?? null,
      })
      .select()
      .single()

    if (examErr || !exam) throw examErr ?? new Error('Failed to create exam')

    // 2. Insert questions (if any)
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: {
        question_number: number
        question_text: string
        topic?: string
        difficulty?: string
        expected_method?: string
      }, idx: number) => ({
        exam_id: exam.id,
        question_number: q.question_number ?? idx + 1,
        question_text: q.question_text,
        topic: q.topic ?? null,
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty ?? '')
          ? q.difficulty
          : null,
        expected_method: q.expected_method ?? null,
      }))

      const { error: qErr } = await supabase.from('questions').insert(questionsToInsert)

      if (qErr) {
        // Clean up the exam if questions fail
        await supabase.from('exams').delete().eq('id', exam.id)
        throw qErr
      }
    }

    return NextResponse.json({ data: exam }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/exams]', err)
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 })
  }
}
