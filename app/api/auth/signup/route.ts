import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: full_name.trim() } },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Supabase returns an empty identities array if the email is already in use
    // (when email confirmations are enabled).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: data.user?.id })
  } catch (err) {
    console.error('[POST /api/auth/signup]', err)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
