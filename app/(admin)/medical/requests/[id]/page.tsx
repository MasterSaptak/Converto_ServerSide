"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Edit, Clock, MessageSquare, FileText, User, FileCheck, 
  MapPin, HeartPulse, ShieldAlert, Phone, Send, Plus, CheckCircle2,
  Calendar, AlertCircle
} from "lucide-react"

// Mock components for Tabs

function DetailsTab() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
        <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2 border-b-2 border-foreground pb-2">
          Request Journey
        </h3>
        
        <div className="relative before:absolute before:inset-0 before:ml-6 before:translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-foreground before:via-foreground/20 before:to-transparent space-y-8">
          
          {/* Phase 1: Customer Information */}
          <div className="relative flex items-start gap-6">
            <div className="w-12 h-12 rounded-full border-2 border-foreground bg-primary flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <User className="w-5 h-5 text-background" />
            </div>
            <div className="flex-1 bg-white p-6 border-2 border-foreground shadow-[2px_2px_0px_var(--color-foreground)]">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-black uppercase tracking-widest text-xs">1. Customer Profile</h4>
                <Link href="/customers/123" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View Full Profile &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="opacity-60 font-bold uppercase text-[10px]">Full Name</div>
                <div className="font-bold">Rahul Sharma</div>
                <div className="opacity-60 font-bold uppercase text-[10px]">DOB / Age</div>
                <div className="font-bold">12 May 1985 (41y)</div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Passport No.</div>
                <div className="font-bold font-mono">BGD12345678</div>
              </div>
            </div>
          </div>

          {/* Phase 2: Medical History */}
          <div className="relative flex items-start gap-6">
            <div className="w-12 h-12 rounded-full border-2 border-foreground bg-white flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <HeartPulse className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 bg-white p-6 border-2 border-foreground shadow-[2px_2px_0px_var(--color-foreground)]">
              <h4 className="font-black uppercase tracking-widest text-xs mb-4 text-red-600">2. Medical History & Preferences</h4>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="opacity-60 font-bold uppercase text-[10px]">Condition</div>
                <div className="font-bold">Coronary Artery Disease</div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Hospital Pref.</div>
                <div className="font-bold">Apollo Hospitals, Chennai</div>
                <div className="col-span-2 mt-2">
                  <div className="opacity-60 font-bold uppercase text-[10px] mb-1">Symptoms</div>
                  <div className="text-xs bg-muted p-3 border-2 border-foreground font-bold">Chest pain, shortness of breath on exertion for 3 months.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3: Appointment & Travel */}
          <div className="relative flex items-start gap-6">
            <div className="w-12 h-12 rounded-full border-2 border-foreground bg-white flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <MapPin className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 bg-white p-6 border-2 border-foreground shadow-[2px_2px_0px_var(--color-foreground)] opacity-50 grayscale">
              <h4 className="font-black uppercase tracking-widest text-xs mb-4 text-blue-600">3. Travel & Logistics (Pending)</h4>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="opacity-60 font-bold uppercase text-[10px]">Expected Travel</div>
                <div className="font-bold">01 Aug 2026</div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Visa Status</div>
                <div className="font-bold text-amber-600">Processing</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function TimelineTab() {
  const [newStatus, setNewStatus] = useState("Hospital Contacted")
  
  return (
    <div className="grid md:grid-cols-3 gap-8 animate-in fade-in">
      <div className="md:col-span-2 bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
        <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2">Audit Trail</h3>
        
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-foreground before:via-foreground/20 before:to-transparent">
          
          <div className="relative flex items-start gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-foreground bg-primary flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <Plus className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1 bg-muted p-4 border-2 border-foreground shadow-[2px_2px_0px_var(--color-foreground)]">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-black uppercase tracking-widest text-xs">Status Changed: Hospital Contacted</h4>
                <span className="text-[10px] font-bold opacity-50">21 Jul 2026, 14:30</span>
              </div>
              <p className="text-xs font-bold opacity-80">Sarah M. changed status and added note: "Sent patient reports to Apollo Chennai Cardiology dept."</p>
            </div>
          </div>

          <div className="relative flex items-start gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-foreground bg-white flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-white p-4 border-2 border-foreground/20">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-black uppercase tracking-widest text-xs">Documents Verified</h4>
                <span className="text-[10px] font-bold opacity-50">21 Jul 2026, 12:15</span>
              </div>
              <p className="text-xs font-bold opacity-80">John D. verified Passport and Medical Reports.</p>
            </div>
          </div>
          
          <div className="relative flex items-start gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-foreground bg-white flex items-center justify-center shrink-0 z-10 shadow-[2px_2px_0px_var(--color-foreground)]">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-white p-4 border-2 border-foreground/20">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-black uppercase tracking-widest text-xs">Request Created</h4>
                <span className="text-[10px] font-bold opacity-50">21 Jul 2026, 11:45</span>
              </div>
              <p className="text-xs font-bold opacity-80">System: Request MED-2026-000154 created by user.</p>
            </div>
          </div>

        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#8B5CF6]/10 border-2 border-[#8B5CF6] p-6 shadow-[4px_4px_0px_#8B5CF6]">
          <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-[#8B5CF6]">Update Status</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">New Status</label>
              <select 
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full bg-white p-3 border-2 border-foreground font-bold outline-none text-sm mt-1"
              >
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="Hospital Contacted">Hospital Contacted</option>
                <option value="Hospital Responded">Hospital Responded</option>
                <option value="Treatment Plan Finalized">Treatment Plan Finalized</option>
                <option value="Appointment Scheduled">Appointment Scheduled</option>
                <option value="Visa Pending">Visa Pending</option>
                <option value="Visa Approved">Visa Approved</option>
                <option value="Travel Arranged">Travel Arranged</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Internal Note (Required)</label>
              <textarea className="w-full bg-white p-3 border-2 border-foreground font-bold outline-none text-sm mt-1" rows={3} placeholder="Why is the status changing?"></textarea>
            </div>
            <button className="w-full bg-foreground text-background font-black uppercase tracking-widest py-3 border-2 border-foreground hover:bg-background hover:text-foreground transition-colors text-xs flex justify-center gap-2">
              Update Status <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentsTab() {
  return (
    <div className="grid md:grid-cols-2 gap-6 animate-in fade-in">
      <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
        <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center justify-between border-b-2 border-foreground pb-2">
          <span>Customer Documents</span>
          <button className="text-xs bg-primary text-primary-foreground px-3 py-1 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors">+ Request Doc</button>
        </h3>
        
        <div className="space-y-4">
          <div className="border-2 border-foreground p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-bold text-sm">Passport_Front.pdf</p>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Verified • 2.4 MB</p>
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 bg-foreground text-background text-[10px] uppercase font-black px-2 py-1 transition-opacity">View</button>
          </div>

          <div className="border-2 border-foreground p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-bold text-sm">MRI_Scan_Report_Jul.pdf</p>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Verified • 5.1 MB</p>
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 bg-foreground text-background text-[10px] uppercase font-black px-2 py-1 transition-opacity">View</button>
          </div>
          
          <div className="border-2 border-amber-500 bg-amber-50 p-4 flex items-center justify-between hover:bg-amber-100 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-bold text-sm text-amber-900">Visa_Application_Form.pdf</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-amber-700">Pending Upload</p>
              </div>
            </div>
            <button className="bg-amber-500 text-amber-950 text-[10px] uppercase font-black px-2 py-1 border-2 border-transparent hover:border-amber-700 transition-colors">Remind</button>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
        <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center justify-between border-b-2 border-foreground pb-2">
          <span>Hospital/Visa Documents</span>
          <button className="text-xs bg-primary text-primary-foreground px-3 py-1 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors">+ Upload Doc</button>
        </h3>
        
        <div className="border-2 border-foreground border-dashed p-10 text-center text-sm font-bold opacity-60 uppercase tracking-widest">
          No hospital documents uploaded yet.
          <br/>
          (e.g., Treatment Plan, Appointment Letter, VIL)
        </div>
      </div>
    </div>
  )
}

function CommunicationTab() {
  return (
    <div className="grid md:grid-cols-3 gap-6 animate-in fade-in">
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
          <h4 className="font-black uppercase tracking-widest text-xs mb-4 border-b-2 border-foreground pb-2">Quick Actions</h4>
          <div className="space-y-4">
            <button className="w-full bg-[#25D366] text-white p-4 font-black uppercase tracking-widest border-2 border-foreground hover:brightness-110 transition-all flex items-center gap-3">
              <MessageSquare className="w-5 h-5" /> WhatsApp Chat
            </button>
            <button className="w-full bg-blue-600 text-white p-4 font-black uppercase tracking-widest border-2 border-foreground hover:brightness-110 transition-all flex items-center gap-3">
              <Send className="w-5 h-5" /> Send Email
            </button>
            <button className="w-full bg-amber-500 text-black p-4 font-black uppercase tracking-widest border-2 border-foreground hover:brightness-110 transition-all flex items-center gap-3">
              <Phone className="w-5 h-5" /> Log Call
            </button>
          </div>
        </div>
        
        <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
          <h4 className="font-black uppercase tracking-widest text-xs mb-4 border-b-2 border-foreground pb-2">Status & Follow-up</h4>
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Last Contact</span>
              <span className="font-bold text-sm">Today, 14:45</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Next Follow-up</span>
              <span className="font-bold text-sm text-red-600">Tomorrow, 10:00 (Overdue)</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Conversation Notes</span>
              <p className="text-xs font-bold opacity-80 mt-1">Patient is anxious about visa processing time. Needs regular updates.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="md:col-span-2 bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)] flex flex-col h-[600px]">
        <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center justify-between">
          <span>Communication History</span>
          <span className="text-[10px] bg-muted px-2 py-1">Consolidated View</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          
          <div className="bg-[#25D366]/10 border-2 border-[#25D366] p-4 ml-8 rounded-tl-xl rounded-bl-xl rounded-br-xl relative">
            <MessageSquare className="w-4 h-4 text-[#25D366] absolute -left-6 top-4" />
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-xs uppercase text-[#25D366]">Sent via WhatsApp</span>
              <span className="text-[10px] font-bold opacity-60">Today, 14:45</span>
            </div>
            <p className="text-sm font-bold opacity-80">Hello Rahul, we have sent your reports to Apollo Hospitals. We will update you once they share the treatment plan.</p>
            
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white px-2 py-1 border border-foreground/20">
                <FileText className="w-3 h-3" /> MRI_Scan_Report_Jul.pdf
              </span>
            </div>
          </div>

          <div className="bg-amber-100 border-2 border-amber-500 p-4 mr-8 rounded-tr-xl rounded-br-xl rounded-bl-xl relative">
            <Phone className="w-4 h-4 text-amber-600 absolute -right-6 top-4" />
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-xs uppercase text-amber-700">Incoming Call Logged</span>
              <span className="text-[10px] font-bold opacity-60">Today, 14:40</span>
            </div>
            <p className="text-sm font-bold opacity-80">Patient called to check status. Informed that reports are being sent.</p>
            <p className="text-[10px] font-black uppercase mt-2 opacity-50">Logged by Sarah M.</p>
          </div>

        </div>
      </div>
    </div>
  )
}


export default function RequestDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('details')
  
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'timeline', label: 'Timeline & Status' },
    { id: 'documents', label: 'Documents' },
    { id: 'communication', label: 'Communication' },
    { id: 'tasks', label: 'Tasks' },
  ]

  return (
    <div className="flex-1 p-8">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/medical/requests" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary/20 text-primary px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-primary/20">Urgent</span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-blue-200">Hospital Contacted</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-heading uppercase leading-[0.9] tracking-tight">{params.id}</h1>
            <p className="text-sm font-bold uppercase tracking-widest opacity-60 mt-2">Rahul Sharma • Cardiology</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            
            {/* Request Health Indicator */}
            <div className="bg-amber-100 border-2 border-amber-500 p-3 flex items-center gap-3 shadow-[4px_4px_0px_var(--color-amber-500)]">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-amber-900 opacity-80">Request Health</span>
                <span className="font-bold text-sm text-amber-950">Waiting Hospital</span>
              </div>
            </div>

            {/* SLA Timer */}
            <div className="bg-red-100 border-2 border-red-500 p-3 flex items-center gap-3 shadow-[4px_4px_0px_var(--color-red-500)]">
              <Clock className="w-5 h-5 text-red-600" />
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-red-900 opacity-80">SLA Timer</span>
                <span className="font-bold text-sm text-red-950">04:22:15 Left</span>
              </div>
            </div>

            <div className="bg-card border-2 border-foreground p-3 flex flex-col justify-center items-end">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Case Owner</span>
              <span className="font-bold text-sm">Sarah M.</span>
            </div>
            <button className="bg-muted border-2 border-foreground p-3 hover:bg-foreground hover:text-background transition-colors flex items-center justify-center">
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-foreground mb-8 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-black uppercase tracking-widest text-xs whitespace-nowrap transition-colors border-b-4 ${
              activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-foreground/50 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pb-20">
        {activeTab === 'details' && <DetailsTab />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'communication' && <CommunicationTab />}
        {activeTab === 'tasks' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
               <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center gap-2">
                 <FileCheck className="w-4 h-4" /> Internal Checklist
               </h3>
               
               <div className="space-y-4">
                 {[
                   { label: "Passport Verified", done: true },
                   { label: "Medical Reports Verified", done: true },
                   { label: "Send to Hospital", done: true },
                   { label: "Receive Treatment Plan", done: false },
                   { label: "Patient Approves Plan", done: false },
                   { label: "Visa Invitation Letter Requested", done: false },
                 ].map((item, idx) => (
                   <label key={idx} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-muted transition-colors">
                     <div className={`w-5 h-5 flex items-center justify-center border-2 border-foreground ${item.done ? 'bg-primary' : 'bg-white'}`}>
                       {item.done && <CheckCircle2 className="w-4 h-4 text-background" />}
                     </div>
                     <span className={`text-sm font-bold uppercase tracking-widest ${item.done ? 'line-through opacity-50' : ''}`}>
                       {item.label}
                     </span>
                   </label>
                 ))}
               </div>
            </div>

            <div className="bg-white border-2 border-foreground p-8 text-center shadow-[4px_4px_0px_var(--color-foreground)] h-fit">
               <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
               <h3 className="font-black uppercase tracking-widest text-lg">Custom Tasks & Follow-ups</h3>
               <p className="font-bold opacity-60 mt-2">Create reminders for yourself or assign tasks to support staff.</p>
               <button className="mt-6 bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 py-3 border-2 border-transparent hover:border-foreground hover:bg-background hover:text-foreground transition-colors">
                 + Create Task
               </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
