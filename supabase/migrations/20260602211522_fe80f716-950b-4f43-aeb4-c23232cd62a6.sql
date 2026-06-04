-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'super_admin','director','principal','vice_principal',
  'admission_officer','teacher','form_master','exam_officer',
  'parent','student'
);

CREATE TYPE public.section_code AS ENUM ('NUR','PRI','SEC');
CREATE TYPE public.term_name AS ENUM ('First','Second','Third');
CREATE TYPE public.gender AS ENUM ('Male','Female');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ ROLE-CHECK SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

-- ============ PROFILES POLICIES ============
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['super_admin','director','principal','vice_principal']::public.app_role[]));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));

-- ============ USER_ROLES POLICIES ============
CREATE POLICY "View own roles or admin views all" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Only super_admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SESSIONS ============
CREATE TABLE public.academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,         -- e.g. '2025/2026'
  short_code TEXT NOT NULL UNIQUE,   -- e.g. '26'
  is_current BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academic_sessions TO authenticated;
GRANT ALL ON public.academic_sessions TO service_role;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read sessions" ON public.academic_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages sessions" ON public.academic_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ TERMS ============
CREATE TABLE public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  name public.term_name NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, name)
);
GRANT SELECT ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read terms" ON public.terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages terms" ON public.terms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,         -- 'Primary 4', 'JSS 1'
  section public.section_code NOT NULL,
  level_order INT NOT NULL,          -- ordering within section
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ ARMS ============
CREATE TABLE public.arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE          -- 'A','B','C','D'
);
GRANT SELECT ON public.arms TO authenticated;
GRANT ALL ON public.arms TO service_role;
ALTER TABLE public.arms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read arms" ON public.arms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages arms" ON public.arms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ SUBJECTS ============
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  section public.section_code,       -- nullable = all sections
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no TEXT NOT NULL UNIQUE, -- ZAB/26/PRI/0001
  full_name TEXT NOT NULL,
  gender public.gender,
  date_of_birth DATE,
  state_of_origin TEXT,
  lga TEXT,
  address TEXT,
  passport_url TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  parent_occupation TEXT,
  admission_session_id UUID REFERENCES public.academic_sessions(id),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_class_id UUID REFERENCES public.classes(id),
  current_arm_id UUID REFERENCES public.arms(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- when student has portal account
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_students_updated
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff view all students" ON public.students FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(),
      ARRAY['super_admin','director','principal','vice_principal','admission_officer','exam_officer','teacher','form_master']::public.app_role[])
    OR auth.uid() = user_id
  );
CREATE POLICY "Admission officers register students" ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','admission_officer']::public.app_role[]));
CREATE POLICY "Admission officers edit students" ON public.students FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','principal','admission_officer']::public.app_role[]));
CREATE POLICY "Super admin deletes students" ON public.students FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- ============ ADMISSION NUMBER GENERATOR ============
CREATE TABLE public.admission_sequence (
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  section public.section_code NOT NULL,
  last_serial INT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, section)
);
GRANT ALL ON public.admission_sequence TO service_role;
ALTER TABLE public.admission_sequence ENABLE ROW LEVEL SECURITY;
-- no client access; managed only by SECURITY DEFINER fn

CREATE OR REPLACE FUNCTION public.generate_admission_no(_session_id UUID, _section public.section_code)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _short_code TEXT;
  _next INT;
BEGIN
  SELECT short_code INTO _short_code FROM public.academic_sessions WHERE id = _session_id;
  IF _short_code IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;

  INSERT INTO public.admission_sequence(session_id, section, last_serial)
  VALUES (_session_id, _section, 1)
  ON CONFLICT (session_id, section)
  DO UPDATE SET last_serial = public.admission_sequence.last_serial + 1
  RETURNING last_serial INTO _next;

  RETURN 'ZAB/' || _short_code || '/' || _section::text || '/' || LPAD(_next::text, 4, '0');
END; $$;

-- ============ SEED DATA ============
INSERT INTO public.arms (name) VALUES ('A'),('B'),('C'),('D');

INSERT INTO public.classes (name, section, level_order) VALUES
  ('Nursery 1','NUR',1),('Nursery 2','NUR',2),('Nursery 3','NUR',3),
  ('Primary 1','PRI',1),('Primary 2','PRI',2),('Primary 3','PRI',3),
  ('Primary 4','PRI',4),('Primary 5','PRI',5),('Primary 6','PRI',6),
  ('JSS 1','SEC',1),('JSS 2','SEC',2),('JSS 3','SEC',3),
  ('SSS 1','SEC',4),('SSS 2','SEC',5),('SSS 3','SEC',6);

INSERT INTO public.subjects (name, code, section) VALUES
  ('Mathematics','MTH',NULL),
  ('English Language','ENG',NULL),
  ('Basic Science','BSC','PRI'),
  ('Civic Education','CIV',NULL),
  ('Social Studies','SOS','PRI'),
  ('Computer Studies','CMP',NULL),
  ('Agricultural Science','AGR','SEC'),
  ('Biology','BIO','SEC'),
  ('Chemistry','CHM','SEC'),
  ('Physics','PHY','SEC'),
  ('Literature in English','LIT','SEC'),
  ('Government','GOV','SEC'),
  ('Economics','ECO','SEC'),
  ('Hausa Language','HAU',NULL),
  ('Islamic Religious Studies','IRS',NULL),
  ('Christian Religious Studies','CRS',NULL),
  ('Phonics','PHN','NUR'),
  ('Rhymes & Stories','RHY','NUR');

INSERT INTO public.academic_sessions (name, short_code, is_current, start_date, end_date)
VALUES ('2025/2026','26',true,'2025-09-15','2026-07-24');

INSERT INTO public.terms (session_id, name, is_current)
SELECT id, 'First'::public.term_name, true FROM public.academic_sessions WHERE name='2025/2026'
UNION ALL
SELECT id, 'Second'::public.term_name, false FROM public.academic_sessions WHERE name='2025/2026'
UNION ALL
SELECT id, 'Third'::public.term_name, false FROM public.academic_sessions WHERE name='2025/2026';