
-- ============ ENUMS ============
CREATE TYPE public.result_status AS ENUM ('draft','submitted','approved','published','locked');
CREATE TYPE public.scratch_card_status AS ENUM ('unused','used','revoked');

-- ============ GRADE SCALE ============
CREATE TABLE public.grade_scale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL UNIQUE,
  min_score int NOT NULL,
  max_score int NOT NULL,
  remark text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grade_scale TO authenticated;
GRANT ALL ON public.grade_scale TO service_role;
ALTER TABLE public.grade_scale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read grade scale" ON public.grade_scale FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages grade scale" ON public.grade_scale FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin')) WITH CHECK (has_role(auth.uid(),'super_admin'));

INSERT INTO public.grade_scale (grade,min_score,max_score,remark) VALUES
  ('A',70,100,'Excellent'),
  ('B',60,69,'Very Good'),
  ('C',50,59,'Good'),
  ('D',45,49,'Pass'),
  ('E',40,44,'Weak Pass'),
  ('F',0,39,'Fail');

CREATE OR REPLACE FUNCTION public.compute_grade(_score numeric)
RETURNS TABLE(grade text, remark text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT g.grade, g.remark FROM public.grade_scale g
  WHERE _score >= g.min_score AND _score <= g.max_score LIMIT 1;
$$;

-- ============ SUBJECT OFFERINGS ============
CREATE TABLE public.subject_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id uuid NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id,class_id,arm_id,subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_offerings TO authenticated;
GRANT ALL ON public.subject_offerings TO service_role;
ALTER TABLE public.subject_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read offerings" ON public.subject_offerings FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','teacher','form_master']::app_role[]));
CREATE POLICY "Admins manage offerings" ON public.subject_offerings FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]));

-- ============ RESULT SHEETS (per student per term) ============
CREATE TABLE public.result_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id),
  term_id uuid NOT NULL REFERENCES public.terms(id),
  class_id uuid NOT NULL REFERENCES public.classes(id),
  arm_id uuid NOT NULL REFERENCES public.arms(id),
  total_score numeric DEFAULT 0,
  total_obtainable numeric DEFAULT 0,
  average numeric DEFAULT 0,
  position int,
  status public.result_status NOT NULL DEFAULT 'draft',
  form_master_comment text,
  principal_comment text,
  promoted boolean,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_sheets TO authenticated;
GRANT ALL ON public.result_sheets TO service_role;
ALTER TABLE public.result_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read result sheets" ON public.result_sheets FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','teacher','form_master']::app_role[])
    OR EXISTS(SELECT 1 FROM public.students s WHERE s.id = result_sheets.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Exam officers write sheets" ON public.result_sheets FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer','principal']::app_role[]));
CREATE POLICY "Exam officers update sheets" ON public.result_sheets FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer','principal','form_master']::app_role[]));
CREATE POLICY "Super admin delete sheets" ON public.result_sheets FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_result_sheets_updated BEFORE UPDATE ON public.result_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SCORES ============
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id),
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id),
  term_id uuid NOT NULL REFERENCES public.terms(id),
  class_id uuid NOT NULL REFERENCES public.classes(id),
  arm_id uuid NOT NULL REFERENCES public.arms(id),
  ca1 numeric DEFAULT 0 CHECK (ca1 >= 0 AND ca1 <= 10),
  ca2 numeric DEFAULT 0 CHECK (ca2 >= 0 AND ca2 <= 10),
  ca3 numeric DEFAULT 0 CHECK (ca3 >= 0 AND ca3 <= 10),
  exam numeric DEFAULT 0 CHECK (exam >= 0 AND exam <= 70),
  total numeric GENERATED ALWAYS AS (COALESCE(ca1,0)+COALESCE(ca2,0)+COALESCE(ca3,0)+COALESCE(exam,0)) STORED,
  grade text,
  remark text,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, term_id)
);
CREATE INDEX idx_scores_class_term ON public.scores(class_id, arm_id, term_id);
CREATE INDEX idx_scores_student_term ON public.scores(student_id, term_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- helper: is teacher assigned to this subject+class+arm+session
CREATE OR REPLACE FUNCTION public.is_teacher_assigned(_user_id uuid, _subject_id uuid, _class_id uuid, _arm_id uuid, _session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.staff s ON s.id = ta.staff_id
    WHERE s.user_id = _user_id
      AND ta.subject_id = _subject_id
      AND ta.class_id = _class_id
      AND ta.arm_id = _arm_id
      AND ta.session_id = _session_id
  );
$$;

-- helper: is result sheet locked
CREATE OR REPLACE FUNCTION public.is_sheet_locked(_student_id uuid, _term_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT status IN ('published','locked') FROM public.result_sheets
    WHERE student_id=_student_id AND term_id=_term_id), false);
