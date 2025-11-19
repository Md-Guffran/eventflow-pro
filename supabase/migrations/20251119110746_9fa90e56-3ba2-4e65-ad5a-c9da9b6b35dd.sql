-- Fix search_path for get_next_attendee_id function
CREATE OR REPLACE FUNCTION public.get_next_attendee_id(attendee_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  new_id TEXT;
BEGIN
  -- Determine prefix based on type
  CASE attendee_type
    WHEN 'alumni' THEN prefix := 'AL';
    WHEN 'faculty' THEN prefix := 'FL';
    WHEN 'volunteer' THEN prefix := 'VL';
    WHEN 'other' THEN prefix := 'OT';
    ELSE RAISE EXCEPTION 'Invalid attendee type';
  END CASE;
  
  -- Get the highest number for this prefix
  SELECT COALESCE(MAX(CAST(SUBSTRING(attendee_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.attendees
  WHERE attendee_id LIKE prefix || '-%';
  
  -- Format as XXX-000
  new_id := prefix || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;