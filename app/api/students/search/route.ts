import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/students/search?q=query — autocomplete search by name
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ data: [] })
    }

    // Join with students to retrieve a previous roll_number if available
    const { data: identities, error } = await supabase
      .from('student_identities')
      .select(`
        id,
        full_name,
        email,
        imei_number,
        students (
          roll_number
        )
      `)
      .eq('teacher_id', session.user.id)
      .ilike('full_name', `%${query}%`)
      .order('full_name', { ascending: true })
      .limit(10)

    if (error) throw error

    // Format the result to flatten the roll_number from students array
    const formattedData = identities.map((item: any) => {
      const rollNumbers = item.students?.map((s: any) => s.roll_number).filter(Boolean).map(Number) || []
      return {
        id: item.id,
        full_name: item.full_name,
        email: item.email,
        imei_number: item.imei_number,
        roll_number: rollNumbers.length > 0 ? Math.max(...rollNumbers) : item.students?.[0]?.roll_number || null,
      }
    })

    return NextResponse.json({ data: formattedData })
  } catch (err) {
    console.error('[GET /api/students/search]', err)
    return NextResponse.json({ error: 'Failed to search students' }, { status: 500 })
  }
}
