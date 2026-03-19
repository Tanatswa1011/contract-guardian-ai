-- Verify workspace persistence after creation
-- Run this in Supabase SQL Editor to confirm DB state.
-- Replace :user_id with the actual user UUID from auth.users.

-- 1. List workspaces for a user (replace with actual user id)
-- SELECT w.id, w.name, w.created_by, w.created_at
-- FROM public.workspaces w
-- WHERE w.created_by = 'YOUR_USER_ID_HERE';

-- 2. List workspace_members for a user (replace with actual user id)
-- SELECT wm.workspace_id, wm.user_id, wm.role, wm.created_at
-- FROM public.workspace_members wm
-- WHERE wm.user_id = 'YOUR_USER_ID_HERE';

-- 3. Combined: workspaces + membership for a user
-- SELECT w.id as workspace_id, w.name, wm.role, w.created_at
-- FROM public.workspace_members wm
-- JOIN public.workspaces w ON w.id = wm.workspace_id
-- WHERE wm.user_id = 'YOUR_USER_ID_HERE';

-- 4. Quick check: count workspaces and members for a user
-- SELECT
--   (SELECT count(*) FROM public.workspaces WHERE created_by = 'YOUR_USER_ID_HERE') as workspaces_created,
--   (SELECT count(*) FROM public.workspace_members WHERE user_id = 'YOUR_USER_ID_HERE') as memberships;
