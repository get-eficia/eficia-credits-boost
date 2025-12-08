-- Add column for Google Drive URL to enrich_jobs table
-- This will replace the need to upload enriched files to Supabase storage

-- Add the new column for Google Drive URL
ALTER TABLE public.enrich_jobs
ADD COLUMN IF NOT EXISTS enriched_file_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.enrich_jobs.enriched_file_url IS 'Google Drive URL for the enriched file';

-- We keep enriched_file_path for backward compatibility but new jobs will use enriched_file_url
