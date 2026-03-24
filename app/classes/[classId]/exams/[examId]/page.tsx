import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import ExamDetailClient from '@/components/exam/ExamDetailClient'

interface Props {
  params: { classId: string; examId: string }
}

export default async function ExamDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  // Fetch exam + verify ownership via class
  const { data: exam } = await supabase
    .from('exams')
    .select('*, classes!inner(teacher_id, name, syllabus_type, class_standard)')
    .eq('id', params.examId)
    .single()

  if (!exam || (exam.classes as { teacher_id: string }).teacher_id !== session.user.id) {
    notFound()
  }

  // Fetch questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', params.examId)
    .order('question_number', { ascending: true })

  // Fetch all students in the class
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', params.classId)
    .order('full_name', { ascending: true })

  // Fetch all results for this exam
  const { data: results } = await supabase
    .from('student_results')
    .select('*')
    .eq('exam_id', params.examId)

  const className   = (exam.classes as { name: string }).name
  const resultMap   = Object.fromEntries((results ?? []).map((r) => [r.student_id, r]))

  return (
    <ExamDetailClient
      exam={exam}
      className={className}
      classId={params.classId}
      questions={questions ?? []}
      students={students ?? []}
      initialResultMap={resultMap}
      syllabusType={(exam.classes as any).syllabus_type}
      classStandard={(exam.classes as any).class_standard}
    />
  )
}
