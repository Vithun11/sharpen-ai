'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, LogOut, Menu, X, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface SidebarProps { teacherName: string, teacherEmail?: string }

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/students',  label: 'Students',  Icon: Users },
  { href: '/classes',   label: 'Classes',   Icon: BookOpen },
]

export default function Sidebar({ teacherName, teacherEmail }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDemoAccount = teacherEmail === 'test@azmuth.app'

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
        {isDemoAccount && (
          <div className="mb-4">
            <a
              href="/demo/sample_question_paper.pdf"
              download
              className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-300 bg-white/10 rounded-md hover:bg-white/20 transition-colors mb-2"
              style={{ fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
            >
              <Download size={16} />
              Question Paper
              <span className="ml-auto text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded text-yellow-500">DEMO</span>
            </a>
            <a
              href="/demo/sample_answer_sheet.pdf"
              download
              className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-300 bg-white/10 rounded-md hover:bg-white/20 transition-colors"
              style={{ fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
            >
              <Download size={16} />
              Answer Sheet
              <span className="ml-auto text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded text-yellow-500">DEMO</span>
            </a>
          </div>
        )}
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
