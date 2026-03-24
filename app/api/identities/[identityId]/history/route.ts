import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: { identityId: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const identityId = params.identityId

    // 1. Get identity
    const { data: identity, error: idErr } = await supabase
      .from('student_identities')
      .select('*')
      .eq('id', identityId)
      .eq('teacher_id', session.user.id)
      .single()

    if (idErr || !identity) {
      return NextResponse.json({ error: 'Student not found or access denied.' }, { status: 404 })
    }

    // 2. Fetch all student rows that share this identity
    const { data: studentRows, error: stuErr } = await supabase
      .from('students')
      .select('id, full_name, class_id, classes(name)')
      .eq('identity_id', identityId)

    if (stuErr) {
      console.error('students err', stuErr)
      return NextResponse.json({ error: 'Failed to fetch student links' }, { status: 500 })
    }

    const mappedStudentIds = studentRows.map(s => s.id)

    // 3. Fetch all student_results & exams
    const { data: results, error: resErr } = await supabase
      .from('student_results')
      .select(`
        *,
        exam:exams (
          id, title, subject, class_id, created_at, date
        )
      `)
      .in('student_id', mappedStudentIds)
      .order('analyzed_at', { ascending: true })

    if (resErr) {
      console.error('results err', resErr)
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    // Filter results where exam exists
    const validResults = (results || []).filter((r: any) => r.exam)

    // Append class names to exams for context
    const enrichedResults = validResults.map((r: any) => {
      const studentRow = studentRows.find(s => s.id === r.student_id)
      if (r.exam && studentRow && studentRow.classes) {
        r.exam.class_name = (studentRow.classes as any).name
      }
      return r
    })

    // 4. Fetch all exams for these classes to track baseline
    const classIds = Array.from(new Set(studentRows.map(s => s.class_id)))
    let allExams: any[] = []
    if (classIds.length > 0) {
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, subject, class_id, created_at, date')
        .in('class_id', classIds)
      allExams = examsData || []
    }

    // 5. Fetch combined analysis
    const { data: combined } = await supabase
      .from('student_combined_analysis')
      .select('*')
      .eq('identity_id', identityId)
      .single()

    return NextResponse.json({
      data: {
        identity,
        student: { full_name: identity.full_name, email: identity.email, imei_number: identity.imei_number, identity_id: identity.id },
        results: enrichedResults,
        combined_analysis: combined || null,
        all_exams: allExams,
        studentRows
      }
    })

  } catch (err) {
    console.error('[GET /api/identities/[identityId]/history]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
