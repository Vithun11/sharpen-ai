import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/classes — list all classes for authenticated teacher (with student count)
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*, students(count)')
      .eq('teacher_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Flatten student count from nested array
    const classes = (data ?? []).map((c) => ({
      ...c,
      student_count: (c.students as unknown as { count: number }[])[0]?.count ?? 0,
      students: undefined,
    }))

    return NextResponse.json({ data: classes })
  } catch (err) {
    console.error('[GET /api/classes]', err)
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
  }
}

// POST /api/classes — create a new class
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, subject, syllabus_type, class_standard, section, school_name } = body

    if (!name?.trim() || !subject?.trim()) {
      return NextResponse.json(
        { error: 'Class name and subject are required.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_id: session.user.id,
        name: name.trim(),
        subject: subject.trim(),
        syllabus_type: syllabus_type?.trim() || null,
        class_standard: class_standard?.trim() || null,
        section: section?.trim() || null,
        school_name: school_name?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/classes]', err)
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
  }
}
