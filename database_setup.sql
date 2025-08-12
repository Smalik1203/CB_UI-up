-- Weekly Period Management Database Setup
-- This script sets up the necessary tables and functions for managing weekly periods

-- 1. Ensure the periods table exists (if not already created)
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_instance_id uuid NOT NULL,
  period_number integer NOT NULL,
  start_time time WITHOUT TIME ZONE NOT NULL,
  end_time time WITHOUT TIME ZONE NOT NULL,
  CONSTRAINT periods_pkey PRIMARY KEY (id),
  CONSTRAINT periods_class_instance_id_period_number_key UNIQUE (class_instance_id, period_number),
  CONSTRAINT periods_class_instance_id_fkey FOREIGN KEY (class_instance_id) REFERENCES class_instances(id) ON DELETE CASCADE,
  CONSTRAINT periods_period_number_check CHECK ((period_number >= 1))
) TABLESPACE pg_default;

-- 2. Ensure the timetable table exists (if not already created)
CREATE TABLE IF NOT EXISTS public.timetable (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_instance_id uuid NOT NULL,
  class_date date NOT NULL,
  period_number integer NOT NULL,
  subject_id uuid,
  admin_id uuid,
  school_code text NOT NULL,
  start_time time WITHOUT TIME ZONE NOT NULL,
  end_time time WITHOUT TIME ZONE NOT NULL,
  created_by text NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  CONSTRAINT timetable_pkey PRIMARY KEY (id),
  CONSTRAINT timetable_class_instance_id_class_date_period_number_key UNIQUE (class_instance_id, class_date, period_number),
  CONSTRAINT timetable_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE,
  CONSTRAINT timetable_class_instance_id_fkey FOREIGN KEY (class_instance_id) REFERENCES class_instances(id) ON DELETE CASCADE,
  CONSTRAINT timetable_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 3. Create a function to apply weekly periods to a date range
CREATE OR REPLACE FUNCTION apply_weekly_periods_to_date_range(
  p_class_instance_id uuid,
  p_start_date date,
  p_end_date date,
  p_school_code text,
  p_created_by text
) RETURNS void AS $$
DECLARE
  period_record RECORD;
  current_date date;
  day_of_week integer;
BEGIN
  -- Delete existing timetable entries for the date range
  DELETE FROM timetable 
  WHERE class_instance_id = p_class_instance_id 
    AND class_date >= p_start_date 
    AND class_date <= p_end_date;
  
  -- Loop through each date in the range
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    -- Get day of week (0 = Sunday, 6 = Saturday)
    day_of_week := EXTRACT(DOW FROM current_date);
    
    -- Only apply periods on weekdays (Monday = 1, Tuesday = 2, ..., Friday = 5)
    IF day_of_week BETWEEN 1 AND 5 THEN
      -- Loop through all periods for this class
      FOR period_record IN 
        SELECT * FROM periods 
        WHERE class_instance_id = p_class_instance_id 
        ORDER BY period_number
      LOOP
        -- Insert timetable entry for this period on this date
        INSERT INTO timetable (
          class_instance_id,
          class_date,
          period_number,
          subject_id,
          admin_id,
          school_code,
          start_time,
          end_time,
          created_by
        ) VALUES (
          p_class_instance_id,
          current_date,
          period_record.period_number,
          NULL, -- subject_id will be assigned later
          NULL, -- admin_id will be assigned later
          p_school_code,
          period_record.start_time,
          period_record.end_time,
          p_created_by
        );
      END LOOP;
    END IF;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to get school days in a date range
CREATE OR REPLACE FUNCTION get_school_days_in_range(
  p_start_date date,
  p_end_date date
) RETURNS TABLE(school_date date) AS $$
DECLARE
  current_date date;
  day_of_week integer;
BEGIN
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    day_of_week := EXTRACT(DOW FROM current_date);
    IF day_of_week BETWEEN 1 AND 5 THEN
      school_date := current_date;
      RETURN NEXT;
    END IF;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_periods_class_instance_id ON periods(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_periods_period_number ON periods(period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_class_instance_id ON timetable(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class_date ON timetable(class_date);
CREATE INDEX IF NOT EXISTS idx_timetable_period_number ON timetable(period_number);

-- 6. Create a view for easy period management
CREATE OR REPLACE VIEW period_summary AS
SELECT 
  p.id,
  p.class_instance_id,
  ci.grade,
  ci.section,
  p.period_number,
  p.start_time,
  p.end_time,
  EXTRACT(EPOCH FROM (p.end_time - p.start_time))/60 as duration_minutes
FROM periods p
JOIN class_instances ci ON p.class_instance_id = ci.id
ORDER BY ci.grade, ci.section, p.period_number;

-- 7. Create a view for timetable summary
CREATE OR REPLACE VIEW timetable_summary AS
SELECT 
  t.id,
  t.class_instance_id,
  ci.grade,
  ci.section,
  t.class_date,
  t.period_number,
  s.subject_name,
  a.full_name as teacher_name,
  t.start_time,
  t.end_time,
  t.school_code
FROM timetable t
JOIN class_instances ci ON t.class_instance_id = ci.id
LEFT JOIN subjects s ON t.subject_id = s.id
LEFT JOIN admin a ON t.admin_id = a.id
ORDER BY t.class_date, t.period_number;

-- 8. Add comments for documentation
COMMENT ON TABLE periods IS 'Stores the weekly period schedule for each class';
COMMENT ON TABLE timetable IS 'Stores the actual timetable entries for specific dates';
COMMENT ON FUNCTION apply_weekly_periods_to_date_range IS 'Applies weekly periods to a date range, excluding weekends';
COMMENT ON FUNCTION get_school_days_in_range IS 'Returns all school days (weekdays) in a given date range';
COMMENT ON VIEW period_summary IS 'Summary view of all periods with class information';
COMMENT ON VIEW timetable_summary IS 'Summary view of all timetable entries with class, subject, and teacher information'; 