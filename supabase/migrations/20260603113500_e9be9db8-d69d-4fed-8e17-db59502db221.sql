-- 1) Student status enum
DO $$ BEGIN
  CREATE TYPE public.student_status AS ENUM ('active','graduated','withdrawn','suspended','transferred','alumni');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status public.student_status NOT NULL DEFAULT 'active';

-- Backfill from is_active
UPDATE public.students SET status = CASE WHEN is_active THEN 'active'::public.student_status ELSE 'withdrawn'::public.student_status END
WHERE status IS NULL OR (is_active = false AND status = 'active');

-- 2) Student class history (for promotion tracking)
CREATE TABLE IF NOT EXISTS public.student_class_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  arm_id uuid NOT NULL,
  promoted_from_class_id uuid,
  promoted_from_arm_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_class_history TO authenticated;
GRANT ALL ON public.student_class_history TO service_role;

ALTER TABLE public.student_class_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read class history" ON public.student_class_history FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'director'::app_role,'principal'::app_role,'vice_principal'::app_role,'exam_officer'::app_role,'form_master'::app_role,'teacher'::app_role]));

CREATE POLICY "Admins write class history" ON public.student_class_history FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'principal'::app_role,'vice_principal'::app_role,'admission_officer'::app_role]));

CREATE POLICY "Admins update class history" ON public.student_class_history FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'principal'::app_role,'vice_principal'::app_role]));

CREATE POLICY "Super admin delete class history" ON public.student_class_history FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role));

-- 3) Auto-rank trigger: recompute positions whenever result_sheets change for a (class,arm,term)
CREATE OR REPLACE FUNCTION public.recompute_positions(_class_id uuid, _arm_id uuid, _term_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC NULLS LAST, average DESC NULLS LAST) AS rn
    FROM public.result_sheets
    WHERE class_id = _class_id AND arm_id = _arm_id AND term_id = _term_id
  )
  UPDATE public.result_sheets rs SET position = r.rn
  FROM ranked r WHERE rs.id = r.id AND COALESCE(rs.position,0) <> r.rn;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_result_sheets_rank()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_positions(NEW.class_id, NEW.arm_id, NEW.term_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS result_sheets_rank ON public.result_sheets;
CREATE TRIGGER result_sheets_rank
  AFTER INSERT OR UPDATE OF total_score, average ON public.result_sheets
  FOR EACH ROW EXECUTE FUNCTION public.trg_result_sheets_rank();

-- 4) Make sure scores trigger exists for auto-grading
DROP TRIGGER IF EXISTS scores_grade ON public.scores;
CREATE TRIGGER scores_grade BEFORE INSERT OR UPDATE OF ca1,ca2,ca3,exam ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.scores_set_grade();