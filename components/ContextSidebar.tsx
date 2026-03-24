'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

function ScoreBadge({ score }: { score: number }) {
  const isHigh = score >= 75
  const isMed = score >= 50 && score < 75
  return (
    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
      isHigh ? 'bg-[#EEFFD6] text-[#4AAA00]' : 
      isMed ? 'bg-[#FEF5D6] text-[#B88500]' : 
      'bg-[#FEF0F3] text-[#D4607E]'
    }`}>
      {Math.round(score)}%
    </span>
  )
}

function CompactProgressBar({ pct, color }: { pct: number, color: string }) {
  return (
    <div className="w-full bg-[#D6EEEE] rounded-full h-1.5 mt-1.5">
      <div className="h-1.5 rounded-full transition-all duration-300"
           style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }} />
    </div>
  )
}

// Default empty sidebar state
export default function ContextSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const resultId = params?.studentId as string | undefined
  const isReportPage = pathname.includes("/results/")
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [routeContent, setRouteContent] = useState<React.ReactNode>(null)
  
  useEffect(() => {
    if (!isReportPage || !resultId) return
    
    setReportLoading(true)
    setReportData(null)
    
    supabase
      .from("student_results")
      .select("analysis_json")
      .eq("student_id", resultId)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setReportData(data.analysis_json)
        }
        setReportLoading(false)
      })
  }, [resultId, isReportPage, supabase])

  useEffect(() => {
    let isMounted = true

    async function fetchSidebarData() {
      setLoading(true)
      
      try {
        if (pathname === '/dashboard') {
          // Dashboard Route
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          const [resultsRes, classesRes, myClassesRes] = await Promise.all([
            // Join with exams and classes
            supabase
              .from('student_results')
              .select('id, score_percentage, exam_id, student_id, exams(title), classes(name)')
              .order('created_at', { ascending: false })
              .limit(5),
            supabase.from('classes').select('id', { count: 'exact', head: true }).eq('teacher_id', session.user.id),
            supabase.from('classes').select('id').eq('teacher_id', session.user.id)
          ])
          
          const classesCount = classesRes.count || 0
          const classIds = myClassesRes.data?.map(c => c.id) || []
          
          let studentsCount = 0
          let avgScore = 0

          if (classIds.length > 0) {
            const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).in('class_id', classIds)
            studentsCount = count || 0

            const { data: examIds } = await supabase.from('exams').select('id').in('class_id', classIds)
            const eIds = examIds?.map(e => e.id) || []
            if (eIds.length > 0) {
              const { data: resultsForAvg } = await supabase.from('student_results').select('score_percentage').in('exam_id', eIds)
              if (resultsForAvg && resultsForAvg.length > 0) {
                const total = resultsForAvg.reduce((sum, r) => sum + r.score_percentage, 0)
                avgScore = +(total / resultsForAvg.length).toFixed(1)
              }
            }
          }

          const recentResults = resultsRes.data || []

          if (isMounted) {
            setRouteContent(
              <>
                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {recentResults.length === 0 ? (
                      <p className="text-xs text-gray-500">No recent activity.</p>
                    ) : (
                      recentResults.map((r: any) => (
                        <div key={r.id} 
                             className="cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded transition-colors"
                             onClick={() => {
                               // try to find class id from result to navigate
                               if (r.classes?.id && r.exam_id && r.student_id) {
                                 router.push(`/classes/${r.classes.id}/exams/${r.exam_id}/results/${r.student_id}`)
                               }
                             }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{r.exams?.title || 'Unknown Exam'}</p>
                              <p className="text-xs text-gray-500">{r.classes?.name || 'Unknown Class'}</p>
                            </div>
                            <ScoreBadge score={r.score_percentage} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">At a Glance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                      <p className="text-xs text-gray-500">Total Classes</p>
                      <p className="text-sm font-semibold text-gray-900">{classesCount || 0}</p>
                    </div>
                    <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-sm font-semibold text-gray-900">{studentsCount || 0}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-gray-500">Avg Score</p>
                      <p className={`text-sm font-semibold ${avgScore >= 75 ? 'text-[#4AAA00]' : avgScore >= 50 ? 'text-[#B88500]' : 'text-[#D4607E]'}`}>
                        {avgScore}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )
          }

        } else if (pathname === '/classes') {
          // Classes List Route
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name, students(count), exams(count)')
            .eq('teacher_id', session.user.id)
            .order('created_at', { ascending: false })

          const myClasses = classesData || []
          const classIds = myClasses.map(c => c.id)

          const totalClasses = myClasses.length
          const totalStudents = myClasses.reduce((acc, c: any) => acc + (c.students?.[0]?.count || 0), 0)

          let recentExams: any[] = []
          if (classIds.length > 0) {
            const { data: examsData } = await supabase
              .from('exams')
              .select('id, title, class_id, classes(name)')
              .in('class_id', classIds)
              .order('created_at', { ascending: false })
              .limit(3)
              
            recentExams = examsData || []
          }

          if (isMounted) {
            setRouteContent(
              <>
                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Your Classes</h3>
                  <div className="flex gap-6 mb-4">
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 leading-tight">{totalClasses}</p>
                      <p className="text-xs text-gray-500">Classes</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 leading-tight">{totalStudents}</p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    {myClasses.slice(0, 5).map(c => (
                      <div key={c.id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 truncate pr-2" title={c.name}>{c.name}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{(c.students as any)?.[0]?.count || 0} students</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Recent Exams</h3>
                  <div className="space-y-3">
                    {recentExams.length === 0 ? (
                      <p className="text-xs text-gray-500">No exams yet.</p>
                    ) : (
                      recentExams.map(ex => (
                        <div key={ex.id} className="cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded transition-colors" onClick={() => router.push(`/classes/${ex.class_id}/exams/${ex.id}`)}>
                          <p className="text-sm font-medium text-gray-900 truncate pr-2">{ex.title}</p>
                          <p className="text-xs text-gray-500 truncate">{ex.classes?.name}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )
          }

        } else if (pathname.match(/^\/classes\/[a-zA-Z0-9-]+(\/|$)/) && !pathname.includes('/results/')) {
          // Class Detail Route
          const classId = params.classId as string
          if (!classId) return
          
          const [classRes, studentsRes, resultsRes] = await Promise.all([
            supabase.from('classes').select('name, school_name, syllabus_type, class_standard').eq('id', classId).single(),
            supabase.from('students').select('id, full_name').eq('class_id', classId),
            // get only students for this class since we're tracking top students within it
            supabase.from('student_results').select('student_id, score_percentage, analysis_json, exams!inner(class_id)').eq('exams.class_id', classId)
          ])

          const classData = classRes.data
          const students = studentsRes.data || []
          const results = resultsRes.data || []

          const examCountRes = await supabase.from('exams').select('*', { count: 'exact', head: true }).eq('class_id', classId)
          const examCount = examCountRes.count || 0

          // Calculate top students
          const studentAverages: Record<string, { name: string, totalScore: number, count: number, type: string }> = {}
          students.forEach(s => {
            studentAverages[s.id] = { name: s.full_name, totalScore: 0, count: 0, type: 'Mixed' }
          })

          results.forEach(r => {
            if (studentAverages[r.student_id]) {
              studentAverages[r.student_id].totalScore += r.score_percentage
              studentAverages[r.student_id].count += 1
              if (r.analysis_json && (r.analysis_json as any).student_type) {
                studentAverages[r.student_id].type = (r.analysis_json as any).student_type
              }
            }
          })

          const topStudents = Object.values(studentAverages)
            .filter(s => s.count > 0)
            .map(s => ({ ...s, avg: s.totalScore / s.count }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3)

          // Weak topics
          const topicStats: Record<string, { totalPct: number, count: number }> = {}
          
          results.forEach(r => {
            if (r.analysis_json && (r.analysis_json as any).topic_mastery) {
              const tm: any[] = (r.analysis_json as any).topic_mastery || []
              tm.forEach(t => {
                // Ignore general/unknown rules? Or just average them
                if (!topicStats[t.topic]) topicStats[t.topic] = { totalPct: 0, count: 0 }
                topicStats[t.topic].totalPct += t.mastery_percent
                topicStats[t.topic].count += 1
              })
            }
          })

          const weakTopics = Object.entries(topicStats)
            .map(([topic, stats]) => ({ topic, avg: stats.totalPct / stats.count }))
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3)

          if (isMounted) {
            setRouteContent(
              <>
                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Class Info</h3>
                  <p className="text-sm font-medium text-gray-900 mb-1 leading-tight">{classData?.school_name || classData?.name}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {classData?.syllabus_type || 'N/A'} · {classData?.class_standard || 'N/A'}
                  </p>
                  <div className="flex gap-2">
                    <p className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">{students.length} students</p>
                    <p className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">{examCount} exams</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                  <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Top Students</h3>
                  <div className="space-y-4">
                    {topStudents.length === 0 ? (
                      <p className="text-xs text-gray-500">Not enough data.</p>
                    ) : (
                      topStudents.map((s, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-gray-900 mb-1.5 truncate" title={s.name}>{s.name}</p>
                          <div className="flex gap-2 items-center">
                            <ScoreBadge score={s.avg} />
                            <span className="bg-[#FEF0F3] text-[#D4607E] text-[10px] px-2 py-0.5 rounded-full truncate max-w-[120px]" title={s.type}>
                              {s.type}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {weakTopics.length > 0 && (
                  <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
                    <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">Weak Topics</h3>
                    <div className="space-y-4">
                      {weakTopics.map((t, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-end mb-1">
                            <p className="text-sm text-gray-900 truncate pr-2 py-0.5" title={t.topic}>{t.topic}</p>
                            <p className="text-xs text-[#D4607E] font-mono leading-none">{Math.round(t.avg)}%</p>
                          </div>
                          <CompactProgressBar pct={t.avg} color="#D4607E" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          }
          
        } else {
          // Fallback empty view or no content logic
          if (isMounted) setRouteContent(null)
        }
        
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (!isReportPage) {
      fetchSidebarData()
    } else {
      // We are on the report view, bypass
      if (isMounted) setLoading(false)
    }

    return () => { isMounted = false }
  }, [pathname, params, supabase, router, isReportPage])

  if (isReportPage) {
    if (reportLoading) {
      return (
        <div className="flex flex-col h-full bg-[#F0FAFA]">
          <div className="px-5 py-4 border-b border-[#D6EEEE]">
            <p className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide">
              Quick View
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 bg-[#D6EEEE] rounded w-3/4"/>
                <div className="h-3 bg-[#D6EEEE] rounded w-1/2"/>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (!reportData) return null
    return (
      <div className="flex flex-col h-full bg-[#F0FAFA]">
        <div className="px-5 py-4 border-b border-[#D6EEEE]">
          <p className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide">
            Quick View
          </p>
        </div>
        <div className="flex-1 px-5 py-4 space-y-4">
          <ReportSidebarContent report={reportData} />
        </div>
      </div>
    )
  }

  // Not on Report Route
  return (
    <div className="flex flex-col h-full bg-[#F0FAFA]">
      <div className="px-5 py-4 border-b border-[#D6EEEE]">
        <p className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide">
          Quick View
        </p>
      </div>
      <div className="flex-1 px-5 py-4 space-y-4">
        {loading ? (
          <>
            <div className="animate-pulse space-y-3">
              <div className="h-24 bg-[#D6EEEE]/50 rounded-lg w-full" />
              <div className="h-32 bg-[#D6EEEE]/50 rounded-lg w-full" />
            </div>
          </>
        ) : routeContent ? (
          routeContent
        ) : (
          <div className="text-center pt-8">
            <p className="text-xs text-gray-400">Select an item to view details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ReportSidebarContent({ report }: { report: any }) {
  const type = report.student_type
  const tags = report.student_type_tags || []
  const reasoning = report.student_type_reasoning
  const score = report.score
  const week1 = report.four_week_plan?.[0]
  
  const scorePct = score?.percentage || 0
  const badgeClass = scorePct >= 75 
    ? "bg-[#EEFFD6] text-[#4AAA00]"
    : scorePct >= 50 
      ? "bg-[#FEF5D6] text-[#B88500]"
      : "bg-[#FEF0F3] text-[#D4607E]"
  
  return (
    <div className="space-y-4">
      {/* Card 1 — Student Type */}
      <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
        <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">
          Student Type
        </h3>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-[#D4607E] leading-tight">
            {type}
          </p>
          <div className="text-right shrink-0">
            <p className={`text-sm font-bold ${
              scorePct >= 75 ? "text-[#4AAA00]" 
              : scorePct >= 50 ? "text-[#B88500]" 
              : "text-[#D4607E]"
            }`}>
              {scorePct}%
            </p>
            <p className="text-xs text-gray-400">
              {score?.marks_awarded}/{score?.marks_total}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 italic leading-relaxed mb-3 line-clamp-3">
          {reasoning}
        </p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag: string) => (
            <span key={tag} 
              className="text-xs px-2 py-0.5 rounded-full bg-[#FEF0F3] text-[#D4607E]">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card 2 — This Week's Priority */}
      {week1 && (
        <div className="bg-white rounded-lg border border-[#D6EEEE] p-4">
          <h3 className="text-xs font-medium text-[#1F8F8A] uppercase tracking-wide mb-3">
            This Week
          </h3>
          <div className="border-l-2 border-[#1F8F8A] pl-3">
            <p className="text-xs text-[#1F8F8A] font-medium uppercase tracking-wide">
              Week {week1.week_number}
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {week1.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Focus: {week1.focus_metric}
            </p>
            <p className="text-xs text-gray-700 mt-2 leading-relaxed">
              {week1.daily_action}
            </p>
            <div className="bg-[#EEFFD6] rounded p-2 mt-3">
              <p className="text-xs font-medium text-[#4AAA00]">
                Done when:
              </p>
              <p className="text-xs text-[#4AAA00] mt-0.5 leading-relaxed">
                {week1.success_indicator}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
