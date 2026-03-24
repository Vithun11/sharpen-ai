import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import StudentsClient from './StudentsClient'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch all identities for this teacher
  const { data: identities, error } = await supabase
    .from('student_identities')
    .select(`
      id,
      full_name,
      email,
      imei_number,
      students (
        id,
        class_id,
        student_results ( id )
      ),
      student_combined_analysis (
        overall_average_score,
        total_exams_taken,
        most_common_type
      )
    `)
    .eq('teacher_id', session.user.id)

  if (error) {
    console.error('Error fetching students:', error)
  }

  // Transform data for the client component
  const studentData = (identities || []).map((identity: any) => {
    // Count unique classes
    const classIds = new Set(identity.students?.map((s: any) => s.class_id) || [])
    
    // Count exams analyzed (from combined analysis or by counting results)
    const combined = identity.student_combined_analysis?.[0] || identity.student_combined_analysis
    const examsTaken = combined?.total_exams_taken ?? 
      identity.students?.reduce((total: number, s: any) => total + (s.student_results?.length || 0), 0) ?? 0

    // Get the most recent class link (just pick the first available student record)
    const firstStudent = identity.students?.[0]
    const historyLink = firstStudent 
      ? `/classes/${firstStudent.class_id}/students/${firstStudent.id}/history`
      : null

    return {
      id: identity.id,
      full_name: identity.full_name,
      email: identity.email,
      imei_number: identity.imei_number,
      classesCount: classIds.size,
      examsTaken,
      averageScore: combined?.overall_average_score ?? null,
      mostCommonType: combined?.most_common_type ?? null,
      historyLink,
    }
  })

  return <StudentsClient initialStudents={studentData} />
}
