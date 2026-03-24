-- 005_audit_fixes.sql
-- Add missing columns to student_results table

ALTER TABLE student_results
ADD COLUMN IF NOT EXISTS marks_awarded NUMERIC,
ADD COLUMN IF NOT EXISTS marks_total NUMERIC,
ADD COLUMN IF NOT EXISTS overall_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS confidence_reasoning TEXT,
ADD COLUMN IF NOT EXISTS student_type TEXT,
ADD COLUMN IF NOT EXISTS has_teacher_check_flags BOOLEAN;

-- Note: You also need to create a new storage bucket named 'answer-sheets'
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name it "answer-sheets" and make it Public.
