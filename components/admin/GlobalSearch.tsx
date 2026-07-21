'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, FileText, User, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Mock results
  const results = [
    { id: '1', title: 'MED-2026-000154', subtitle: 'Medical Request - Rahul Sharma', type: 'request', icon: <FileText className="w-4 h-4 text-[#8B5CF6]" /> },
    { id: '2', title: 'Rahul Sharma', subtitle: 'Patient Profile • BGD12345678', type: 'user', icon: <User className="w-4 h-4 text-emerald-500" /> },
    { id: '3', title: 'EXC-2026-0044', subtitle: 'Currency Exchange - Completed', type: 'transaction', icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
  ]

  const filtered = query ? results.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.subtitle.toLowerCase().includes(query.toLowerCase())) : []

  const handleSelect = (id: string, type: string) => {
    setIsOpen(false)
    setQuery('')
    if (type === 'request') {
       router.push('/medical/requests/MED-2026-000154')
    } else if (type === 'user') {
       router.push('/patients/1')
    }
  }

  return (
    <div className="relative max-w-md w-full" ref={dropdownRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input 
        type="text" 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search requests (MED-...), users, passports..."
        className="w-full pl-10 pr-4 py-2 border-2 border-border font-bold focus:outline-none focus:bg-accent focus:text-accent-foreground transition-all placeholder:text-muted-foreground bg-transparent text-foreground"
      />
      
      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--color-border)] z-50 max-h-[400px] overflow-y-auto">
          {filtered.length > 0 ? (
            <div className="p-2 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-50 px-2 pt-2">Search Results</div>
              {filtered.map(res => (
                <div 
                  key={res.id} 
                  onClick={() => handleSelect(res.id, res.type)}
                  className="flex items-center gap-3 p-3 hover:bg-accent border-2 border-transparent hover:border-border cursor-pointer transition-colors"
                >
                  <div className="shrink-0">{res.icon}</div>
                  <div>
                    <h4 className="text-sm font-black uppercase leading-tight">{res.title}</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">{res.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm font-bold uppercase tracking-widest opacity-50">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
