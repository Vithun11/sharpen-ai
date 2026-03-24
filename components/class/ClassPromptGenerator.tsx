'use client'

import { useState } from 'react'
import { Clipboard, Check, Loader2 } from 'lucide-react'

interface Props {
  className: string
  subject: string
  studentCount: number
  classAverage: number
  hardestTopics: string[]
  easiestTopics: string[]
  mostCommonMistakes: string[]
  studentsNeedingSupport: string[]
  studentsToChallenge: string[]
  topicMasteryAverages: { topic: string; avgMastery: number }[]
  syllabusType?: string | null
  classStandard?: string | null
  section?: string | null
  schoolName?: string | null
  examSpecificData?: { title: string; date: string }
}

export default function ClassPromptGenerator({
  className,
  subject,
  studentCount,
  classAverage,
  hardestTopics,
  easiestTopics,
  mostCommonMistakes,
  studentsNeedingSupport,
  studentsToChallenge,
  topicMasteryAverages,
  syllabusType,
  classStandard,
  section,
  schoolName,
  examSpecificData,
}: Props) {
  const [marks, setMarks] = useState(20)
  const [difficulty, setDifficulty] = useState('match')
  const [promptText, setPromptText] = useState('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    await new Promise(r => setTimeout(r, 600)) // Slight delay for UI feedback
    generatePrompt()
    setIsGenerating(false)
    setIsDone(true)
    setTimeout(() => setIsDone(false), 1500)
  }

  function generatePrompt() {
    let qCount = 5
    if (marks > 20 && marks <= 40) qCount = 8
    else if (marks > 40 && marks <= 60) qCount = 10
    else if (marks > 60) qCount = 12

    let topicString = ''
    if (topicMasteryAverages && topicMasteryAverages.length > 0) {
      topicString = topicMasteryAverages.map(t => {
        // Simple proportional allocation
        const invertMastery = 100 - t.avgMastery
        const suggestedMarks = Math.max(2, Math.round((invertMastery / 100) * (marks / topicMasteryAverages.length) * 1.5))
        return `- ${t.topic}: class average mastery ${Math.round(t.avgMastery)}% — allocate ~${suggestedMarks} marks`
      }).join('\n')
    } else {
      topicString = '- Allocate marks evenly across taught topics'
    }

    let diffLabel = ''
    if (difficulty === 'match') diffLabel = 'Match class average level'
    else if (difficulty === 'harder') diffLabel = 'Push the class slightly harder'
    else if (difficulty === 'easier') diffLabel = 'Build class confidence — slightly easier'
    else diffLabel = syllabusType ? `Full ${syllabusType} exam pattern` : 'Full board exam pattern'

    const instructionPrefix = examSpecificData
      ? `Generate a practice paper based on the following exam performance data:`
      : `You are an expert ${subject} teacher. Create a class practice exam based on the following class performance data.`

    const text = `${instructionPrefix}

${examSpecificData ? 'EXAM' : 'CLASS'} PROFILE:
Class name: ${className}
Subject: ${subject}
${examSpecificData ? `Exam: ${examSpecificData.title} (${new Date(examSpecificData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})\n` : ''}Number of students: ${studentCount}
${examSpecificData ? 'Exam' : 'Class'} average score: ${classAverage}%
Hardest topics (lowest ${examSpecificData ? 'exam' : 'class'} mastery): ${hardestTopics.length ? hardestTopics.join(', ') : 'None identified'}
Easiest topics (highest ${examSpecificData ? 'exam' : 'class'} mastery): ${easiestTopics.length ? easiestTopics.join(', ') : 'None identified'}
Most common mistakes across the ${examSpecificData ? 'exam' : 'class'}: ${mostCommonMistakes.length ? mostCommonMistakes.join(', ') : 'None identified'}
Students who need most support: ${studentsNeedingSupport.length ? studentsNeedingSupport.join(', ') : 'None specified'}
Students who can be challenged: ${studentsToChallenge.length ? studentsToChallenge.join(', ') : 'None specified'}
Syllabus / Board: ${syllabusType || 'Not specified'}
Class / Standard: ${classStandard || 'Not specified'}
Section: ${section || 'Not specified'}
School: ${schoolName || 'Not specified'}

EXAM REQUIREMENTS:
Total marks: ${marks}
Number of questions: ${qCount}
Difficulty Strategy: ${diffLabel}
Allocate marks per question accordingly.
${syllabusType && syllabusType !== 'Other' ? `
- All questions must follow ${syllabusType} curriculum and official marking scheme for ${classStandard || 'this class'}
- Question formats, marks distribution, and difficulty must match ${syllabusType} ${classStandard || ''} standards
- Include both short answer and long answer questions as per ${syllabusType} pattern` : ''}

TOPIC DISTRIBUTION:
${topicString}

DIFFERENTIATION:
Design this paper so it works for the whole class:
- Include 20% of marks worth of foundational questions that even struggling students (${studentsNeedingSupport.length ? studentsNeedingSupport.join(', ') : 'those who need support'}) can attempt with basic knowledge
- Include 60% of marks worth of core questions pitched at the class average of ${classAverage}%
- Include 20% of marks worth of challenge questions that will stretch top students (${studentsToChallenge.length ? studentsToChallenge.join(', ') : 'those who need a challenge'})
- Avoid question types that require ${mostCommonMistakes.length > 0 ? mostCommonMistakes[0] : 'complex multi-step derivations immediately'} since most students struggle with this method — instead scaffold toward the correct approach

OUTPUT FORMAT:
1. Complete question paper with question numbers, marks in brackets, and a working space note after each question
2. Complete answer key with full step-by-step working for every question
3. After the answer key: a short "Teaching Notes" section telling the teacher which questions to focus discussion on and what mistakes to expect from which student profiles

Generate the question paper, answer key, and teaching notes now.`

    setPromptText(text)
  }

  function handleCopy() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(promptText)
        .then(() => showCopied())
        .catch(() => fallbackCopy())
    } else {
      fallbackCopy()
    }
  }

  function fallbackCopy() {
    const el = document.createElement('textarea')
    el.value = promptText
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand('copy')
      showCopied()
    } catch (err) {
      console.error('Fallback copy failed', err)
    }
    document.body.removeChild(el)
  }

  function showCopied() {
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="no-print" style={{ 
      marginTop: '48px', 
      borderLeft: '4px solid var(--color-teal)', 
      backgroundColor: 'var(--color-surface)', 
      border: '1px solid var(--color-border)', 
      borderRadius: '10px', 
      padding: '24px' 
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        GENERATE CLASS PRACTICE PAPER
      </p>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Total Marks</label>
          <input 
            type="number" 
            min={5} 
            max={100} 
            step={5} 
            value={marks} 
            onChange={(e) => setMarks(Number(e.target.value))}
            className="input-field"
            style={{ width: '120px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Difficulty</label>
          <select 
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input-field"
            style={{ width: '240px' }}
          >
            <option value="match">Match class average level</option>
            <option value="harder">Push the class slightly harder</option>
            <option value="easier">Build class confidence — slightly easier</option>
            {syllabusType ? (
              <option value="board">Full {syllabusType} exam pattern</option>
            ) : (
              <option value="board">Full board exam pattern</option>
            )}
          </select>
        </div>
      </div>

      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="btn-primary"
        style={{ marginTop: '20px', width: '100%', opacity: isGenerating ? 0.8 : 1 }}
      >
        {isGenerating ? (
          <><Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} /> Generating...</>
        ) : isDone ? (
          <><Check size={16} style={{ marginRight: '8px' }} /> Prompt Ready</>
        ) : (
          'Generate Prompt'
        )}
      </button>

      <textarea 
        readOnly
        value={promptText}
        className={promptText ? 'prompt-textarea prompt-visible' : 'prompt-textarea'}
        style={{ 
          marginTop: '16px',
          width: '100%', 
          height: '280px', 
          resize: 'vertical',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          backgroundColor: 'var(--color-teal-light)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '7px',
          padding: '16px',
          borderColor: promptText ? 'var(--color-teal)' : 'var(--color-border)',
          boxShadow: promptText ? '0 0 0 3px var(--color-teal-light)' : 'none',
          opacity: promptText ? 1 : 0.4
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
        <button 
          onClick={handleCopy}
          className="btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {copied ? <Check size={14} color="var(--color-teal)" /> : <Clipboard size={14} color="var(--text-primary)" />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Paste this into Claude.ai or ChatGPT to generate a tailored class-wide practice paper
        </span>
      </div>
    </div>
  )
}
