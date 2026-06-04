ALTER TABLE public.scratch_cards
  ADD COLUMN IF NOT EXISTS assigned_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;