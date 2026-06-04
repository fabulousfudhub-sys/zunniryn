
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS min_level_order integer,
  ADD COLUMN IF NOT EXISTS max_level_order integer,
  ADD COLUMN IF NOT EXISTS restricted_arm_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
