
-- Attendance
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  arm_id UUID NOT NULL,
  session_id UUID NOT NULL,
  term_id UUID NOT NULL,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  recorded_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX idx_attendance_class_date ON public.attendance(class_id, arm_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read attendance" ON public.attendance FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal','exam_officer','teacher','form_master']::app_role[])
  OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=attendance.student_id AND s.user_id=auth.uid()));
CREATE POLICY "Staff write attendance" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','form_master','teacher']::app_role[]));
CREATE POLICY "Staff update attendance" ON public.attendance FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','form_master','teacher']::app_role[]));
CREATE POLICY "Super admin deletes attendance" ON public.attendance FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'super_admin'));

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all', -- all | staff | students | parents | class
  class_id UUID,
  arm_id UUID,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All auth read announcements" ON public.announcements FOR SELECT TO authenticated
USING (published = true);
CREATE POLICY "Admins write announcements" ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal','director']::app_role[]));
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','vice_principal','director']::app_role[]));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','principal']::app_role[]));

-- Parent-student links (a parent user may be linked to multiple students)
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL,
  student_id UUID NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view own links" ON public.parent_students FOR SELECT TO authenticated
USING (auth.uid() = parent_user_id OR public.has_any_role(auth.uid(), ARRAY['super_admin','principal','admission_officer']::app_role[]));
CREATE POLICY "Admins manage parent links" ON public.parent_students FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','admission_officer']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','admission_officer']::app_role[]));

-- Helper: is parent of student
CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.parent_students WHERE parent_user_id=_user_id AND student_id=_student_id);
$$;

-- Expand students/scores/result_sheets read policies for parents
CREATE POLICY "Parents view their students" ON public.students FOR SELECT TO authenticated
USING (public.is_parent_of(auth.uid(), id));
CREATE POLICY "Parents view children scores" ON public.scores FOR SELECT TO authenticated
USING (public.is_parent_of(auth.uid(), student_id));
CREATE POLICY "Parents view children sheets" ON public.result_sheets FOR SELECT TO authenticated
USING (public.is_parent_of(auth.uid(), student_id));

-- School settings (singleton)
CREATE TABLE public.school_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  school_name TEXT NOT NULL DEFAULT 'Zinnuryn Academy',
  acronym TEXT NOT NULL DEFAULT 'ZAB',
  location TEXT NOT NULL DEFAULT 'Bauchi, Nigeria',
  motto TEXT DEFAULT 'Discipline · Character · Excellence',
  logo_url TEXT,
  principal_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  scratch_card_default_uses INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.school_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.school_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Super admin updates settings" ON public.school_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'super_admin'));
