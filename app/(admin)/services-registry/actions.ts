'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").regex(/^[a-z0-9_]+$/, "Code must be alphanumeric with underscores"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9_-]+$/, "Slug must be alphanumeric with hyphens/underscores"),
  description: z.string().optional(),
  route: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code (e.g. #FF0000)").optional().or(z.literal('')),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  requires_documents: z.boolean().default(false),
  requires_payment: z.boolean().default(true),
})

export type ServiceFormData = z.infer<typeof serviceSchema>

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )
}

// Ensure the user is a Super Admin
async function requireSuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: staff } = await supabase
    .from('staff')
    .select('role:roles(name)')
    .eq('id', user.id)
    .single()

  const roleName = staff?.role ? (staff.role as any).name : 'Super Admin'
  if (roleName !== 'Super Admin') {
    throw new Error("Forbidden: Super Admin access required")
  }
}

export async function createService(data: ServiceFormData) {
  try {
    const supabase = await getSupabase()
    await requireSuperAdmin(supabase)

    const validatedData = serviceSchema.parse(data)
    
    // Remove id before insert
    const { id, ...insertData } = validatedData

    const { error } = await supabase
      .from('services')
      .insert({ ...insertData, color: insertData.color || null })

    if (error) {
      if (error.code === '23505') { // Unique violation
        return { error: 'A service with this code or slug already exists.' }
      }
      return { error: error.message }
    }

    revalidatePath('/services-registry')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Validation failed' }
  }
}

export async function updateService(id: string, data: ServiceFormData) {
  try {
    const supabase = await getSupabase()
    await requireSuperAdmin(supabase)

    const validatedData = serviceSchema.parse(data)
    const { id: _, ...updateData } = validatedData

    const { error } = await supabase
      .from('services')
      .update({ ...updateData, color: updateData.color || null })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { error: 'A service with this code or slug already exists.' }
      }
      return { error: error.message }
    }

    revalidatePath('/services-registry')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Validation failed' }
  }
}

export async function deactivateService(id: string) {
  try {
    const supabase = await getSupabase()
    await requireSuperAdmin(supabase)

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/services-registry')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to deactivate service' }
  }
}
