import Link from "next/link"
import { HeartPulse, Calendar, Clock, FileText, Globe, Phone, FileSearch, ArrowRight, UserPlus } from "lucide-react"

export default function MedicalAdminDashboard() {
  return (
    <div className="flex-1 p-8 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-foreground/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#8B5CF6] text-white border-2 border-foreground flex items-center justify-center shadow-[4px_4px_0px_var(--color-foreground)]">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Medical Tourism</h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Dashboard Overview</p>
          </div>
        </div>
        <Link href="/medical/requests" className="bg-foreground text-background text-xs font-black uppercase tracking-widest px-6 py-3 border-2 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-foreground transition-colors shadow-[4px_4px_0px_var(--color-foreground)]">
          View All Requests
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: "New Requests", value: "14", color: "#FF90E8" },
          { label: "Hospital Contacted", value: "23", color: "#00E5FF" },
          { label: "Visa Processing", value: "8", color: "#FFC900" },
          { label: "Treatment Completed", value: "156", color: "#00FF66" },
          { label: "Avg. SLA Time", value: "4.2h", color: "#A78BFA" },
          { label: "Conversion Rate", value: "68%", color: "#F87171" },
        ].map((stat, i) => (
          <div key={i} className="bg-card border-2 border-foreground p-4 shadow-[4px_4px_0px_var(--color-foreground)] transition-transform hover:-translate-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{stat.label}</div>
            <div className="text-3xl font-mono font-black" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Actionable Alerts / Pending Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-foreground shadow-[4px_4px_0px_var(--color-foreground)] p-6">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Action Required
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border-2 border-foreground/10 p-4 hover:border-foreground hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase">Waiting Documents</span>
                  </div>
                  <span className="font-mono font-black">12</span>
                </div>
              </div>
              <div className="border-2 border-foreground/10 p-4 hover:border-foreground hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase">Visa Pending</span>
                  </div>
                  <span className="font-mono font-black">5</span>
                </div>
              </div>
              <div className="border-2 border-foreground/10 p-4 hover:border-foreground hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold uppercase">Hospital Reply Pending</span>
                  </div>
                  <span className="font-mono font-black">8</span>
                </div>
              </div>
              <div className="border-2 border-foreground/10 p-4 hover:border-foreground hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase">Today's Calls</span>
                  </div>
                  <span className="font-mono font-black">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Appointments & Follow-ups */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#8B5CF6]/10 border-2 border-[#8B5CF6] shadow-[4px_4px_0px_#8B5CF6] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#8B5CF6] mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Today's Appointments
              </h2>
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="bg-white border-2 border-[#8B5CF6]/30 p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">MED-2026-0010{i}</p>
                      <p className="opacity-60 font-bold uppercase text-[9px]">Apollo Hospitals (Video)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">14:30</p>
                      <p className="opacity-60">Dr. Smith</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-400 shadow-[4px_4px_0px_#FBBF24] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Pending Follow-ups
              </h2>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white border-2 border-amber-200 p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">MED-2026-0008{i}</p>
                      <p className="opacity-60 font-bold uppercase text-[9px]">Awaiting Visa Docs</p>
                    </div>
                    <button className="bg-amber-100 text-amber-700 px-2 py-1 font-bold">Action</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Feed */}
        <div className="space-y-6">
          <div className="bg-card border-2 border-foreground shadow-[4px_4px_0px_var(--color-foreground)] p-6 h-full">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6">Recent Activity</h2>
            
            <div className="space-y-4">
              <div className="border-l-2 border-foreground pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">10 mins ago</p>
                <p className="text-sm font-bold">New Request <Link href="#" className="text-blue-600 underline">MED-2026-00214</Link></p>
                <p className="text-xs opacity-70">Patient requires Cardiology at Narayana Health.</p>
              </div>
              <div className="border-l-2 border-foreground pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">25 mins ago</p>
                <p className="text-sm font-bold flex items-center gap-2"><FileText className="w-3 h-3"/> New Upload</p>
                <p className="text-xs opacity-70">MRI Scan uploaded for MED-2026-00192.</p>
              </div>
              <div className="border-l-2 border-foreground pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">1 hour ago</p>
                <p className="text-sm font-bold">Visa Approved</p>
                <p className="text-xs opacity-70">Visa approved for MED-2026-00140.</p>
              </div>
              <div className="border-l-2 border-foreground pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">2 hours ago</p>
                <p className="text-sm font-bold">Status Update</p>
                <p className="text-xs opacity-70">MED-2026-00100 changed to Hospital Contacted by Sarah.</p>
              </div>
            </div>
            
            <button className="w-full mt-6 bg-muted text-foreground font-black uppercase tracking-widest py-3 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors text-xs flex items-center justify-center gap-2">
              View All Activity <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
