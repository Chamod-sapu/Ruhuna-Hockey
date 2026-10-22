-- Migration to update the leadership_role_check constraint
-- Allows: Men's Captain, Women's Captain, Men's Vice Captain, Women's Vice Captain, Team Manager, Coach
-- (plus backward-compatible legacy roles: Captain, Vice Captain)

-- 1. Drop the old check constraint
ALTER TABLE leadership DROP CONSTRAINT IF EXISTS leadership_role_check;

-- 2. Add the updated check constraint supporting the new roles
ALTER TABLE leadership ADD CONSTRAINT leadership_role_check CHECK (
  role IN (
    'Men''s Captain',
    'Women''s Captain',
    'Men''s Vice Captain',
    'Women''s Vice Captain',
    'Team Manager',
    'Coach',
    'Captain',
    'Vice Captain'
  )
);
