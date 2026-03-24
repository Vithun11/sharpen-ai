import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import ClassesClient from '@/components/class/ClassesClient'

export default async function ClassesPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data } = await supabase
    .from('classes')
    .select('*, students(count), exams(count)')
    .eq('teacher_id', session.user.id)
    .order('created_at', { ascending: false })

  const classes = (data ?? []).map((c) => ({
    ...c,
    student_count: (c.students as unknown as { count: number }[])[0]?.count ?? 0,
    exam_count: (c.exams as unknown as { count: number }[])[0]?.count ?? 0,
    students: undefined,
    exams: undefined,
  }))

  return <ClassesClient initialClasses={classes} />
}