$$;

CREATE POLICY "Staff read scores" ON public.scores FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','form_master']::app_role[])
    OR public.is_teacher_assigned(auth.uid(), subject_id, class_id, arm_id, session_id)
    OR EXISTS(SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Authorized score insert" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (
    (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer','principal']::app_role[])
     OR public.is_teacher_assigned(auth.uid(), subject_id, class_id, arm_id, session_id))
    AND NOT public.is_sheet_locked(student_id, term_id)
  );

CREATE POLICY "Authorized score update" ON public.scores FOR UPDATE TO authenticated
  USING (
    (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer']::app_role[])
     OR public.is_teacher_assigned(auth.uid(), subject_id, class_id, arm_id, session_id))
    AND NOT public.is_sheet_locked(student_id, term_id)
  );

CREATE POLICY "Super admin delete scores" ON public.scores FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin'));

-- trigger: auto-fill grade/remark on insert/update
CREATE OR REPLACE FUNCTION public.scores_set_grade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _g text; _r text;
BEGIN
  SELECT g.grade, g.remark INTO _g, _r FROM public.grade_scale g
   WHERE NEW.total >= g.min_score AND NEW.total <= g.max_score LIMIT 1;
  NEW.grade = _g; NEW.remark = _r; NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_scores_grade BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.scores_set_grade();

-- ============ SCRATCH CARDS ============
CREATE TABLE public.scratch_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text NOT NULL UNIQUE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id),
  term_id uuid REFERENCES public.terms(id),
  max_uses int NOT NULL DEFAULT 1,
  uses int NOT NULL DEFAULT 0,
  status public.scratch_card_status NOT NULL DEFAULT 'unused',
  assigned_student_id uuid REFERENCES public.students(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scratch_cards TO authenticated;
GRANT ALL ON public.scratch_cards TO service_role;
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers read cards" ON public.scratch_cards FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer','principal']::app_role[]));
CREATE POLICY "Officers create cards" ON public.scratch_cards FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer']::app_role[]));
CREATE POLICY "Officers update cards" ON public.scratch_cards FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','exam_officer']::app_role[]));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal']::app_role[]));
CREATE POLICY "Auth insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- ============ RECOMPUTE RESULT SHEET ============
CREATE OR REPLACE FUNCTION public.recompute_result_sheet(_student_id uuid, _term_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _total numeric; _count int; _avg numeric; _session uuid; _class uuid; _arm uuid;
BEGIN
  SELECT COALESCE(SUM(total),0), COUNT(*) INTO _total, _count
    FROM public.scores WHERE student_id=_student_id AND term_id=_term_id;
  _avg := CASE WHEN _count=0 THEN 0 ELSE _total/_count END;

  SELECT session_id INTO _session FROM public.terms WHERE id=_term_id;
  SELECT current_class_id, current_arm_id INTO _class, _arm FROM public.students WHERE id=_student_id;

  INSERT INTO public.result_sheets(student_id, session_id, term_id, class_id, arm_id, total_score, total_obtainable, average)
  VALUES (_student_id, _session, _term_id, _class, _arm, _total, _count*100, _avg)
  ON CONFLICT (student_id, term_id) DO UPDATE
    SET total_score=EXCLUDED.total_score,
        total_obtainable=EXCLUDED.total_obtainable,
        average=EXCLUDED.average,
        updated_at=now()
    WHERE public.result_sheets.status NOT IN ('published','locked');
END; $$;
