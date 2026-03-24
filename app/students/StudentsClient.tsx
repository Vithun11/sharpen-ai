'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'

interface StudentItem {
  id: string
  full_name: string
  email: string | null
  imei_number: string | null
  classesCount: number
  examsTaken: number
  averageScore: number | null
  mostCommonType: string | null
  historyLink: string | null
}

interface Props {
  initialStudents: StudentItem[]
}

type SortField = 'name' | 'exams' | 'score'
type SortOrder = 'asc' | 'desc'

export default function StudentsClient({ initialStudents }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'name' ? 'asc' : 'desc')
    }
  }

  const filtered = initialStudents.filter((s) => {
    const q = searchQuery.toLowerCase()
    return s.full_name.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q))
  })

  const sorted = [...filtered].sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1
    if (sortField === 'name') {
      return a.full_name.localeCompare(b.full_name) * modifier
    } else if (sortField === 'exams') {
      return (a.examsTaken - b.examsTaken) * modifier
    } else if (sortField === 'score') {
      const scoreA = a.averageScore ?? -1
      const scoreB = b.averageScore ?? -1
      return (scoreA - scoreB) * modifier
    }
    return 0
  })

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="w-4 inline-block" />
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} className="inline ml-1 text-gray-400" />
    ) : (
      <ChevronDown size={14} className="inline ml-1 text-gray-400" />
    )
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return { bg: 'var(--color-teal-light)', text: 'var(--text-muted)' }
    if (score >= 75) return { bg: 'var(--color-score-strong-bg)', text: 'var(--color-green-dark)' }
    if (score >= 50) return { bg: 'var(--color-score-mid-bg)', text: 'var(--color-yellow-dark)' }
    return { bg: 'var(--color-score-weak-bg)', text: 'var(--color-pink-dark)' }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-body)', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              All Students
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
              All students you have ever added, linked by identity
            </p>
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input
              type="text"
              placeholder="Filter by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', height: '40px', fontSize: '14px', fontFamily: 'var(--font-body)' }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {initialStudents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>No students added yet. Add students to your classes to see them here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="table-header-row">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'type', label: 'Type', noSort: true },
                    { key: 'email', label: 'Email', noSort: true },
                    { key: 'imei', label: 'IMEI', noSort: true },
                    { key: 'classes', label: 'Classes', noSort: true },
                    { key: 'exams', label: 'Exams Taken' },
                    { key: 'score', label: 'Average Score' },
                    { key: 'action', label: 'Action', noSort: true }
                  ].map((col) => (
                    <th 
                      key={col.key} 
                      onClick={col.noSort ? undefined : () => handleSort(col.key as SortField)}
                      style={{ cursor: col.noSort ? 'default' : 'pointer' }}
                    >
                      {col.label} {!col.noSort && renderSortIcon(col.key as SortField)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>
                      No students match your search.
                    </td>
                  </tr>
                ) : (
                  sorted.map((student, i) => {
                    const scoreColors = getScoreColor(student.averageScore)
                    return (
                      <tr 
                        key={student.id} 
                        style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 150ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-background)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <Link 
                            href={`/students/${student.id}/overview`}
                            style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 150ms' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-teal)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          >
                            {student.full_name}
                          </Link>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {student.mostCommonType ? (
                            <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--color-teal-light)', color: 'var(--color-heading)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={student.mostCommonType}>
                              {student.mostCommonType}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: '14px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.email || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {student.imei_number || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {student.classesCount}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {student.examsTaken}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {student.averageScore !== null ? (
                            <span 
                              style={{ 
                                display: 'inline-block',
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '13px', 
                                fontWeight: 600,
                                backgroundColor: scoreColors.bg, 
                                color: scoreColors.text 
                              }}
                            >
                              {Math.round(student.averageScore)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: '14px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {student.historyLink ? (
                            <Link 
                              href={student.historyLink}
                              className="btn-secondary btn-sm"
                              style={{ textDecoration: 'none' }}
                            >
                              View History
                            </Link>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>No History</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
