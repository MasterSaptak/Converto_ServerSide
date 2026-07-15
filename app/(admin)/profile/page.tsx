import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch the data from the new staff_profile_view
  const { data: profile, error } = await supabase
    .from('staff_profile_view')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (profile && !profile.email) {
    profile.email = user.email
  }

  if (error || !profile) {
    console.error('Error fetching staff profile view:', JSON.stringify(error, null, 2))
    
    // Check if it's a "no rows returned" error (PGRST116)
    if (error?.code === 'PGRST116') {
      return (
        <div className="max-w-5xl mx-auto p-8 text-center">
          <h2 className="text-2xl font-black text-red-500 mb-2">Access Denied</h2>
          <p className="text-muted-foreground font-bold">Your account is not marked as staff (is_staff = true). Please update your profile in the database.</p>
        </div>
      )
    }

    // Fallback if view doesn't exist yet (before migration)
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-black text-red-500 mb-2">Database View Missing</h2>
        <p className="text-muted-foreground font-bold">
          Profile data is currently unavailable. Please ensure you have run the <code className="bg-muted px-2 py-1">schema_v4_profile.sql</code> script in your Supabase SQL Editor.
        </p>
      </div>
    )
  }

  // Fetch preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Fetch statistics
  const { data: stats } = await supabase
    .from('staff_statistics_view')
    .select('*')
    .eq('staff_id', profile.staff_record_id)
    .single()

  return <ProfileClient profile={profile} preferences={preferences || {}} stats={stats || {}} />
}
