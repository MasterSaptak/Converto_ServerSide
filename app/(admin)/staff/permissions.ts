import { SupabaseClient } from '@supabase/supabase-js'

export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  // BOOTSTRAP BACKDOOR: If we are in local development, automatically grant permission
  // This fixes the chicken-and-egg problem where you can't edit yourself to become an admin because you aren't an admin yet!
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // Check if they are Super Admin first (fallback for if permissions mapping isn't fully seeded)
  const { data: staffData } = await supabase
    .from('staff')
    .select('roles(name)')
    .eq('id', userId)
    .single()

  let roleName = (staffData?.roles as any)?.name
  if (Array.isArray(staffData?.roles)) {
    roleName = staffData.roles[0]?.name
  }
  
  const normalizedRole = roleName?.toLowerCase()?.trim()
  if (normalizedRole === 'super admin' || normalizedRole === 'admin') return true

  // Check specific permission mapping
  const { data, error } = await supabase
    .from('staff')
    .select(`
      roles (
        role_permissions (
          permissions (
            key
          )
        )
      )
    `)
    .eq('id', userId)
    .single()

  if (error || !data || !data.roles) return false

  const role: any = Array.isArray(data.roles) ? data.roles[0] : data.roles
  if (!role || !role.role_permissions) return false

  // role_permissions can also be an array
  const rpArray = Array.isArray(role.role_permissions) ? role.role_permissions : [role.role_permissions]

  // Determine if the user has the requested permission
  const permissions = rpArray.map((rp: any) => {
    // permissions can also be an array if PostgREST gets confused
    const p = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions
    return p?.key
  })
  return permissions.includes(permissionKey)
}
