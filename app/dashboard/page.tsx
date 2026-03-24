import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name')
    .eq('id', session.user.id)
    .single()

  const { count: classCount } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', session.user.id)

  const { data: teacherClasses } = await supabase
    .from('classes')
    .select('id, name, subject, created_at')
    .eq('teacher_id', session.user.id)
    .order('created_at', { ascending: false })

  const classIds = (teacherClasses ?? []).map((c) => c.id)

  const { count: studentCount } = classIds.length > 0
    ? await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)
    : { count: 0 }

  const { count: examCount } = classIds.length > 0
    ? await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)
    : { count: 0 }

  const recentClassData = (teacherClasses ?? []).slice(0, 3)
  const recentClassIds = recentClassData.map(c => c.id)

  const { data: recentStudents } = recentClassIds.length > 0
    ? await supabase
        .from('students')
        .select('class_id')
        .in('class_id', recentClassIds)
    : { data: [] }
    
  const recentClasses = recentClassData.map(c => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    studentCount: (recentStudents ?? []).filter((s: any) => s.class_id === c.id).length
  }))

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: myExams } = classIds.length > 0 
    ? await supabase.from('exams').select('id').in('class_id', classIds) 
    : { data: [] }
  const myExamIds = (myExams || []).map(e => e.id)

  const { data: recentLowConfidence } = myExamIds.length > 0
    ? await supabase
        .from('student_results')
        .select('id')
        .lt('overall_confidence', 70)
        .gte('analyzed_at', sevenDaysAgo.toISOString())
        .in('exam_id', myExamIds)
    : { data: [] }

  const lowConfidenceCount = recentLowConfidence?.length || 0

  return (
    <DashboardClient
      teacherName={teacher?.full_name || 'Teacher'}
      totalClasses={classCount ?? 0}
      totalStudents={studentCount ?? 0}
      totalExams={examCount ?? 0}
      recentClasses={recentClasses}
      lowConfidenceCount={lowConfidenceCount}
    />
  )
}
