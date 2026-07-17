

import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Globe, 
  Cpu, 
  Save, 
  Cloud 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireStaffRole } from '@/lib/rbac'
import { logAuditAction } from '@/lib/audit'

async function saveSettings(formData: FormData) {
  'use server'
  const user = await requireStaffRole(['Super Admin'])
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const newSettings = [
    { key: 'business_name', value: formData.get('business_name'), category: 'general' },
    { key: 'operating_region', value: formData.get('operating_region'), category: 'general' },
    { key: 'base_currency', value: formData.get('base_currency'), category: 'general' },
    { key: 'mfa_enabled', value: formData.get('mfa_enabled') === 'on', category: 'security' },
    { key: 'session_timeout', value: formData.get('session_timeout') === 'on', category: 'security' },
    { key: 'ai_categorization', value: formData.get('ai_categorization') === 'on', category: 'ai' },
    { key: 'ai_fraud_detection', value: formData.get('ai_fraud_detection') === 'on', category: 'ai' },
    { key: 'ai_smart_quote', value: formData.get('ai_smart_quote') === 'on', category: 'ai' },
  ].filter(s => s.value !== null)

  // Upsert settings
  for (const setting of newSettings) {
    await supabase
      .from('settings')
      .upsert({
        key: setting.key,
        value: setting.value,
        category: setting.category,
        updated_by: user.id
      })
  }

  await logAuditAction({
    action: 'UPDATE_GLOBAL_SETTINGS',
    entity_type: 'settings',
    new_data: Object.fromEntries(newSettings.map(s => [s.key, s.value]))
  })

  revalidatePath('/settings')
}

