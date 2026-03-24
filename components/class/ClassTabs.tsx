'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AddStudentModal from '@/components/student/AddStudentModal'
import CreateExamModal from '@/components/exam/CreateExamModal'
import AnalyticsTab from '@/components/class/AnalyticsTab'
import type { Student, Exam } from '@/lib/types'

type Tab = 'students' | 'exams' | 'analytics'

interface Props {
  classId: string
  className: string
  classSubject: string
  initialStudents: Student[]
  initialExams: Exam[]
  syllabusType?: string | null
  classStandard?: string | null
  section?: string | null
  schoolName?: string | null
}

export default function ClassTabs({ classId, className, classSubject, initialStudents, initialExams, syllabusType, classStandard, section, schoolName }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab]       = useState<Tab>('students')
  const [analyticsView, setAnalyticsView] = useState<string>('combined')
  const [students, setStudents]         = useState<Student[]>(initialStudents)
  const [exams, setExams]               = useState<Exam[]>(initialExams)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showCreateExam, setShowCreateExam] = useState(false)

  const refreshStudents = useCallback(async () => {
    const res = await fetch(`/api/students?class_id=${classId}`)
    if (res.ok) { const j = await res.json(); if (j.data) setStudents(j.data) }
  }, [classId])

  const refreshExams = useCallback(async () => {
    const res = await fetch(`/api/exams?class_id=${classId}`)
    if (res.ok) { const j = await res.json(); if (j.data) setExams(j.data) }
  }, [classId])

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '12px 20px',
    borderBottom: activeTab === tab ? '2px solid var(--color-teal)' : '2px solid transparent',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    fontWeight: activeTab === tab ? '600' : '400',
    color: activeTab === tab ? 'var(--color-teal)' : 'var(--text-muted)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    marginBottom: '-2px' // Overlap the container border
  })

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--color-border)', width: '100%', marginBottom: '24px' }}>
        <button style={tabStyle('students')} onClick={() => setActiveTab('students')}>
          Students
        </button>
        <button style={tabStyle('exams')} onClick={() => setActiveTab('exams')}>
          Exams
        </button>
        <button style={tabStyle('analytics')} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
      </div>

      {/* ── Students Tab ── */}
      {activeTab === 'students' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowAddStudent(true)}
              className="btn-primary"
            >
              <UserPlus size={16} strokeWidth={2.2} style={{ marginRight: '8px' }} />
              Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 0', border: '1px dashed var(--color-border)', borderRadius: '10px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Add your first student to get started.</p>
              <button
                onClick={() => setShowAddStudent(true)}
                className="btn-primary"
              >
                <Plus size={16} strokeWidth={2.2} style={{ marginRight: '8px' }} />
                Add student
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Name', 'Roll Number', 'Email'].map((col) => (
                      <th key={col} style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}
                      style={{ borderBottom: i < students.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 150ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <Link href={`/classes/${classId}/students/${s.id}/history`} style={{ textDecoration: 'none' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', display: 'block', transition: 'color 150ms' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-teal)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>
                            {s.full_name}
                          </span>
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)' }}>{s.roll_number ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)' }}>{s.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Exams Tab ── */}
      {activeTab === 'exams' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowCreateExam(true)}
              className="btn-primary"
            >
              <Plus size={16} strokeWidth={2.2} style={{ marginRight: '8px' }} />
              Add Exam
            </button>
          </div>

          {exams.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 0', border: '1px dashed var(--color-border)', borderRadius: '10px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>No exams yet. Create an exam to upload question papers.</p>
              <button
                onClick={() => setShowCreateExam(true)}
                className="btn-primary"
              >
                <Plus size={16} strokeWidth={2.2} style={{ marginRight: '8px' }} />
                Create first exam
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-teal-light)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Exam Title', 'Subject', 'Questions', 'Date', 'Action'].map((col) => (
                      <th key={col} style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam, i) => (
                    <tr key={exam.id}
                      onClick={() => router.push(`/classes/${classId}/exams/${exam.id}`)}
                      style={{ borderBottom: i < exams.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 150ms', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', display: 'block', transition: 'color 150ms' }}>
                          {exam.title}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)' }}>{exam.subject}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)' }}>{exam.total_questions}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/classes/${classId}/exams/${exam.id}`) }}
                          style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 150ms' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-light)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          View Exam
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setAnalyticsView(exam.id)
                            setActiveTab('analytics')
                          }}
                          style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--color-teal)', cursor: 'pointer', transition: 'background 150ms' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-light)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          Analytics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && (
        <AnalyticsTab classId={classId} className={className} subject={classSubject} syllabusType={syllabusType} classStandard={classStandard} section={section} schoolName={schoolName} view={analyticsView} onViewChange={setAnalyticsView} exams={exams} />
      )}

      {/* Modals */}
      {showAddStudent && (
        <AddStudentModal classId={classId} onClose={() => setShowAddStudent(false)} onAdded={refreshStudents} />
      )}
      {showCreateExam && (
        <CreateExamModal
          classId={classId}
          classSubject={classSubject}
          onClose={() => setShowCreateExam(false)}
          onCreated={refreshExams}
        />
      )}
    </>
  )
}
