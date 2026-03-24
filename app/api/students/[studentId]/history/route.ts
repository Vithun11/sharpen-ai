import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get the current student row
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*, class:classes(name, subject, school_name)')
      .eq('id', params.studentId)
      .single()

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    let results = []
    let combined_analysis = null

    // 2 & 3. If identity_id exists, fetch cross-class results. Otherwise fetch just for this student.
    if (student.identity_id) {
      // Find all student rows that share this identity_id
      const { data: siblingStudents } = await supabase
        .from('students')
        .select('id')
        .eq('identity_id', student.identity_id)

      const siblingIds = siblingStudents?.map(s => s.id) || [params.studentId]

      const { data: histResults, error: histErr } = await supabase
        .from('student_results')
        .select(`
          *,
          exam:exams (
            id,
            title,
            subject,
            class_id,
            created_at,
            class:classes(name)
          )
        `)
        .in('student_id', siblingIds)
        .order('created_at', { ascending: true })

      if (!histErr) results = histResults || []

      // 5. Fetch combined analysis
      const { data: combo } = await supabase
        .from('student_combined_analysis')
        .select('*')
        .eq('identity_id', student.identity_id)
        .single()
      
      if (combo) combined_analysis = combo

    } else {
      // No identity linked yet, just get results for this specific student_id
      const { data: singleResults, error: singleErr } = await supabase
        .from('student_results')
        .select(`
          *,
          exam:exams (
            id,
            title,
            subject,
            class_id,
            created_at,
            class:classes(name)
          )
        `)
        .eq('student_id', params.studentId)
        .order('created_at', { ascending: true })

      if (!singleErr) results = singleResults || []
    }

    const all_exams = results.map((r: any) => r.exam).filter(Boolean)

    return NextResponse.json({
      data: {
        student,
        results,
        combined_analysis,
        all_exams
      }
    })
  } catch (err) {
    console.error('[GET /api/students/[studentId]/history]', err)
    return NextResponse.json({ error: 'Failed to fetch student history' }, { status: 500 })
  }
}
