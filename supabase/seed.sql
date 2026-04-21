-- supabase/seed.sql  (local dev only — RLS bypassed under `postgres` superuser)
-- Runs after `supabase db reset`. Never applied to the cloud project.
insert into public.trees (id, name, owner_user_id) values
  ('11111111-1111-1111-1111-111111111111', 'Demo family', 'user_demo_local');
insert into public.tree_members (tree_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'user_demo_local', 'owner');
insert into public.people (tree_id, name, is_me) values
  ('11111111-1111-1111-1111-111111111111', 'You (demo)', true);
