
-- ============ Cleanup old commission app ============
DROP TRIGGER IF EXISTS audit_deals_changes ON public.deals;
DROP FUNCTION IF EXISTS public.audit_deals_changes() CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.reps CASCADE;
DROP TABLE IF EXISTS public.comp_tiers CASCADE;
DROP TABLE IF EXISTS public.comp_plans CASCADE;
DROP TABLE IF EXISTS public.quota_tiers CASCADE;

-- ============ Expand app_role enum ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'principal';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_principal';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admission_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'form_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'exam_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- ============ Profiles ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, name, full_name, email)
  VALUES (NEW.id, NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ Rebuild audit_log ============
DROP TABLE IF EXISTS public.audit_log CASCADE;
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_all_auth" ON public.audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ updated_at helper already exists (update_updated_at_column) ============

-- ============ academic_sessions ============
CREATE TABLE public.academic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_sessions TO authenticated;
GRANT ALL ON public.academic_sessions TO service_role;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_all_auth" ON public.academic_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.academic_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ terms ============
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terms_all_auth" ON public.terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ classes ============
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  level_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_all_auth" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ arms ============
CREATE TABLE public.arms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arms TO authenticated;
GRANT ALL ON public.arms TO service_role;
ALTER TABLE public.arms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arms_all_auth" ON public.arms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_arms_updated BEFORE UPDATE ON public.arms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ subjects ============
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  section TEXT,
  min_level_order INTEGER,
  max_level_order INTEGER,
  restricted_arm_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_all_auth" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ students ============
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  state_of_origin TEXT,
  lga TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  parent_occupation TEXT,
  passport_url TEXT,
  current_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  current_arm_id UUID REFERENCES public.arms(id) ON DELETE SET NULL,
  admission_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_all_auth" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ staff ============
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  employee_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  department TEXT,
  qualification TEXT,
  address TEXT,
  state_of_origin TEXT,
  lga TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  date_employed DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_auth" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ teacher_assignments ============
CREATE TABLE public.teacher_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, subject_id, class_id, arm_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ta_all_auth" ON public.teacher_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ta_updated BEFORE UPDATE ON public.teacher_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ subject_offerings ============
CREATE TABLE public.subject_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, class_id, arm_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_offerings TO authenticated;
GRANT ALL ON public.subject_offerings TO service_role;
ALTER TABLE public.subject_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "so_all_auth" ON public.subject_offerings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ grade_scale ============
CREATE TABLE public.grade_scale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grade_scale TO authenticated;
GRANT ALL ON public.grade_scale TO service_role;
ALTER TABLE public.grade_scale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs_all_auth" ON public.grade_scale FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ scores ============
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  ca1 NUMERIC NOT NULL DEFAULT 0,
  ca2 NUMERIC NOT NULL DEFAULT 0,
  ca3 NUMERIC NOT NULL DEFAULT 0,
  exam NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  grade TEXT,
  remark TEXT,
  entered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, term_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_all_auth" ON public.scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_scores_updated BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- compute total + grade from grade_scale
CREATE OR REPLACE FUNCTION public.compute_score_grade()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE g RECORD;
BEGIN
  NEW.total := COALESCE(NEW.ca1,0) + COALESCE(NEW.ca2,0) + COALESCE(NEW.ca3,0) + COALESCE(NEW.exam,0);
  SELECT grade, remark INTO g FROM public.grade_scale
   WHERE NEW.total >= min_score AND NEW.total <= max_score
   ORDER BY min_score DESC LIMIT 1;
  IF FOUND THEN
    NEW.grade := g.grade;
    NEW.remark := g.remark;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_scores_grade BEFORE INSERT OR UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.compute_score_grade();

-- ============ result_sheets ============
CREATE TABLE public.result_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  arm_id UUID REFERENCES public.arms(id) ON DELETE SET NULL,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  total_score NUMERIC NOT NULL DEFAULT 0,
  total_obtainable NUMERIC NOT NULL DEFAULT 0,
  average NUMERIC NOT NULL DEFAULT 0,
  position INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  promoted BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_sheets TO authenticated;
GRANT ALL ON public.result_sheets TO service_role;
ALTER TABLE public.result_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_all_auth" ON public.result_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON public.result_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ attendance ============
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES public.arms(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  note TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_all_auth" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_att_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ scratch_cards ============
CREATE TABLE public.scratch_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  uses INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scratch_cards TO authenticated;
GRANT ALL ON public.scratch_cards TO service_role;
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_all_auth" ON public.scratch_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sc_updated BEFORE UPDATE ON public.scratch_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ announcements ============
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  arm_id UUID REFERENCES public.arms(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_all_auth" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ school_settings (single row, id=1) ============
CREATE TABLE public.school_settings (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  school_name TEXT NOT NULL DEFAULT 'Zinnuryn Academy',
  acronym TEXT NOT NULL DEFAULT 'ZAB',
  location TEXT NOT NULL DEFAULT 'Bauchi, Nigeria',
  motto TEXT,
  logo_url TEXT,
  principal_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  scratch_card_default_uses INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_all_auth" ON public.school_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ss_updated BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.generate_admission_no(_session_id UUID, _section TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE short TEXT; seq INTEGER;
BEGIN
  SELECT COALESCE(short_code, '00') INTO short FROM public.academic_sessions WHERE id = _session_id;
  IF short IS NULL THEN short := to_char(now(),'YY'); END IF;
  SELECT COUNT(*) + 1 INTO seq FROM public.students WHERE admission_session_id = _session_id;
  RETURN 'ZA/' || short || '/' || lpad(seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_employee_no()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE yr TEXT; seq INTEGER;
BEGIN
  yr := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq FROM public.staff;
  RETURN 'ZA-' || yr || '-' || lpad(seq::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_result_sheet(_student_id UUID, _term_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_total NUMERIC; v_count INTEGER; v_avg NUMERIC;
  v_class UUID; v_arm UUID; v_session UUID;
BEGIN
  SELECT COALESCE(SUM(total),0), COUNT(*),
         MAX(class_id), MAX(arm_id), MAX(session_id)
    INTO v_total, v_count, v_class, v_arm, v_session
    FROM public.scores WHERE student_id = _student_id AND term_id = _term_id;

  IF v_count = 0 THEN
    DELETE FROM public.result_sheets WHERE student_id = _student_id AND term_id = _term_id;
    RETURN;
  END IF;

  v_avg := ROUND(v_total / v_count, 2);

  INSERT INTO public.result_sheets (student_id, class_id, arm_id, term_id, session_id, total_score, total_obtainable, average)
  VALUES (_student_id, v_class, v_arm, _term_id, v_session, v_total, v_count * 100, v_avg)
  ON CONFLICT (student_id, term_id) DO UPDATE
    SET total_score = EXCLUDED.total_score,
        total_obtainable = EXCLUDED.total_obtainable,
        average = EXCLUDED.average,
        class_id = EXCLUDED.class_id,
        arm_id = EXCLUDED.arm_id,
        session_id = EXCLUDED.session_id,
        updated_at = now();
END;
$$;
