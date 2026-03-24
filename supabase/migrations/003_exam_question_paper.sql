-- Add question_paper_url to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_paper_url TEXT;
