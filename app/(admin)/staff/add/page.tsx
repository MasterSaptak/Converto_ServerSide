import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AddStaffForm } from './add-staff-form'

export default async function AddStaffPage() {
  return (
    <div className="space-y-6 max-w-[800px] mx-auto p-4 sm:p-8">
      <Link href="/staff" className="text-sm font-bold uppercase hover:underline flex items-center gap-2 mb-4 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </Link>
      <AddStaffForm />
    </div>
  )
}
