CREATE OR REPLACE FUNCTION public.recompute_result_sheet(_student_id uuid, _term_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total NUMERIC; v_count INTEGER; v_avg NUMERIC;
  v_class UUID; v_arm UUID; v_session UUID;
BEGIN
  SELECT COALESCE(SUM(total),0), COUNT(*)
    INTO v_total, v_count
    FROM public.scores WHERE student_id = _student_id AND term_id = _term_id;

  IF v_count = 0 THEN
    DELETE FROM public.result_sheets WHERE student_id = _student_id AND term_id = _term_id;
    RETURN;
  END IF;

  SELECT class_id, arm_id, session_id
    INTO v_class, v_arm, v_session
    FROM public.scores
    WHERE student_id = _student_id AND term_id = _term_id
    LIMIT 1;

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
$function$;