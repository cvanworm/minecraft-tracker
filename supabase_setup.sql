-- ==============================================================================
-- Minecraft "All Items" Vanilla Survival Tracker - Supabase SQL Setup
-- Run this in the Supabase Dashboard -> SQL Editor -> Click "Run"
-- ==============================================================================

-- 1. Create table for item progress
CREATE TABLE IF NOT EXISTS public.minecraft_item_progress (
  item_id TEXT PRIMARY KEY,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.minecraft_item_progress ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow public read and write access for authorized tracker players
CREATE POLICY "Allow public all access on minecraft_item_progress" 
  ON public.minecraft_item_progress 
  FOR ALL 
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Enable Supabase Realtime broadcast for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.minecraft_item_progress;

-- 5. Optional Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mc_progress_completed ON public.minecraft_item_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_mc_progress_claimed ON public.minecraft_item_progress(claimed_by);
