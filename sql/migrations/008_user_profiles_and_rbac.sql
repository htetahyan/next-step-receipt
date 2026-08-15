-- 008_user_profiles_and_rbac.sql
-- Create User Profiles and Granular RBAC Permissions Table

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'staff', -- 'admin' or 'staff'
    permissions jsonb NOT NULL DEFAULT '{
      "uae_visa": {"read": true, "create": false, "edit": false, "delete": false},
      "air_tickets": {"read": false, "create": false, "edit": false, "delete": false},
      "other_visa": {"read": false, "create": false, "edit": false, "delete": false},
      "tour_packages": {"read": false, "create": false, "edit": false, "delete": false},
      "customers": {"read": true, "create": false, "edit": false, "delete": false},
      "invoices": {"read": false, "create": false, "edit": false, "delete": false},
      "suppliers": {"read": false, "create": false, "edit": false, "delete": false},
      "settings": {"read": false, "create": false, "edit": false, "delete": false},
      "migration": {"read": false, "create": false, "edit": false, "delete": false}
    }'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.user_profiles;
CREATE POLICY "Enable all actions for authenticated users" ON public.user_profiles FOR ALL TO authenticated USING (true);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);

-- Backfill all existing auth.users as 'admin' with full permissions
INSERT INTO public.user_profiles (id, email, full_name, role, permissions)
SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 
    'admin', 
    '{
      "uae_visa": {"read": true, "create": true, "edit": true, "delete": true},
      "air_tickets": {"read": true, "create": true, "edit": true, "delete": true},
      "other_visa": {"read": true, "create": true, "edit": true, "delete": true},
      "tour_packages": {"read": true, "create": true, "edit": true, "delete": true},
      "customers": {"read": true, "create": true, "edit": true, "delete": true},
      "invoices": {"read": true, "create": true, "edit": true, "delete": true},
      "suppliers": {"read": true, "create": true, "edit": true, "delete": true},
      "settings": {"read": true, "create": true, "edit": true, "delete": true},
      "migration": {"read": true, "create": true, "edit": true, "delete": true}
    }'::jsonb
FROM auth.users u
ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    permissions = '{
      "uae_visa": {"read": true, "create": true, "edit": true, "delete": true},
      "air_tickets": {"read": true, "create": true, "edit": true, "delete": true},
      "other_visa": {"read": true, "create": true, "edit": true, "delete": true},
      "tour_packages": {"read": true, "create": true, "edit": true, "delete": true},
      "customers": {"read": true, "create": true, "edit": true, "delete": true},
      "invoices": {"read": true, "create": true, "edit": true, "delete": true},
      "suppliers": {"read": true, "create": true, "edit": true, "delete": true},
      "settings": {"read": true, "create": true, "edit": true, "delete": true},
      "migration": {"read": true, "create": true, "edit": true, "delete": true}
    }'::jsonb;
