
ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_workspace_user_unique
UNIQUE (workspace_id, user_id);