export default async function SettingsPage() {
  await requireStaffRole(['Super Admin'])

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const { data: rawSettings } = await supabase.from('settings').select('*')
  
  // Transform to key-value map
  const settings: Record<string, any> = {}
  if (rawSettings) {
    rawSettings.forEach((s: any) => {
      settings[s.key] = s.value
    })
  }

  // Defaults if missing
  const businessName = settings['business_name'] || 'Converto Global Ltd'
  const operatingRegion = settings['operating_region'] || 'Global (Multi-region)'
  const baseCurrency = settings['base_currency'] || 'USD'
  const mfaEnabled = settings['mfa_enabled'] ?? true
  const sessionTimeout = settings['session_timeout'] ?? true
  const aiCategorization = settings['ai_categorization'] ?? true
  const aiFraud = settings['ai_fraud_detection'] ?? true
  const aiQuote = settings['ai_smart_quote'] ?? true

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <form action={saveSettings} className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase">System Settings</h2>
            <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Configure Global Operations and ERP Behavior</p>
          </div>
          <button type="submit" className="brutal-button flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>

        <div className="brutal-card bg-white overflow-hidden flex flex-col min-h-[600px]">
          <Tabs defaultValue="general" className="flex-1 flex flex-col">
             <TabsList className="bg-slate-50 border-b-4 border-black rounded-none p-0 h-16 w-full overflow-x-auto">
                {[
                  { label: 'General', value: 'general', icon: Globe },
                  { label: 'Security', value: 'security', icon: Shield },
                  { label: 'Notifications', value: 'notifications', icon: Bell },
                  { label: 'Database', value: 'database', icon: Database },
                  { label: 'AI & Automations', value: 'ai', icon: Cpu },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-[120px] h-full rounded-none font-black uppercase text-xs data-[state=active]:bg-accent data-[state=active]:border-black border-r-2 border-black last:border-0">
                     <div className="flex items-center gap-2">
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                     </div>
                  </TabsTrigger>
                ))}
             </TabsList>
             
             <TabsContent value="general" className="flex-1 p-8 m-0 space-y-8 max-w-3xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase">Business Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-black/40 tracking-widest">Business Name</label>
                        <input type="text" name="business_name" defaultValue={businessName} className="brutal-input w-full" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-black/40 tracking-widest">Operating Region</label>
                        <select name="operating_region" defaultValue={operatingRegion} className="brutal-input w-full font-bold">
                          <option value="Global (Multi-region)">Global (Multi-region)</option>
                          <option value="Africa (Nigeria Focus)">Africa (Nigeria Focus)</option>
                          <option value="Europe">Europe</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase">Currency Settings</h3>
                    <div className="p-4 border-2 border-black bg-slate-50 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="font-bold">Base Currency</span>
                         <input type="hidden" name="base_currency" value={baseCurrency} />
                         <Badge variant="outline" className="border-2 border-black font-black uppercase bg-accent">{baseCurrency}</Badge>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-black/40">Supported Currencies</label>
                         <div className="flex flex-wrap gap-2">
                            {['USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'KES'].map(c => (
                              <span key={c} className="px-2 py-1 border-2 border-black font-bold text-xs bg-white">{c}</span>
                            ))}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
             </TabsContent>

             <TabsContent value="security" className="flex-1 p-8 m-0 space-y-8 max-w-3xl">
                <div className="space-y-6">
                   <div className="space-y-4">
                      <h3 className="text-lg font-black uppercase">Access Control</h3>
                      <div className="space-y-4">
                         {[
                           { name: 'mfa_enabled', title: 'Multi-Factor Authentication', desc: 'Require staff to use 2FA to log in.', enabled: mfaEnabled },
                           { name: 'session_timeout', title: 'Session Timeout', desc: 'Automatically log out inactive staff after 30 mins.', enabled: sessionTimeout },
                         ].map(setting => (
                           <div key={setting.title} className="flex items-center justify-between p-4 border-2 border-black">
                              <div className="space-y-1">
                                 <p className="font-bold text-sm">{setting.title}</p>
                                 <p className="text-[10px] font-bold text-black/40 uppercase">{setting.desc}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name={setting.name} defaultChecked={setting.enabled} className="sr-only peer" />
                                <div className="w-12 h-6 border-2 border-black bg-white peer-focus:outline-none peer-checked:bg-accent peer-checked:after:translate-x-6 peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-black after:border-2 after:h-4 after:w-4 after:transition-all"></div>
                              </label>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="ai" className="flex-1 p-8 m-0 space-y-8 max-w-3xl">
                <div className="brutal-card bg-black text-white p-8 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-accent border-2 border-black">
                         <Cpu className="w-8 h-8 text-black" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black uppercase tracking-tight">AI Assistance</h3>
                         <p className="text-xs font-bold text-accent uppercase">Powered by Gemini 1.5 Flash</p>
                      </div>
                   </div>
                   <div className="space-y-4 border-t-2 border-white/10 pt-6">
                      <p className="text-sm font-bold text-white/70">Enable AI-powered features for staff to improve efficiency and reduce manual processing.</p>
                      <div className="space-y-4">
                         {[
                           { name: 'ai_categorization', title: 'Request Auto-Categorization', desc: 'Automatically tag and prioritize requests.', enabled: aiCategorization },
                           { name: 'ai_fraud_detection', title: 'Risk & Fraud Detection', desc: 'Flag suspicious transactions or patterns.', enabled: aiFraud },
                           { name: 'ai_smart_quote', title: 'Smart Quote Generation', desc: 'Draft quotes based on historical market data.', enabled: aiQuote },
                         ].map(ai => (
                           <div key={ai.title} className="flex items-center justify-between p-4 border-2 border-white/20 bg-white/5">
                              <div className="space-y-1">
                                 <p className="font-bold text-sm">{ai.title}</p>
                                 <p className="text-[10px] font-bold text-white/40 uppercase">{ai.desc}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name={ai.name} defaultChecked={ai.enabled} className="sr-only peer" />
                                <div className="w-12 h-6 border-2 border-white bg-transparent peer-focus:outline-none peer-checked:bg-accent peer-checked:after:translate-x-6 peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white peer-checked:after:bg-black after:border-white after:border-2 peer-checked:after:border-black after:h-4 after:w-4 after:transition-all"></div>
                              </label>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </TabsContent>
          </Tabs>
        </div>
      </form>
    </div>
  )
}
