-- Migration for PREVIOUS Supabase installations only.
-- The tracker now uses its authenticated Node backend and SQLite.
-- This removes the old public access without deleting any progress data.
-- Run in the existing project's SQL editor before retiring the old frontend.
DO $$
DECLARE entry RECORD;
BEGIN
  IF to_regclass('public.minecraft_item_progress') IS NOT NULL THEN
    ALTER TABLE public.minecraft_item_progress ENABLE ROW LEVEL SECURITY;
    FOR entry IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'minecraft_item_progress'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.minecraft_item_progress', entry.policyname);
    END LOOP;
    REVOKE ALL ON public.minecraft_item_progress FROM anon, authenticated, PUBLIC;
  END IF;
END $$;
