"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, Plus, ChevronRight, FileText } from "lucide-react"

// Mock data
const mockRequests = [
  { id: "MED-2026-000154", patient: "Rahul Sharma", country: "Bangladesh", hospital: "Apollo Hospitals", status: "Hospital Contacted", priority: "Urgent", date: "2026-07-21", executive: "Sarah M." },
  { id: "MED-2026-000155", patient: "Aisha Khan", country: "Pakistan", hospital: "Sankara Nethralaya", status: "Waiting For Documents", priority: "Routine", date: "2026-07-21", executive: "John D." },
  { id: "MED-2026-000156", patient: "Michael O.", country: "Nigeria", hospital: "AIIMS", status: "Appointment Scheduled", priority: "Priority", date: "2026-07-20", executive: "Sarah M." },
  { id: "MED-2026-000157", patient: "Elena S.", country: "Russia", hospital: "Pending", status: "Under Review", priority: "Routine", date: "2026-07-20", executive: "Unassigned" },
  { id: "MED-2026-000158", patient: "David W.", country: "UK", hospital: "Medica", status: "Treatment Completed", priority: "Routine", date: "2026-07-19", executive: "John D." },
]

export default function MedicalRequestsList() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="flex-1 p-8 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-foreground/10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Medical Requests</h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-60">Manage patient bookings</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-muted text-foreground text-xs font-black uppercase tracking-widest px-4 py-3 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/medical/requests/new" className="bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest px-4 py-3 border-2 border-transparent hover:border-foreground hover:bg-background hover:text-foreground transition-colors shadow-[4px_4px_0px_var(--color-foreground)] flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </Link>
        </div>
      </div>

      <div className="bg-card border-2 border-foreground shadow-[8px_8px_0px_var(--color-foreground)]">
        
        {/* Filters and Search */}
        <div className="p-4 border-b-2 border-foreground bg-muted flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input 
              type="text" 
              placeholder="Search by Name, Passport, Request ID, WhatsApp..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-foreground font-bold outline-none focus:ring-2 ring-primary text-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select className="border-2 border-foreground px-3 py-3 font-bold text-xs uppercase outline-none cursor-pointer">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Hospital Contacted">Hospital Contacted</option>
            </select>
            <select className="border-2 border-foreground px-3 py-3 font-bold text-xs uppercase outline-none cursor-pointer">
              <option value="">All Priorities</option>
              <option value="Routine">Routine</option>
              <option value="Priority">Priority</option>
              <option value="Urgent">Urgent</option>
              <option value="Emergency">Emergency</option>
            </select>
            <button className="bg-foreground text-background px-4 py-3 border-2 border-foreground flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-primary transition-colors">
              <Filter className="w-4 h-4" /> More Filters
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 border-b-2 border-foreground text-[10px] font-black uppercase tracking-widest opacity-70">
                <th className="p-4 whitespace-nowrap">Request ID</th>
                <th className="p-4 whitespace-nowrap">Patient</th>
                <th className="p-4 whitespace-nowrap">Hospital</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap">Priority</th>
                <th className="p-4 whitespace-nowrap">Executive</th>
                <th className="p-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockRequests.map((req, i) => (
                <tr key={i} className="border-b-2 border-foreground/10 hover:bg-muted/50 transition-colors group">
                  <td className="p-4 font-mono font-black text-sm whitespace-nowrap">{req.id}</td>
                  <td className="p-4">
                    <div className="font-bold text-sm whitespace-nowrap">{req.patient}</div>
                    <div className="text-[10px] uppercase opacity-60 font-bold tracking-widest">{req.country}</div>
                  </td>
                  <td className="p-4 font-bold text-sm whitespace-nowrap">{req.hospital}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="bg-zinc-200 border-2 border-foreground/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-transparent ${
                      req.priority === 'Urgent' ? 'bg-red-100 text-red-700 border-red-200' :
                      req.priority === 'Priority' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-bold opacity-80 whitespace-nowrap">{req.executive}</td>
                  <td className="p-4 text-right">
                    <Link href={`/medical/requests/${req.id}`} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-foreground text-background px-3 py-2 border-2 border-foreground hover:bg-background hover:text-foreground transition-colors group-hover:shadow-[2px_2px_0px_var(--color-foreground)]">
                      Manage <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards with Quick Actions */}
        <div className="md:hidden flex flex-col">
          {mockRequests.map((req, i) => (
            <div key={i} className="border-b-2 border-foreground p-4 bg-white space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono font-black text-sm">{req.id}</div>
                  <div className="font-bold text-lg leading-tight mt-1">{req.patient}</div>
                  <div className="text-[10px] uppercase opacity-60 font-bold tracking-widest">{req.country}</div>
                </div>
                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-transparent ${
                  req.priority === 'Urgent' ? 'bg-red-100 text-red-700 border-red-200' :
                  req.priority === 'Priority' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {req.priority}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted p-2 border-2 border-foreground/10">
                  <span className="block text-[9px] font-black uppercase opacity-60">Status</span>
                  <span className="font-bold">{req.status}</span>
                </div>
                <div className="bg-muted p-2 border-2 border-foreground/10">
                  <span className="block text-[9px] font-black uppercase opacity-60">Hospital</span>
                  <span className="font-bold">{req.hospital}</span>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-2">
                <button className="bg-[#25D366]/10 text-[#25D366] border-2 border-[#25D366] py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-colors">WhatsApp</button>
                <button className="bg-blue-50 text-blue-600 border-2 border-blue-600 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-colors">Call</button>
                <Link href={`/medical/requests/${req.id}`} className="bg-foreground text-background border-2 border-foreground py-2 text-[10px] font-black uppercase tracking-widest text-center hover:bg-background hover:text-foreground transition-colors">Manage</Link>
                
                <button className="bg-amber-50 text-amber-600 border-2 border-amber-600 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-colors">Status</button>
                <button className="bg-purple-50 text-purple-600 border-2 border-purple-600 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-colors">Docs</button>
                <button className="bg-zinc-100 text-zinc-700 border-2 border-zinc-400 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-colors">Notes</button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t-2 border-foreground flex justify-between items-center text-xs font-bold uppercase">
          <span className="opacity-60">Showing 1 to 5 of 124 requests</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border-2 border-foreground/20 hover:border-foreground disabled:opacity-30">Prev</button>
            <button className="px-3 py-1 border-2 border-foreground/20 hover:border-foreground">Next</button>
          </div>
        </div>

      </div>
    </div>
  )
}
