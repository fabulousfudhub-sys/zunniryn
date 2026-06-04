ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS state_of_origin text,
  ADD COLUMN IF NOT EXISTS lga text;