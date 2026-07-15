'use client'

import { useState } from 'react'
import { 
  User, MapPin, Briefcase, Settings, 
  Moon, Bell, Shield, Activity, BarChart, 
  Upload, Save, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// We define our tabs and icons
const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'staff', label: 'Staff Information', icon: Briefcase },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Moon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'statistics', label: 'Statistics', icon: BarChart },
]

export default function ProfileClient({ profile, preferences, stats }: { profile: any, preferences: any, stats: any }) {
  const [activeTab, setActiveTab] = useState('personal')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  // Example save handler for Personal Info
  const handleSavePersonal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const updates = {
      full_name: formData.get('full_name'),
      username: formData.get('username'),
      phone: formData.get('phone'),
      country: formData.get('country'),
      timezone: formData.get('timezone'),
      preferred_currency: formData.get('preferred_currency')
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.profile_id)

    if (!error) {
      // Audit Log
      await supabase.from('audit_logs').insert({
        staff_id: profile.staff_record_id,
        action: 'UPDATE_PERSONAL_INFO',
        entity_type: 'profile',
        entity_id: profile.profile_id,
        new_data: updates
      })
      toast.success('Personal information updated!')
    } else {
      toast.error('Failed to update profile')
    }
    setIsSaving(false)
  }

  // Address Save
  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const updates = {
      address_street: formData.get('address_street'),
      address_city: formData.get('address_city'),
      address_state: formData.get('address_state'),
      address_postal_code: formData.get('address_postal_code')
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.profile_id)

    if (!error) {
      await supabase.from('audit_logs').insert({
        staff_id: profile.staff_record_id,
        action: 'UPDATE_ADDRESS',
        entity_type: 'profile',
        entity_id: profile.profile_id,
        new_data: updates
      })
      toast.success('Address updated successfully!')
    } else {
      toast.error('Failed to update address')
    }
    setIsSaving(false)
  }

  // Preferences Save
  const handleSavePreferences = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const updates = {
      language: formData.get('language'),
      time_format: formData.get('time_format'),
      date_format: formData.get('date_format'),
      dashboard_density: formData.get('dashboard_density')
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({ profile_id: profile.profile_id, ...updates }, { onConflict: 'profile_id' })

    if (!error) {
      await supabase.from('audit_logs').insert({
        staff_id: profile.staff_record_id,
        action: 'UPDATE_PREFERENCES',
        entity_type: 'user_preferences',
        entity_id: profile.profile_id,
        new_data: updates
      })
      toast.success('Preferences saved!')
    } else {
      toast.error('Failed to update preferences')
    }
    setIsSaving(false)
  }

  // Handle Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.profile_id}-${Math.random()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload avatar')
      setIsSaving(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.profile_id)

    if (updateError) {
      toast.error('Failed to update profile with new avatar')
    } else {
      await supabase.from('audit_logs').insert({
        staff_id: profile.staff_record_id,
        action: 'UPDATE_AVATAR',
        entity_type: 'profile',
        entity_id: profile.profile_id,
        new_data: { avatar_url: publicUrl }
      })
      toast.success('Avatar updated successfully! Refresh to see changes.')
    }
    setIsSaving(false)
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex items-end gap-6 border-b-4 border-border pb-6">
        <label className="relative group cursor-pointer block">
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isSaving} />
          <Avatar className="w-24 h-24 border-4 border-border rounded-none after:rounded-none shadow-[4px_4px_0px_0px_var(--color-border)]">
            <AvatarImage src={profile.avatar_url || ""} className="object-cover rounded-none" />
            <AvatarFallback className="rounded-none bg-accent text-accent-foreground text-3xl font-black">
              {profile.full_name?.substring(0,2).toUpperCase() || 'AD'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
        </label>
        <div className="flex-1">
          <h1 className="text-4xl font-black tracking-tight uppercase">{profile.full_name || 'Staff Member'}</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mt-1">
            {profile.role_name || 'Admin'} • {profile.department_name || 'Operations'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase text-muted-foreground">Profile Completion</div>
          <div className="text-2xl font-black">84%</div>
          <div className="w-48 h-2 border-2 border-border mt-1">
            <div className="h-full bg-accent" style={{ width: '84%' }}></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 sticky top-28">
          <div className="font-black uppercase tracking-widest text-xs text-muted-foreground mb-2">My Account</div>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 border-2 transition-all font-bold text-sm ${
                  isActive 
                  ? 'border-border bg-accent text-accent-foreground shadow-[2px_2px_0px_0px_var(--color-border)]' 
                  : 'border-transparent hover:border-border hover:bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonal} className="brutal-card p-8 space-y-6">
              <div className="border-b-4 border-border pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase">Personal Information</h2>
                <p className="text-muted-foreground text-sm font-bold">Manage your basic profile details.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Full Name</label>
                  <input name="full_name" defaultValue={profile.full_name} className="brutal-input w-full font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Username</label>
                  <input name="username" defaultValue={profile.username} className="brutal-input w-full font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Email Address (Read Only)</label>
                  <input defaultValue={profile.email} readOnly className="brutal-input w-full bg-muted text-muted-foreground cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Phone Number</label>
                  <input name="phone" defaultValue={profile.phone} className="brutal-input w-full font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Country</label>
                  <input name="country" defaultValue={profile.country} className="brutal-input w-full font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Timezone</label>
                  <select name="timezone" defaultValue={profile.timezone} className="brutal-input w-full font-bold">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Dhaka">Asia/Dhaka</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="brutal-button flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Personal Information
                </button>
              </div>
            </form>
          )}

          {/* ADDRESS */}
          {activeTab === 'address' && (
            <form onSubmit={handleSaveAddress} className="brutal-card p-8 space-y-6">
              <div className="border-b-4 border-border pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase">Address</h2>
                <p className="text-muted-foreground text-sm font-bold">Your physical location for records.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Street Address</label>
                  <input name="address_street" defaultValue={profile.address_street} className="brutal-input w-full font-bold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">City</label>
                    <input name="address_city" defaultValue={profile.address_city} className="brutal-input w-full font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">State / Province</label>
                    <input name="address_state" defaultValue={profile.address_state} className="brutal-input w-full font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">Postal Code</label>
                    <input name="address_postal_code" defaultValue={profile.address_postal_code} className="brutal-input w-full font-bold" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="brutal-button flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Address
                </button>
              </div>
            </form>
          )}

          {/* STAFF INFO */}
          {activeTab === 'staff' && (
            <div className="brutal-card p-8 space-y-6 bg-muted/30">
              <div className="border-b-4 border-border pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase">Staff Information</h2>
                <p className="text-muted-foreground text-sm font-bold">Operational details and access levels (Read-Only).</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-4 border-2 border-border bg-card">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employee ID / Record</div>
                  <div className="font-bold text-sm truncate">{profile.staff_record_id}</div>
                </div>
                <div className="space-y-2 p-4 border-2 border-border bg-card">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Department</div>
                  <div className="font-bold text-sm">{profile.department_name || 'Operations'}</div>
                </div>
                <div className="space-y-2 p-4 border-2 border-border bg-card">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Role</div>
                  <div className="font-bold text-sm">{profile.role_name || 'Admin'}</div>
                </div>
                <div className="space-y-2 p-4 border-2 border-border bg-card">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${profile.staff_status ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {profile.staff_status ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="space-y-2 p-4 border-2 border-border bg-card">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Joined Date</div>
                  <div className="font-bold text-sm">
                    {profile.joined_date ? new Date(profile.joined_date).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSavePreferences} className="brutal-card p-8 space-y-6">
              <div className="border-b-4 border-border pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase">Preferences</h2>
                <p className="text-muted-foreground text-sm font-bold">Customize your operational environment.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Language</label>
                  <select name="language" defaultValue={preferences?.language || 'en'} className="brutal-input w-full font-bold">
                    <option value="en">English (US)</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Date Format</label>
                  <select name="date_format" defaultValue={preferences?.date_format || 'MM/DD/YYYY'} className="brutal-input w-full font-bold">
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Time Format</label>
                  <select name="time_format" defaultValue={preferences?.time_format || '24h'} className="brutal-input w-full font-bold">
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Dashboard Density</label>
                  <select name="dashboard_density" defaultValue={preferences?.dashboard_density || 'comfortable'} className="brutal-input w-full font-bold">
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="brutal-button flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* STATISTICS */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="border-b-4 border-border pb-4">
                <h2 className="text-2xl font-black uppercase">Profile Statistics</h2>
                <p className="text-muted-foreground text-sm font-bold">Your performance and engagement metrics.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="brutal-card p-6 bg-accent text-accent-foreground text-center">
                  <div className="text-4xl font-black">{stats?.assigned_requests || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">Assigned Requests</div>
                </div>
                <div className="brutal-card p-6 bg-green-400 text-black text-center">
                  <div className="text-4xl font-black">{stats?.completed_requests || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">Completed</div>
                </div>
                <div className="brutal-card p-6 bg-black text-white text-center">
                  <div className="text-4xl font-black">{stats?.avg_response_time_hours || 0}h</div>
                  <div className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">Avg Response Time</div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY placeholder */}
          {activeTab === 'security' && (
            <div className="brutal-card p-8 space-y-8">
              <div className="border-b-4 border-border pb-4">
                <h2 className="text-2xl font-black uppercase">Credentials & Security</h2>
                <p className="text-muted-foreground text-sm font-bold">Manage your login methods and sessions.</p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-black uppercase text-sm border-b-2 border-border pb-2 inline-block">Update Password</h3>
                <form className="space-y-4 max-w-sm">
                   <input type="password" placeholder="New Password" className="brutal-input w-full" />
                   <input type="password" placeholder="Confirm Password" className="brutal-input w-full" />
                   <button type="button" className="brutal-button w-full">Update Password</button>
                </form>
              </div>

              <div className="space-y-4 pt-8 border-t-4 border-border">
                <h3 className="font-black uppercase text-sm border-b-2 border-border pb-2 inline-block">Active Sessions</h3>
                <div className="p-4 border-2 border-border bg-card flex justify-between items-center">
                   <div>
                     <p className="font-bold text-sm">Windows PC - Chrome</p>
                     <p className="text-xs text-green-500 font-bold uppercase">Current Session</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-muted-foreground font-bold">IP: 192.168.1.100</p>
                   </div>
                </div>
                <button type="button" className="brutal-button bg-destructive text-destructive-foreground hover:bg-red-600">Logout All Other Devices</button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="brutal-card p-8 space-y-8">
              <div className="border-b-4 border-border pb-4">
                <h2 className="text-2xl font-black uppercase">Notifications</h2>
                <p className="text-muted-foreground text-sm font-bold">Manage how and when you receive alerts.</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-black uppercase text-sm border-b-2 border-border pb-2 inline-block mb-4">Communication</h3>
                  <div className="space-y-4">
                    {['Email', 'Push', 'SMS'].map(item => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 border-2 border-border accent-black" />
                        <span className="font-bold">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-black uppercase text-sm border-b-2 border-border pb-2 inline-block mb-4">System</h3>
                  <div className="space-y-4">
                    {['Request Updates', 'Promotions', 'Security Alerts'].map(item => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 border-2 border-border accent-black" />
                        <span className="font-bold">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="button" className="brutal-button flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Notifications
                </button>
              </div>
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="brutal-card p-8 space-y-6 bg-muted/30">
              <div className="border-b-4 border-border pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase">Activity</h2>
                <p className="text-muted-foreground text-sm font-bold">Recent actions on your account.</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: 'Recent Login', detail: 'Windows PC - Chrome', time: '2 hours ago' },
                  { title: 'Updated Timezone', detail: 'UTC → Asia/Kolkata', time: '1 day ago' },
                  { title: 'Password Changed', detail: 'Security action', time: '1 week ago' }
                ].map((act, i) => (
                  <div key={i} className="p-4 border-2 border-border bg-card flex justify-between items-center">
                    <div>
                      <p className="font-bold">{act.title}</p>
                      <p className="text-xs text-muted-foreground font-bold">{act.detail}</p>
                    </div>
                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {act.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholders for others */}
          {['overview', 'appearance'].includes(activeTab) && (
            <div className="brutal-card p-12 text-center text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-black uppercase">Under Construction</h2>
              <p className="font-bold text-sm">This section is coming soon.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
