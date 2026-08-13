-- Ensure PostgREST sees all Admin RPC contracts added through Sprint 20 immediately.
-- This changes no business data, privileges, RLS policy, or function behavior.
notify pgrst, 'reload schema';
