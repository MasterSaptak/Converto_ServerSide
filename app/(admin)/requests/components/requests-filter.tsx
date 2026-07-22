'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

export function RequestsFilter({ services, currentService }: { services: any[], currentService: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'all') {
      params.delete('service')
    } else {
      params.set('service', val)
    }
    router.push(`/?${params.toString()}`)
    // Actually it should push to /requests
    router.push(`/requests?${params.toString()}`)
  }

  return (
    <div className="flex gap-4">
      <select 
        className="brutal-input font-bold bg-white cursor-pointer"
        value={currentService}
        onChange={handleServiceChange}
      >
        <option value="all">All Services</option>
        {services.map(s => (
          <option key={s.id} value={s.slug}>{s.name}</option>
        ))}
      </select>
      <button className="brutal-button bg-white flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Filters
      </button>
    </div>
  )
}
