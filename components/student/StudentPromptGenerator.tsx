'use client'

import { useState, useEffect } from 'react'
import { Clipboard, Check, Loader2 } from 'lucide-react'

interface Props {
  studentName: string
  subject: string
  averageScore: number
  strongestTopics: string[]
  weakestTopics: string[]
  recurringMistakes: string[]
  learningStyle: string
  conceptUnderstanding: number
  calculationAccuracy: number
  syllabusType?: string | null
  classStandard?: string | null
  section?: string | null
  schoolName?: string | null
  studentType?: string | null
  studentTypeReasoning?: string | null
  cognitiveRisks?: string[] | null
  topPriorityFix?: string | null
}

export default function StudentPromptGenerator({
  studentName,
  subject,
  averageScore,
  strongestTopics,
  weakestTopics,
  recurringMistakes,
  learningStyle,
  conceptUnderstanding,
  calculationAccuracy,
  syllabusType,
  classStandard,
  section,
  schoolName,
  studentType,
  studentTypeReasoning,
  cognitiveRisks,
  topPriorityFix,
}: Props) {
  const [marks, setMarks] = useState(20)
  const [difficulty, setDifficulty] = useState('match')
  const [promptText, setPromptText] = useState('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [promptReady, setPromptReady] = useState(false)

  useEffect(() => {
    generatePrompt()
  }, [marks, difficulty, subject, studentName, averageScore, strongestTopics, weakestTopics, recurringMistakes, learningStyle, conceptUnderstanding, calculationAccuracy])

  function generatePrompt() {
    let qCount = 5
    if (marks > 20 && marks <= 40) qCount = 8
    else if (marks > 40 && marks <= 60) qCount = 10
    else if (marks > 60) qCount = 12

    let diffText = ''
    if (difficulty === 'match') {
      diffText = `Set difficulty so that a student scoring ${averageScore}% would score approximately ${averageScore}% on this paper too`
    } else if (difficulty === 'harder') {
      diffText = `Set difficulty one level above the student's current average of ${averageScore}%. They should find it challenging but achievable`
    } else if (difficulty === 'easier') {
      diffText = `Set difficulty so that a well-prepared student at ${averageScore}% average would score 80-90% on this paper. This is a confidence-building exercise`
    } else {
      diffText = `Format the paper exactly matching the real ${syllabusType || 'board'} exam difficulty, structure, and marking distribution.`
    }

    const text = `You are an expert ${subject || 'subject'} teacher. Create a personalized practice exam for the following student.

STUDENT PROFILE:
Name: ${studentName}
Overall average score: ${averageScore}%
Student Type: ${studentType || 'Not specified'}
Type Reasoning: ${studentTypeReasoning || 'Not specified'}
Strongest topics: ${strongestTopics.length ? strongestTopics.join(', ') : 'None specified'}
Weakest topics: ${weakestTopics.length ? weakestTopics.join(', ') : 'None specified'}
Recurring mistakes: ${recurringMistakes.length ? recurringMistakes.join(', ') : 'None specified'}
Cognitive Risks: ${cognitiveRisks?.length ? cognitiveRisks.join(', ') : 'None specified'}
Priority Intervention: ${topPriorityFix || 'None specified'}
Learning style: ${learningStyle}
Concept understanding: ${conceptUnderstanding}%
Calculation accuracy: ${calculationAccuracy}%

CURRICULUM CONTEXT:
Syllabus / Board: ${syllabusType || 'Not specified'}
Class / Standard: ${classStandard || 'Not specified'}
Section: ${section || 'Not specified'}
School: ${schoolName || 'Not specified'}

EXAM REQUIREMENTS:
Total marks: ${marks}
Number of questions: ${qCount}
Allocate marks per question accordingly.
${
      syllabusType && syllabusType !== 'Other'
        ? `
- Questions must strictly follow the ${syllabusType} curriculum pattern and marking scheme
- Difficulty and question style must match ${syllabusType} ${classStandard || ''} standards
- Prioritize question formats that appear in official ${syllabusType} board papers`
        : ''
    }

TOPIC DISTRIBUTION:
- 50% of marks on weakest topics (${weakestTopics.length ? weakestTopics.join(', ') : 'general areas for improvement'}) — to directly target gaps
- 30% of marks on moderate topics — to consolidate understanding
- 20% of marks on strongest topics (${strongestTopics.length ? strongestTopics.join(', ') : 'areas of strength'}) — for confidence

DIFFICULTY INSTRUCTION:
${diffText}

MISTAKE AVOIDANCE:
This student commonly makes these mistakes: ${recurringMistakes.length ? recurringMistakes.join(', ') : 'careless errors'}. Design questions that specifically require the correct method for these areas, so the student cannot avoid confronting them.

OUTPUT FORMAT:
1. First output the complete question paper with question numbers, marks in brackets, and a working space note after each question
2. Then output a complete answer key with:
   - Full step-by-step working for every question
   - A "Watch out for:" note after each answer highlighting the mistake this student typically makes in this topic
   - A "Why this works:" note explaining the correct method

Generate both the question paper and the answer key now.`

    setPromptText(text)
  }

  function handleGenerate() {
    setIsGenerating(true)
    setTimeout(() => {
      generatePrompt()
      setIsGenerating(false)
      setPromptReady(true)
      setTimeout(() => setPromptReady(false), 1500)
    }, 800)
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
    <div className="mt-8 no-print">
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
        GENERATE PRACTICE QUESTION PAPER
      </p>
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-teal)', borderRadius: 8, padding: 24 }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 6 }}>Total Marks</label>
            <input 
              type="number" 
              min={5} 
              max={100} 
              step={5} 
              value={marks} 
              onChange={(e) => setMarks(Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 6 }}>Difficulty</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="input-field"
            >
              <option value="match">Match student level</option>
              <option value="harder">Slightly harder than student's current level</option>
              <option value="easier">Build confidence — easier than current level</option>
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
          style={{ width: '100%', opacity: isGenerating ? 0.8 : 1, marginBottom: 16 }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : promptReady ? (
            <>
              <Check size={16} />
              Prompt Ready
            </>
          ) : (
            'Generate Prompt'
          )}
        </button>

        <textarea 
          readOnly
          value={promptText}
          className={`prompt-textarea ${promptText ? 'prompt-visible' : ''}`}
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={handleCopy}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
          >
            {copied ? <Check size={14} color="var(--color-teal)" /> : <Clipboard size={14} color="var(--text-primary)" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Paste this into Claude.ai or ChatGPT to generate a personalized question paper for this student
          </span>
        </div>
      </div>
    </div>
  )
}
