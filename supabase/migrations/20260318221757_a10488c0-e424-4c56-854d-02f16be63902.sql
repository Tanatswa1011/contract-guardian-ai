-- Clean up duplicate "Dclass" workspaces, keep only the most recent one
DELETE FROM public.workspaces 
WHERE name = 'Dclass' 
  AND created_by = '49a94cb4-b38c-4beb-ae12-9ceee483d8ad'
  AND id != '55a0fea5-50fd-4b0d-9efa-3c87b1443a38';