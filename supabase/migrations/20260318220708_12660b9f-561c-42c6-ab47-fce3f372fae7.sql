
-- Fix contract_files.uploaded_by FK to cascade on user deletion
ALTER TABLE public.contract_files
  DROP CONSTRAINT IF EXISTS contract_files_uploaded_by_fkey;

ALTER TABLE public.contract_files
  ADD CONSTRAINT contract_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
