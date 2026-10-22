-- Migration to add team_type to fixtures and achievements tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/wcixhgffvgcwjdkldmvs/sql

-- 1. Add team_type to fixtures table (Men's / Women's)
ALTER TABLE fixtures 
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'Men''s';

-- Add check constraint for fixtures team_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixtures_team_type_check'
  ) THEN
    ALTER TABLE fixtures ADD CONSTRAINT fixtures_team_type_check 
    CHECK (team_type IN ('Men''s', 'Women''s'));
  END IF;
END $$;

-- 2. Add team_type to achievements table (Men's Team / Women's Team)
ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'Men''s Team';

-- Add check constraint for achievements team_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achievements_team_type_check'
  ) THEN
    ALTER TABLE achievements ADD CONSTRAINT achievements_team_type_check 
    CHECK (team_type IN ('Men''s Team', 'Women''s Team', 'Combined'));
  END IF;
END $$;
