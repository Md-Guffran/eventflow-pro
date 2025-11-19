-- Create enum for attendee types
CREATE TYPE public.attendee_type AS ENUM ('alumni', 'faculty', 'volunteer', 'other');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'volunteer');

-- Create attendees table
CREATE TABLE public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id TEXT UNIQUE NOT NULL,
  type attendee_type NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  assigned BOOLEAN DEFAULT false,
  
  day1_entrance BOOLEAN DEFAULT false,
  day1_lunch BOOLEAN DEFAULT false,
  day1_dinner BOOLEAN DEFAULT false,
  day1_kit BOOLEAN DEFAULT false,
  
  day2_entrance BOOLEAN DEFAULT false,
  day2_lunch BOOLEAN DEFAULT false,
  day2_kit BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_settings table
CREATE TABLE public.event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day1_enabled BOOLEAN DEFAULT true,
  day2_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default event settings
INSERT INTO public.event_settings (day1_enabled, day2_enabled) VALUES (true, true);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id TEXT NOT NULL REFERENCES public.attendees(attendee_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  day INTEGER NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for attendees (volunteers and admins can view/update)
CREATE POLICY "Authenticated users can view attendees"
  ON public.attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendees"
  ON public.attendees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendees"
  ON public.attendees FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for event_settings (admins only can update)
CREATE POLICY "Everyone can view event settings"
  ON public.event_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update event settings"
  ON public.event_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_log
CREATE POLICY "Authenticated users can view activity log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_roles (admins only)
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_attendees_qr_code ON public.attendees(qr_code);
CREATE INDEX idx_attendees_email ON public.attendees(email);
CREATE INDEX idx_attendees_attendee_id ON public.attendees(attendee_id);
CREATE INDEX idx_activity_log_attendee_id ON public.activity_log(attendee_id);
CREATE INDEX idx_activity_log_timestamp ON public.activity_log(timestamp);

-- Function to generate next attendee ID
CREATE OR REPLACE FUNCTION public.get_next_attendee_id(attendee_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
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