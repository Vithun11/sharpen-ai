'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface SidebarProps { teacherName: string }

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/students',  label: 'Students',  Icon: Users },
  { href: '/classes',   label: 'Classes',   Icon: BookOpen },
]

export default function Sidebar({ teacherName }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const NavItems = () => (
    <>
      <nav className="flex-1 px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navLinks.map(({ href, label, Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 transition-colors duration-150 rounded-md ${
                isActive 
                  ? 'text-white font-semibold' 
                  : 'text-white/65 hover:bg-white/10 hover:text-white/90 font-medium'
              }`}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                textDecoration: 'none',
                ...(isActive ? { backgroundColor: 'var(--color-sidebar-active)', color: 'var(--color-primary-text)' } : {}),
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#E6F7F7', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacherName}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>Teacher</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 transition-colors duration-150 text-white/50 hover:text-white"
          style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────── */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <Image src="/azmuth-logo.png" alt="Azmuth" width={32} height={32} className="rounded-sm" />
          <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: '20px', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span>
        </div>
        <NavItems />
      </aside>

      {/* ── Mobile top bar ─────────────────────────────── */}
      <header className="mobile-topbar flex justify-between items-center px-5 py-4" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
        <div className="flex items-center gap-3">
          <Image src="/azmuth-logo.png" alt="Azmuth" width={28} height={28} className="rounded-sm" />
          <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: '18px', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          {mobileOpen ? <X size={24} color="#FFFFFF" /> : <Menu size={24} color="#FFFFFF" />}
        </button>
      </header>

      {/* ── Mobile drawer ──────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="flex flex-col h-full shadow-2xl transition-transform duration-300 transform translate-x-0"
            style={{ width: '280px', backgroundColor: 'var(--color-sidebar-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <Image src="/azmuth-logo.png" alt="Azmuth" width={32} height={32} className="rounded-sm" />
              <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: '20px', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Azmuth</span>
            </div>
            <NavItems />
          </div>
        </div>
      )}
    </>
  )
}
