import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

// Get the current session server-side (use in Server Components)
export async function getSession() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// Redirect to /auth/login if no active session (use in protected Server Components)
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  return session
}
