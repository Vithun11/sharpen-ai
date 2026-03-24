'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { BookOpen, Users, Plus, ChevronRight, FileText } from 'lucide-react'
import CreateClassModal from '@/components/class/CreateClassModal'

interface ClassWithCount {
  id: string
  name: string
  subject: string
  school_name: string | null
  syllabus_type: string | null
  student_count: number
  exam_count: number
  created_at: string
}

interface Props {
  initialClasses: ClassWithCount[]
}

export default function ClassesClient({ initialClasses }: Props) {
  const [classes, setClasses] = useState<ClassWithCount[]>(initialClasses)
  const [showModal, setShowModal] = useState(false)

  const refreshClasses = useCallback(async () => {
    const res = await fetch('/api/classes')
    const json = await res.json()
    // ensure json.data includes exam_count when fetched from API route
    if (json.data) setClasses(json.data)
  }, [])

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '28px', color: 'var(--text-primary)' }}>
          Classes
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={16} strokeWidth={2.2} style={{ marginRight: '8px' }} />
          Create Class
        </button>
      </div>

      {classes.length === 0 ? (
        /* Empty state */
        <div 
          className="card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 0' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-teal-light)', marginBottom: '20px' }}>
            <BookOpen size={24} color="var(--color-teal-dark)" strokeWidth={1.8} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            No classes yet
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '320px', marginBottom: '24px' }}>
            Create your first class to start adding students and uploading exams.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Create Class
          </button>
        </div>
      ) : (
        /* Class grid */
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateClassModal
          onClose={() => setShowModal(false)}
          onCreated={refreshClasses}
        />
      )}
    </>
  )
}

function ClassCard({ cls }: { cls: ClassWithCount }) {
  const secondaryLabel = (() => {
    if (cls.school_name) return cls.school_name
    if (cls.syllabus_type === 'Homeschool') return 'Homeschool'
    if (cls.syllabus_type === 'Tuition / Private') return 'Tuition'
    if (cls.syllabus_type) return cls.syllabus_type
    if (!cls.school_name && !cls.syllabus_type && cls.subject && cls.subject !== 'N/A') return cls.subject
    return ''
  })()

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
      {/* Class name & subject */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cls.name}
        </h3>
        {secondaryLabel && (
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {secondaryLabel}
          </p>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>
            {cls.student_count}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
            students
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={14} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>
            {cls.exam_count || 0}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>
            exams
          </span>
        </div>
      </div>

      {/* View link */}
      <div style={{ marginTop: 'auto' }}>
        <Link
          href={`/classes/${cls.id}`}
          style={{ textDecoration: 'none' }}
        >
          <button className="btn-secondary" style={{ width: '100%' }}>
            Open Class
          </button>
        </Link>
      </div>
    </div>
  )
}
