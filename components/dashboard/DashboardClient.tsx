'use client'

import Link from 'next/link'
import { BookOpen, Users, Plus, FileText, ArrowRight, AlertCircle } from 'lucide-react'

interface RecentClass {
  id: string
  name: string
  subject: string
  studentCount: number
}

interface Props {
  teacherName: string
  totalClasses: number
  totalStudents: number
  totalExams: number
  recentClasses: RecentClass[]
  lowConfidenceCount: number
}

export default function DashboardClient({ teacherName, totalClasses, totalStudents, totalExams, recentClasses, lowConfidenceCount }: Props) {
  const hasClasses = totalClasses > 0

  return (
    <div>
      {/* Page header */}
      <div className="mb-[32px]">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
          Welcome back, {teacherName}
        </p>
      </div>

      {lowConfidenceCount > 0 && (
        <div className="mb-8 p-4 rounded-[12px] flex items-center justify-between" style={{ backgroundColor: 'var(--color-score-mid-bg)', border: '1px solid var(--color-yellow)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} color="var(--color-yellow-dark)" />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-yellow-dark)', fontWeight: 500 }}>
              {lowConfidenceCount} {lowConfidenceCount === 1 ? 'student analysis has' : 'student analyses have'} been flagged with low confidence in the last 7 days. Manual review required.
            </p>
          </div>
          <Link href="/classes" style={{ textDecoration: 'none', color: 'var(--color-yellow-dark)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Review flagged students <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {hasClasses ? (
        <>
          {/* Stat cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
            <StatCard label="TOTAL CLASSES" value={totalClasses} Icon={BookOpen} />
            <StatCard label="TOTAL STUDENTS" value={totalStudents} Icon={Users} />
            <StatCard label="TOTAL EXAMS" value={totalExams} Icon={FileText} />
          </div>

          {/* Quick Access Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                QUICK ACCESS
              </p>
              <Link href="/classes" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  View All Classes
                  <ArrowRight size={14} />
                </button>
              </Link>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {recentClasses.map(cls => (
                <div key={cls.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '140px' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {cls.name}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {cls.subject !== 'N/A' ? cls.subject : '—'}
                  </p>
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', marginRight: '4px' }}>{cls.studentCount}</span>
                      students
                    </p>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <Link href={`/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn-secondary" style={{ width: '100%' }}>
                        Open
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
              
              {recentClasses.length === 0 && (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', backgroundColor: 'var(--color-teal-light)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>No recent classes</p>
                  <Link href="/classes" style={{ textDecoration: 'none' }}>
                    <button className="btn-primary">Create your first class</button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-teal-light)', marginBottom: '20px' }}>
            <BookOpen size={24} color="var(--color-teal-dark)" strokeWidth={1.8} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Welcome to Azmuth
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '320px', marginBottom: '24px' }}>
            Create your first class to get started. Add students, upload exams, and let AI do the analysis.
          </p>
          <Link href="/classes" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} strokeWidth={2.2} />
              Create your first class
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, Icon }: { label: string; value: number; Icon: React.ElementType }) {
  return (
    <div className="card" style={{ minHeight: '120px', padding: '28px', display: 'flex', flexDirection: 'column', transition: 'box-shadow 150ms ease-out' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}>
      <div style={{ marginBottom: '16px' }}>
        <Icon size={20} color="var(--color-cognitive-text)" strokeWidth={2.2} />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '8px' }}>
        {value}
      </p>
      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 'auto' }}>
        {label}
      </p>
    </div>
  )
}
