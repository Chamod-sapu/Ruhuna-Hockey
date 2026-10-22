-- Migration to update the achievements_category_check constraint
-- Allows:
-- Championship, Runner-up, Second Runner-up, Third Runner-up, Quarter Finalist, Individual Awards, Milestone
-- Plus backward-compatible legacy & typo variants:
-- Thrid Runner-up, Quater Finalist, Individual Award, Podium

-- 1. Drop the old check constraint
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_category_check;

-- 2. Add the updated check constraint supporting all new categories
ALTER TABLE achievements ADD CONSTRAINT achievements_category_check CHECK (
  category IN (
    'Championship',
    'Runner-up',
    'Second Runner-up',
    'Third Runner-up',
    'Thrid Runner-up',
    'Quarter Finalist',
    'Quater Finalist',
    'Individual Awards',
    'Individual Award',
    'Milestone',
    'Podium'
  )
);
