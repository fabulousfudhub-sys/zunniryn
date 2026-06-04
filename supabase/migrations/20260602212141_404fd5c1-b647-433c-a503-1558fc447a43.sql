
-- Staff table
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  employee_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  gender gender,
  department text,
  qualification text,
  date_employed date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_user_id ON public.staff(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff readable by staff users" ON public.staff
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','admission_officer','exam_officer','teacher','form_master']::app_role[])
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins manage staff insert" ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','principal']::app_role[]));

CREATE POLICY "Admins manage staff update" ON public.staff
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','principal']::app_role[]));

CREATE POLICY "Super admin deletes staff" ON public.staff
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employee number sequence
CREATE TABLE public.employee_sequence (
  id integer PRIMARY KEY DEFAULT 1,
  last_serial integer NOT NULL DEFAULT 0,
  CHECK (id = 1)
);
INSERT INTO public.employee_sequence (id, last_serial) VALUES (1, 0)
  ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_employee_no()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next int;
BEGIN
  UPDATE public.employee_sequence SET last_serial = last_serial + 1
  WHERE id = 1 RETURNING last_serial INTO _next;
  RETURN 'ZAB/STF/' || LPAD(_next::text, 4, '0');
END; $$;

-- Teacher assignments: a teacher (staff) teaches a subject to a class+arm in a session
CREATE TABLE public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id uuid NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, subject_id, class_id, arm_id, session_id)
);

CREATE INDEX idx_ta_lookup ON public.teacher_assignments(class_id, arm_id, session_id);
CREATE INDEX idx_ta_staff ON public.teacher_assignments(staff_id, session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read assignments" ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','teacher','form_master']::app_role[]));

CREATE POLICY "Admins write assignments" ON public.teacher_assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]));

CREATE POLICY "Admins update assignments" ON public.teacher_assignments
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]));

CREATE POLICY "Admins delete assignments" ON public.teacher_assignments
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]));

-- Form master per class-arm per session
CREATE TABLE public.form_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id uuid NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, arm_id, session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_masters TO authenticated;
GRANT ALL ON public.form_masters TO service_role;

ALTER TABLE public.form_masters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read form masters" ON public.form_masters
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','teacher','form_master']::app_role[]));

CREATE POLICY "Admins write form masters" ON public.form_masters
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal']::app_role[]));
