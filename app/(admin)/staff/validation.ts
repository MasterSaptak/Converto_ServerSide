import { z } from 'zod'

export const InviteStaffSchema = z.object({
  email: z.string().email("Invalid email address").transform(val => val.trim().toLowerCase()),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  roleId: z.string().uuid("Invalid role ID").optional(), // Optional for now if no roles are seeded yet
})

export const UpdateStaffSchema = z.object({
  profileId: z.string().uuid("Invalid Profile ID"),
  fullName: z.string().min(2).max(100),
  isActive: z.boolean(),
  roleId: z.string().uuid("Invalid role ID").optional(),
  lastUpdatedAt: z.string().optional() // Optimistic concurrency token
})
