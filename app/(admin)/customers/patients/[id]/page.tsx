import Link from "next/link"
import { ArrowLeft, User, MapPin, Phone, Mail, FileText, Activity, ShieldCheck, HeartPulse } from "lucide-react"

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex-1 p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/medical" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-foreground text-background flex items-center justify-center border-4 border-foreground shadow-[4px_4px_0px_var(--color-foreground)]">
              <User className="w-12 h-12" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-emerald-200">Verified Patient</span>
                <span className="font-mono text-xs font-bold bg-muted px-2 py-1">ID: PAT-2026-00{id}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-heading uppercase leading-[0.9] tracking-tight">Rahul Sharma</h1>
              <p className="text-sm font-bold uppercase tracking-widest opacity-60 mt-2">Joined 12 Mar 2026</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 py-3 border-2 border-transparent hover:border-foreground hover:bg-background hover:text-foreground transition-colors shadow-[4px_4px_0px_var(--color-foreground)]">
              + New Request
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column - Details */}
        <div className="space-y-6">
          
          <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Details
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">DOB / Age</div>
                <div className="font-bold">12 May 1985 (41y)</div>
              </div>
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Gender</div>
                <div className="font-bold">Male</div>
              </div>
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Nationality</div>
                <div className="font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Bangladesh
                </div>
              </div>
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Passport No.</div>
                <div className="font-bold font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> BGD12345678
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Contact Information
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Phone (WhatsApp)</div>
                <div className="font-bold font-mono">+880 1711 234567</div>
              </div>
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Email</div>
                <div className="font-bold">rahul.sharma@example.com</div>
              </div>
              <div>
                <div className="opacity-60 font-bold uppercase text-[10px]">Emergency Contact</div>
                <div className="font-bold">Anita Sharma (Wife)</div>
                <div className="font-bold font-mono text-xs mt-1">+880 1711 765432</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - History & Documents */}
        <div className="md:col-span-2 space-y-8">
          
          <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Service History</span>
            </h3>
            
            <div className="space-y-4">
              <Link href="/medical/requests/MED-2026-000154" className="block border-2 border-foreground p-4 hover:bg-muted transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 flex items-center justify-center border-2 border-red-200 text-red-600">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm group-hover:underline">MED-2026-000154</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Cardiology • Apollo Hospitals</p>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest px-2 py-1">Hospital Contacted</span>
                </div>
                <p className="text-xs font-bold opacity-80 mt-2">Active request for Coronary Artery Disease treatment.</p>
              </Link>
            </div>
          </div>

          <div className="bg-white border-2 border-foreground p-6 shadow-[4px_4px_0px_var(--color-foreground)]">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-foreground pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Patient Documents Vault</span>
              <button className="text-xs bg-muted border-2 border-foreground px-3 py-1 font-bold uppercase hover:bg-foreground hover:text-background transition-colors">Upload</button>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border-2 border-foreground p-3 flex items-center justify-between hover:bg-muted cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-bold text-xs uppercase">Passport_Front.pdf</p>
                    <p className="text-[9px] uppercase font-black opacity-60">Uploaded 12 Mar 2026</p>
                  </div>
                </div>
              </div>
              <div className="border-2 border-foreground p-3 flex items-center justify-between hover:bg-muted cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-bold text-xs uppercase">MRI_Scan_Report.pdf</p>
                    <p className="text-[9px] uppercase font-black opacity-60">Uploaded 21 Jul 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
