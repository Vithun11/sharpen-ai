import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import ClassTabs from '@/components/class/ClassTabs'

interface Props {
  params: { classId: string }
}

export default async function ClassDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  // Fetch class (RLS ensures it belongs to this teacher)
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', params.classId)
    .eq('teacher_id', session.user.id)
    .single()

  if (clsError || !cls) notFound()

  // Fetch students and exams in parallel
  const [{ data: students }, { data: exams }] = await Promise.all([
    supabase
      .from('students')
      .select('*')
      .eq('class_id', params.classId)
      .order('full_name', { ascending: true }),
    supabase
      .from('exams')
      .select('*')
      .eq('class_id', params.classId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div>
      {/* Page header */}
      <div className="mb-[32px]">
        {/* Breadcrumb */}
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a href="/classes" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:text-[var(--color-teal)] transition-colors duration-150">
            Classes
          </a>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{cls.name}</span>
        </p>

        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {cls.name}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
          {(() => {
            const parts = []
            if (cls.school_name) parts.push(cls.school_name)
            else if (cls.syllabus_type === 'Homeschool') parts.push('Homeschool')
            else if (cls.syllabus_type === 'Tuition / Private') parts.push('Tuition')
            else if (cls.syllabus_type) parts.push(cls.syllabus_type)
            else if (cls.subject && cls.subject !== 'N/A') parts.push(cls.subject)
            
            parts.push(`${students ? students.length : 0} student${students?.length === 1 ? '' : 's'}`)
            return parts.join(' · ')
          })()}
        </p>
      </div>

      {/* Tabs */}
      <ClassTabs
        classId={params.classId}
        className={cls.name}
        classSubject={cls.subject}
        initialStudents={students ?? []}
        initialExams={exams ?? []}
        syllabusType={cls.syllabus_type}
        classStandard={cls.class_standard}
        section={cls.section}
        schoolName={cls.school_name}
      />
    </div>
  )
}
