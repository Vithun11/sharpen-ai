"use client"
import { ReportContext } from "@/contexts/ReportContext"

export default function ReportClientWrapper({ 
  analysisJson, 
  children 
}: { 
  analysisJson: any, 
  children: React.ReactNode 
}) {
  return (
    <ReportContext.Provider value={analysisJson}>
      {children}
    </ReportContext.Provider>
  )
}
