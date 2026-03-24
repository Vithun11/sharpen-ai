-- Migration to add details to the classes table

ALTER TABLE classes ADD COLUMN IF NOT EXISTS syllabus_type TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_standard TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS section TEXT;
