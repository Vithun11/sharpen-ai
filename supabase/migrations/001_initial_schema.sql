-- ============================================================
-- 001_initial_schema.sql
-- AI Exam Intelligence Platform — Initial Schema
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────

-- Teachers (extends Supabase auth.users)
CREATE TABLE teachers (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes
CREATE TABLE classes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  school_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  roll_number TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Exams
CREATE TABLE exams (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  subject          TEXT        NOT NULL,
  total_questions  INT         NOT NULL DEFAULT 11,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Questions (extracted from question paper via AI)
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_number INT  NOT NULL,
  question_text   TEXT NOT NULL,
  topic           TEXT,
  difficulty      TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  expected_method TEXT
);

-- Student Exam Results
CREATE TABLE student_results (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id          UUID        NOT NULL REFERENCES exams(id)    ON DELETE CASCADE,
  answer_sheet_url TEXT,
  score_percentage NUMERIC,
  correct_answers  INT,
  analysis_json    JSONB,
  analyzed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, exam_id)
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE teachers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;

-- Teachers can only see/modify their own record
CREATE POLICY "teachers_own" ON teachers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "teachers_insert" ON teachers
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "teachers_update" ON teachers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "teachers_delete" ON teachers
  FOR DELETE USING (auth.uid() = id);


-- Teachers can only see/modify their own classes
CREATE POLICY "classes_own" ON classes
  FOR ALL USING (auth.uid() = teacher_id);

-- Students belong to classes owned by the teacher
CREATE POLICY "students_own" ON students
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Exams belong to classes owned by the teacher
CREATE POLICY "exams_own" ON exams
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Questions belong to exams in the teacher's classes
CREATE POLICY "questions_own" ON questions
  FOR ALL USING (
    exam_id IN (
      SELECT e.id FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Results belong to exams in the teacher's classes
CREATE POLICY "results_own" ON student_results
  FOR ALL USING (
    exam_id IN (
      SELECT e.id FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- INDEXES (for common query patterns)
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_classes_teacher_id       ON classes        (teacher_id);
CREATE INDEX idx_students_class_id        ON students       (class_id);
CREATE INDEX idx_exams_class_id           ON exams          (class_id);
CREATE INDEX idx_questions_exam_id        ON questions      (exam_id);
CREATE INDEX idx_results_student_id       ON student_results (student_id);
CREATE INDEX idx_results_exam_id          ON student_results (exam_id);
