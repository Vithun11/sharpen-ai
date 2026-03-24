// ============================================================
// All TypeScript types for the AI Exam Intelligence Platform
// Mirrors the Supabase database schema exactly
// ============================================================

// ────────────────────────────────────────────────────────────
// Database Row Types (match table columns 1:1)
// ────────────────────────────────────────────────────────────

export interface Teacher {
  id: string           // UUID — same as auth.users.id
  full_name: string
  email: string
  created_at: string   // ISO 8601 timestamp
}

export interface Class {
  id: string
  teacher_id: string
  name: string
  subject: string
  syllabus_type: string | null
  class_standard: string | null
  section: string | null
  school_name: string | null
  created_at: string
}

export interface Student {
  id: string
  class_id: string
  full_name: string
  roll_number: string | null
  email: string | null
  imei_number: string | null
  identity_id: string | null
  created_at: string
}

export interface StudentIdentity {
  id: string
  teacher_id: string
  full_name: string
  email: string | null
  imei_number: string | null
  created_at: string
}

export interface StudentCombinedAnalysis {
  id: string
  identity_id: string
  teacher_id: string
  total_exams_taken: number
  overall_average_score: number
  concept_understanding_avg: number
  logical_reasoning_avg: number
  calculation_accuracy_avg: number
  method_consistency_avg: number
  all_topic_mastery: Record<string, number>
  all_strengths: string[]
  all_weaknesses: string[]
  recurring_mistakes: string[]
  improvement_trend: string | null
  score_history: Array<{
    exam_title: string
    date: string
    score: number
    class_name: string
  }>
  future_projection: string | null
  combined_teacher_guidance: string | null
  last_updated: string
}

export interface Exam {
  id: string
  class_id: string
  created_by: string
  title: string
  subject: string
  total_questions: number
  question_paper_url: string | null
  created_at: string
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  exam_id: string
  question_number: number
  question_text: string
  topic: string | null
  difficulty: QuestionDifficulty | null
  expected_method: string | null
}

export interface StudentResult {
  id: string
  student_id: string
  exam_id: string
  answer_sheet_url: string | null
  score_percentage: number | null
  correct_answers: number | null
  analysis_json: AnalysisResult | null
  analyzed_at: string | null
  created_at: string
}

// ────────────────────────────────────────────────────────────
// AI Analysis Types (stored in student_results.analysis_json)
// ────────────────────────────────────────────────────────────

export type MistakeType =
  | 'arithmetic_error'
  | 'conceptual_error'
  | 'method_error'
  | 'sign_error'
  | 'incomplete'
  | 'correct'

export type ComprehensionLevel = 'poor' | 'basic' | 'good' | 'excellent'

export type ProblemSolvingStyle =
  | 'sequential_logical'
  | 'formula_driven'
  | 'visual_thinker'
  | 'trial_and_error'
  | 'intuitive'

export interface QuestionAnalysis {
  question_number: number
  is_correct: boolean
  student_answer: string
  mistake_type: MistakeType | null
  concept_understanding: ComprehensionLevel
  method_used: string
}

export interface CognitiveProfile {
  problem_solving_style: ProblemSolvingStyle
  concept_understanding_level: ComprehensionLevel
  logical_reasoning: ComprehensionLevel
  calculation_accuracy: ComprehensionLevel
  method_consistency: ComprehensionLevel
}

export interface AnalysisResult {
  questions: QuestionAnalysis[]
  cognitive_profile: CognitiveProfile
  topic_mastery: Record<string, number>   // topic → 0–100
  strengths: string[]                      // top 3
  weaknesses: string[]                     // top 3
  common_mistakes: string[]                // top 3
  teacher_guidance: string                 // one paragraph
}

// ────────────────────────────────────────────────────────────
// Form / UI Types
// ────────────────────────────────────────────────────────────

export interface CreateClassForm {
  name: string
  subject: string
  syllabus_type: string
  class_standard: string
  section?: string
  school_name?: string
}

export interface CreateStudentForm {
  full_name: string
  roll_number?: string
  email?: string
  imei_number?: string
}

export interface CreateExamForm {
  title: string
  subject: string
}

// ────────────────────────────────────────────────────────────
// API Response Types
// ────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ────────────────────────────────────────────────────────────
// Extended / Joined Types (queries that JOIN tables)
// ────────────────────────────────────────────────────────────

export interface ClassWithStats extends Class {
  student_count: number
  exam_count: number
}

export interface StudentWithResult extends Student {
  result?: StudentResult
}

export interface ExamWithQuestions extends Exam {
  questions: Question[]
}

export interface StudentResultWithStudent extends StudentResult {
  student: Student
}
