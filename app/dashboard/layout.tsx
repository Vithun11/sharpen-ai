import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import ContextSidebar from '@/components/ContextSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth guard
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch teacher name for sidebar
  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name')
    .eq('id', session.user.id)
    .single()

  const teacherName = teacher?.full_name ?? session.user.email ?? 'Teacher'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0FAFA' }}>
      <Sidebar teacherName={teacherName} />

      {/* Main content — offset by sidebar width */}
      <main className="main">
        <div className="flex-1 min-h-screen">
          <div className="xl:grid xl:grid-cols-[1fr_300px] min-h-screen">
            <div className="min-w-0">
              {children}
            </div>
            <div className="hidden xl:block sticky top-0 h-screen overflow-y-auto border-l border-[#D6EEEE] bg-[#F0FAFA]">
              <ContextSidebar />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
