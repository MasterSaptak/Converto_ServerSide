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

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">System Settings</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Configure Global Operations and ERP Behavior</p>
        </div>
        <button className="brutal-button flex items-center gap-2">
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
                      <input type="text" defaultValue="Converto Global Ltd" className="brutal-input w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-black/40 tracking-widest">Operating Region</label>
                      <select className="brutal-input w-full font-bold">
                        <option>Global (Multi-region)</option>
                        <option>Africa (Nigeria Focus)</option>
                        <option>Europe</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase">Currency Settings</h3>
                  <div className="p-4 border-2 border-black bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="font-bold">Base Currency</span>
                       <Badge variant="outline" className="border-2 border-black font-black uppercase bg-accent">USD</Badge>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-black/40">Supported Currencies</label>
                       <div className="flex flex-wrap gap-2">
                          {['USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'KES'].map(c => (
                            <span key={c} className="px-2 py-1 border-2 border-black font-bold text-xs bg-white">{c}</span>
                          ))}
                          <button className="px-2 py-1 border-2 border-black font-bold text-xs bg-accent">+</button>
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
                         { title: 'Multi-Factor Authentication', desc: 'Require staff to use 2FA to log in.', enabled: true },
                         { title: 'Session Timeout', desc: 'Automatically log out inactive staff after 30 mins.', enabled: true },
                         { title: 'IP Whitelisting', desc: 'Restrict admin access to specific IP ranges.', enabled: false },
                       ].map(setting => (
                         <div key={setting.title} className="flex items-center justify-between p-4 border-2 border-black">
                            <div className="space-y-1">
                               <p className="font-bold text-sm">{setting.title}</p>
                               <p className="text-[10px] font-bold text-black/40 uppercase">{setting.desc}</p>
                            </div>
                            <div className={cn("w-12 h-6 border-2 border-black p-0.5 transition-colors cursor-pointer", setting.enabled ? "bg-accent" : "bg-white")}>
                               <div className={cn("w-4 h-4 border-2 border-black transition-transform", setting.enabled ? "translate-x-6 bg-black" : "bg-black/10")}></div>
                            </div>
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
                         { title: 'Request Auto-Categorization', desc: 'Automatically tag and prioritize requests.' },
                         { title: 'Risk & Fraud Detection', desc: 'Flag suspicious transactions or patterns.' },
                         { title: 'Smart Quote Generation', desc: 'Draft quotes based on historical market data.' },
                       ].map(ai => (
                         <div key={ai.title} className="flex items-center justify-between p-4 border-2 border-white/20 bg-white/5">
                            <div className="space-y-1">
                               <p className="font-bold text-sm">{ai.title}</p>
                               <p className="text-[10px] font-bold text-white/40 uppercase">{ai.desc}</p>
                            </div>
                            <button className="px-4 py-1 bg-accent text-black font-black uppercase text-[10px] border-2 border-white">Enabled</button>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
