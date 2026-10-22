-- Migration to add team_type to players and squad_members tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/wcixhgffvgcwjdkldmvs/sql

-- 1. Add team_type to players table (Men's Team / Women's Team)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'Men''s Team';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_team_type_check'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_team_type_check 
    CHECK (team_type IN ('Men''s Team', 'Women''s Team'));
  END IF;
END $$;

-- 2. Add team_type to squad_members table (Men's Team / Women's Team)
ALTER TABLE squad_members 
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'Men''s Team';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'squad_members_team_type_check'
  ) THEN
    ALTER TABLE squad_members ADD CONSTRAINT squad_members_team_type_check 
    CHECK (team_type IN ('Men''s Team', 'Women''s Team'));
  END IF;
END $$;
