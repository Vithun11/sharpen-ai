-- Extend students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS imei_number TEXT;

-- Master identity table (one row per unique student per teacher)
CREATE TABLE IF NOT EXISTS student_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  imei_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, email)
);

-- Link students rows to a master identity
ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_id
  UUID REFERENCES student_identities(id);

-- Combined analysis (auto-updated after every exam)
CREATE TABLE IF NOT EXISTS student_combined_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID REFERENCES student_identities(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  total_exams_taken INT DEFAULT 0,
  overall_average_score NUMERIC DEFAULT 0,
  concept_understanding_avg NUMERIC DEFAULT 0,
  logical_reasoning_avg NUMERIC DEFAULT 0,
  calculation_accuracy_avg NUMERIC DEFAULT 0,
  method_consistency_avg NUMERIC DEFAULT 0,
  all_topic_mastery JSONB DEFAULT '{}',
  all_strengths JSONB DEFAULT '[]',
  all_weaknesses JSONB DEFAULT '[]',
  recurring_mistakes JSONB DEFAULT '[]',
  improvement_trend TEXT,
  score_history JSONB DEFAULT '[]',
  future_projection TEXT,
  combined_teacher_guidance TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identity_id)
);

-- RLS for new tables
ALTER TABLE student_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_combined_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identities_own" ON student_identities
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "combined_own" ON student_combined_analysis
  FOR ALL USING (teacher_id = auth.uid());
