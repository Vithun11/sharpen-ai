import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/students?class_id=xxx — list students for a class
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    if (!classId) return NextResponse.json({ error: 'class_id is required.' }, { status: 400 })

    // Verify class belongs to this teacher
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', session.user.id)
      .single()

    if (!cls) return NextResponse.json({ error: 'Class not found.' }, { status: 404 })

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('full_name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/students]', err)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

// POST /api/students — add a student to a class
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { class_id, full_name, roll_number, email, imei_number } = body

    if (!class_id || !full_name?.trim()) {
      return NextResponse.json(
        { error: 'class_id and full_name are required.' },
        { status: 400 }
      )
    }

    // Verify the class belongs to this teacher
    const { data: cls, error: clsErr } = await supabase
      .from('classes')
      .select('id')
      .eq('id', class_id)
      .eq('teacher_id', session.user.id)
      .single()

    if (clsErr || !cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const parsedEmail = email?.trim().toLowerCase() || null
    const parsedImei = imei_number?.trim() || null
    let identityId = null

    // 1. Check if email is provided
    if (parsedEmail) {
      // Look for existing student_identity
      const { data: existingIdentity } = await supabase
        .from('student_identities')
        .select('id')
        .eq('teacher_id', session.user.id)
        .eq('email', parsedEmail)
        .single()

      if (existingIdentity) {
        // 2. Identity found
        identityId = existingIdentity.id
        // Update name
        await supabase
          .from('student_identities')
          .update({
            full_name: full_name.trim(),
            imei_number: parsedImei
          })
          .eq('id', identityId)
      }
    }

    // 3. & 4. Not found or no email provided -> create new identity
    if (!identityId) {
      const { data: newIdentity, error: newIdentityErr } = await supabase
        .from('student_identities')
        .insert({
          teacher_id: session.user.id,
          full_name: full_name.trim(),
          email: parsedEmail,
          imei_number: parsedImei,
        })
        .select()
        .single()
        
      if (newIdentityErr) throw newIdentityErr
      identityId = newIdentity.id
    }

    // 5. Save the student row with identity_id
    const { data, error } = await supabase
      .from('students')
      .insert({
        class_id,
        full_name: full_name.trim(),
        roll_number: roll_number?.trim() || null,
        email: parsedEmail,
        imei_number: parsedImei,
        identity_id: identityId
      })
      .select()
      .single()

    if (error) throw error

    // 6. Return the created student
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/students]', err)
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 })
  }
}
