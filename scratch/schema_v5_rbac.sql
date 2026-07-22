-- Schema V5: RBAC Permissions and Audit Enhancements

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 3. Insert baseline permissions for staff management
INSERT INTO public.permissions (key, description) VALUES
    ('staff.create', 'Can invite or promote staff members'),
    ('staff.edit', 'Can edit staff profiles and active status'),
    ('staff.disable', 'Can deactivate staff members'),
    ('staff.roles.assign', 'Can assign or change staff roles')
ON CONFLICT (key) DO NOTHING;

-- 4. Assign permissions to Super Admin role
-- Ensure 'Super Admin' role exists
INSERT INTO public.roles (id, name, description) 
VALUES (gen_random_uuid(), 'Super Admin', 'Full system access')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to Super Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Add actor_id, ip, user_agent to audit_logs if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address') THEN
        ALTER TABLE public.audit_logs ADD COLUMN ip_address VARCHAR(45);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_agent') THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;
