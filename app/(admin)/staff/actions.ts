'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { hasPermission } from './permissions'
import { InviteStaffSchema, UpdateStaffSchema } from './validation'
import { logAudit } from './audit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function inviteStaffMember(formData: FormData) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Unauthorized' }

    // 1. RBAC Check
    const canCreate = await hasPermission(supabase, user.id, 'staff.create')
    if (!canCreate) return { success: false, message: 'Permission denied: Requires staff.create' }

    // 2. Zod Validation
    const rawData = {
      email: formData.get('email'),
      fullName: formData.get('fullName'),
      roleId: formData.get('roleId') || undefined
    }
    const parsed = InviteStaffSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, message: parsed.error.errors[0].message }
    const { email, fullName, roleId } = parsed.data

    // 3. Lookup Profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_staff, created_at')
      .eq('email', email)
      .single()

    let profileId = existingProfile?.id
    const ip = (await headers()).get('x-forwarded-for') || 'Unknown IP'
    const userAgent = (await headers()).get('user-agent') || 'Unknown Device'

    if (existingProfile) {
      if (existingProfile.is_staff) {
        // Edge Case: Already staff
        return { success: false, message: 'User is already a staff member.' }
      }

      // Edge Case: Promote Customer
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_staff: true, full_name: fullName })
        .eq('id', profileId)
        
      if (profileUpdateError) throw profileUpdateError

      const { error: staffError } = await supabaseAdmin
        .from('staff')
        .upsert({ id: profileId, is_active: true, role_id: roleId }, { onConflict: 'id' })

      if (staffError) throw staffError

      await logAudit(supabaseAdmin, {
        action: 'PROMOTED_STAFF',
        actor_id: user.id,
        target_staff_id: profileId,
        entity_type: 'staff',
        entity_id: profileId,
        new_data: { role_id: roleId, is_active: true },
        ip_address: ip,
        user_agent: userAgent
      })

    } else {
      // 4. Invite Resend Policy (Throttling) check
      // First, check if there is a pending invite in Auth users.
      // Note: We can't easily query auth.users by email from JS client without listing all users,
      // but inviteUserByEmail will handle resending. However, to throttle, we would need to track invites.
      // For now, we will attempt the invite and rely on Supabase's built-in invite logic.
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName }
      })
      if (inviteError) {
        if (inviteError.message.includes('already exists')) {
          return { success: false, message: 'User auth exists but no profile found. Please contact support.' }
        }
        throw inviteError
      }
      
      profileId = inviteData.user.id
      
      // Upsert profile and staff
      await supabaseAdmin.from('profiles').upsert({
        id: profileId,
        email: email,
        full_name: fullName,
        is_staff: true
      }, { onConflict: 'id' })

      await supabaseAdmin.from('staff').upsert({ 
        id: profileId, 
        is_active: true, 
        role_id: roleId 
      }, { onConflict: 'id' })

      await logAudit(supabaseAdmin, {
        action: 'INVITED_STAFF',
        actor_id: user.id,
        target_staff_id: profileId,
        entity_type: 'staff',
        entity_id: profileId,
        new_data: { email, full_name: fullName, role_id: roleId },
        ip_address: ip,
        user_agent: userAgent
      })
    }

    // 5. Cache Tagging Revalidation
    revalidateTag('staff')
    revalidateTag('dashboard')
    
    return { success: true, message: 'Staff member added successfully!', data: { profileId } }
  } catch (err: any) {
    console.error('inviteStaffMember error:', err)
    return { success: false, message: err.message || 'Failed to add staff member' }
  }
}

export async function updateStaffProfile(formData: FormData) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Unauthorized' }

    // 1. RBAC Check
    const canEdit = await hasPermission(supabaseAdmin, user.id, 'staff.edit')
    if (!canEdit) return { success: false, message: 'Permission denied: Requires staff.edit' }

    // 2. Zod Validation
    const rawData = {
      profileId: formData.get('profileId'),
      fullName: formData.get('fullName'),
      isActive: formData.get('isActive') === 'true',
      roleId: formData.get('roleId') || undefined,
      lastUpdatedAt: formData.get('lastUpdatedAt') || undefined
    }
    const parsed = UpdateStaffSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, message: parsed.error.errors[0].message }
    const { profileId, fullName, isActive, roleId, lastUpdatedAt } = parsed.data

    const ip = (await headers()).get('x-forwarded-for') || 'Unknown IP'
    const userAgent = (await headers()).get('user-agent') || 'Unknown Device'

    // 3. Optimistic Concurrency & Last Admin Check
    const { data: currentStaff } = await supabaseAdmin
      .from('staff')
      .select('is_active, role:roles(id, name), updated_at')
      .eq('id', profileId)
      .single()

    if (currentStaff) {
      // Check concurrency
      if (lastUpdatedAt && currentStaff.updated_at && currentStaff.updated_at !== lastUpdatedAt) {
        return { success: false, message: 'This profile has been modified by another admin. Please refresh and try again.' }
      }

      // Last Super Admin Protection
      let currentRoleId = (currentStaff.role as any)?.id
      let currentRoleName = (currentStaff.role as any)?.name
      if (Array.isArray(currentStaff.role)) {
        currentRoleId = currentStaff.role[0]?.id
        currentRoleName = currentStaff.role[0]?.name
      }

      if (!isActive || (roleId && roleId !== currentRoleId)) {
        if (currentRoleName === 'Super Admin') {
          const { count } = await supabaseAdmin
            .from('staff')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .not('id', 'eq', profileId)
          
          if (profileId === user.id) {
              return { success: false, message: 'You cannot deactivate or demote your own Super Admin account.' }
          }
        }
      }
    }

    // 4. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, is_staff: true })
      .eq('id', profileId)

    if (profileError) throw profileError

    // 5. Update or Insert Staff Record
    const updatePayload: any = { is_active: isActive }
    if (roleId) updatePayload.role_id = roleId

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .upsert({ id: profileId, ...updatePayload }, { onConflict: 'id' })

    if (staffError) throw staffError

    await logAudit(supabaseAdmin, {
      action: !isActive && currentStaff?.is_active ? 'DISABLED_STAFF' : (isActive && !currentStaff?.is_active ? 'REACTIVATED_STAFF' : 'UPDATED_STAFF_PROFILE'),
      actor_id: user.id,
      target_staff_id: profileId,
      entity_type: 'staff',
      entity_id: profileId,
      old_data: currentStaff || {},
      new_data: updatePayload,
      ip_address: ip,
      user_agent: userAgent
    })

    // 6. Cache Tagging Revalidation
    revalidateTag('staff')
    revalidateTag('dashboard')
    
    return { success: true, message: 'Profile updated successfully!' }
  } catch (err: any) {
    console.error('updateStaffProfile error:', err)
    return { success: false, message: err.message || 'Failed to update profile' }
  }
}
