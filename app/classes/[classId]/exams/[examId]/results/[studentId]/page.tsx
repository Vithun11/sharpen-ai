import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import StudentReportClient from '@/components/report/StudentReportClient'

interface Props {
  params: { classId: string; examId: string; studentId: string }
}

export default async function StudentReportPage({ params }: Props) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  // Fetch all needed data in parallel
  const [studentRes, examRes, resultRes] = await Promise.all([
    supabase.from('students').select('*, classes!inner(teacher_id, name)').eq('id', params.studentId).single(),
    supabase.from('exams').select('*, classes!inner(teacher_id, name, syllabus_type, class_standard, section, school_name)').eq('id', params.examId).single(),
    supabase.from('student_results').select('*').eq('student_id', params.studentId).eq('exam_id', params.examId).maybeSingle(),
  ])

  const student = studentRes.data
  const exam    = examRes.data
  const result  = resultRes.data

  // Verify teacher owns this class
  if (!student || !exam) notFound()
  if ((exam.classes as { teacher_id: string }).teacher_id !== session.user.id) notFound()

  const className = (exam.classes as { name: string }).name

  if (!result) {
    return (
      <div>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          <Link href={`/classes/${params.classId}/exams/${params.examId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Back to {exam.title}
          </Link>
        </p>
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-[8px]"
          style={{ border: '1px dashed var(--color-border)' }}>
          <h2 className="font-semibold mb-2" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>No analysis yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Upload {student.full_name}&apos;s answer sheet to generate their report.
          </p>
          <Link href={`/classes/${params.classId}/exams/${params.examId}`}
            className="text-sm font-medium text-white px-4 py-2 rounded-[6px]"
            style={{ backgroundColor: 'var(--color-teal)', textDecoration: 'none' }}>
            Upload Answer Sheet
          </Link>
        </div>
      </div>
    )
  }

  const teacherName = session.user.user_metadata?.full_name || session.user.email || 'Teacher'

  return (
    <StudentReportClient
      student={student}
      exam={exam}
      className={className}
      classId={params.classId}
      result={result}
      teacherName={teacherName}
      syllabusType={(exam.classes as any).syllabus_type}
      classStandard={(exam.classes as any).class_standard}
      section={(exam.classes as any).section}
      schoolName={(exam.classes as any).school_name}
    />
  )
}
