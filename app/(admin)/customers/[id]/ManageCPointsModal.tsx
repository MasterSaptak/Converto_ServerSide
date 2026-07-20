'use client'

import { useState } from 'react'
import { Loader2, X, Gift } from 'lucide-react'
import { manageCPoints } from './actions'
import { useRouter } from 'next/navigation'

const REWARD_TIERS = [
  { name: 'Wood', minPoints: 0 },
  { name: 'Stone', minPoints: 2500 },
  { name: 'Iron', minPoints: 15000 },
  { name: 'Bronze', minPoints: 30000 },
  { name: 'Silver', minPoints: 50000 },
  { name: 'Gold', minPoints: 75000 },
  { name: 'Platinum', minPoints: 100000 },
  { name: 'Diamond', minPoints: 150000 },
  { name: 'Obsidian', minPoints: 200000 },
  { name: 'Ruby', minPoints: 300000 },
  { name: 'Sapphire', minPoints: 400000 },
  { name: 'Emerald', minPoints: 500000 },
  { name: 'Amethyst', minPoints: 600000 },
  { name: 'Titanium', minPoints: 700000 },
  { name: 'Vibranium', minPoints: 800000 },
  { name: 'Antimatter', minPoints: 900000 },
  { name: 'Black Card', minPoints: 1000000 },
];

function getDynamicTier(points: number) {
  let currentTier = REWARD_TIERS[0].name;
  for (let i = 0; i < REWARD_TIERS.length; i++) {
    if (points >= REWARD_TIERS[i].minPoints) {
      currentTier = REWARD_TIERS[i].name;
    } else {
      break;
    }
  }
  return currentTier;
}

export function ManageCPointsModal({ customerId, currentPoints }: { customerId: string, currentPoints: number }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [newValue, setNewValue] = useState(currentPoints)
  const [description, setDescription] = useState('')
  const [resetLifetime, setResetLifetime] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const difference = newValue - currentPoints
  const type = difference >= 0 ? 'add' : 'remove'
  const amountToChange = Math.abs(difference)

  // Use a fixed max of 1,000,000 (10 Lakh) or 2x current points. 
  // DO NOT scale dynamically with newValue to prevent infinite drag growth.
  const sliderMax = Math.max(1000000, currentPoints * 2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (amountToChange === 0 && !resetLifetime) {
      setError('Please change the points value or select an action')
      return
    }

    if (type === 'remove' && amountToChange > currentPoints) {
      setError('Cannot deduct more points than the user has.')
      return
    }
    
    setLoading(true)
    try {
      const result = await manageCPoints(customerId, type, amountToChange, description, resetLifetime)
      
      if (result.success) {
        setIsOpen(false)
        setDescription('')
        router.refresh() // Force Next.js to immediately refetch the page data
      } else {
        setError(result.error || 'Failed to update C-Points')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-black bg-black text-white hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase font-black text-xs tracking-widest shrink-0"
      >
        <Gift className="w-4 h-4" />
        Manage Points
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 p-6 relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 hover:rotate-90 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">Manage C-Points</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border-4 border-red-500 text-red-700 text-sm font-bold uppercase tracking-widest">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Status Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-black pb-4 gap-4">
                <div className="w-full sm:w-auto">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Current Points</div>
                  <div className="font-mono text-xl sm:text-2xl font-black truncate max-w-full flex items-center gap-2">
                    {currentPoints.toLocaleString()} 
                    <span className="font-sans text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 border-2 border-black tracking-wider leading-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{getDynamicTier(currentPoints)}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto text-left sm:text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">New Total</div>
                  <div className="font-mono text-2xl sm:text-4xl font-black text-primary truncate max-w-full flex items-center sm:justify-end gap-2">
                    {newValue.toLocaleString()} 
                    <span className="font-sans text-xs font-black uppercase bg-white text-black px-2 py-1 border-2 border-black tracking-wider leading-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{getDynamicTier(newValue)}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Difference Badge */}
              {difference !== 0 && (
                <div className={`p-2 font-mono font-black text-center text-sm uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  difference > 0 ? 'bg-emerald-400 text-black' : 'bg-red-400 text-black'
                }`}>
                  {difference > 0 ? '+' : ''}{difference.toLocaleString()} C-Points
                </div>
              )}

              {/* Interactive Progress Bar / Slider */}
              <div className="pt-4 pb-2">
                <div className="relative w-full h-12 bg-secondary border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group">
                  {/* Fill Bar */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-out border-r-4 border-black"
                    style={{ width: `${Math.min(100, Math.max(0, (newValue / sliderMax) * 100))}%` }}
                  />
                  
                  {/* Marker for Current Points */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-black z-10 opacity-50"
                    style={{ left: `${(currentPoints / sliderMax) * 100}%` }}
                  >
                    <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-black uppercase">Current</div>
                  </div>

                  {/* The actual slider input */}
                  <input 
                    type="range" 
                    min={0} 
                    max={sliderMax} 
                    value={newValue}
                    onChange={(e) => setNewValue(parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase tracking-widest">
                    Manual Entry <span className="opacity-60">(Type a lower number to deduct)</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => {
                      if (window.confirm("WARNING: Are you sure you want to completely wipe all points to ZERO?")) {
                        setNewValue(0)
                        setResetLifetime(true)
                        setDescription("Points cleared to zero")
                      }
                    }}
                    className="bg-red-500 text-black border-2 border-black px-2 py-1 text-[10px] font-black uppercase hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    Clear to Zero
                  </button>
                </div>
                <input 
                  type="number" 
                  value={newValue}
                  onChange={(e) => {
                    // Clamp manual entry to prevent completely breaking the DB/UI limits
                    const val = parseInt(e.target.value) || 0;
                    setNewValue(Math.min(val, 999999999));
                  }}
                  className="w-full p-3 border-4 border-black font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  min="0"
                  max="999999999"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest">Reason / Description (Optional)</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Apology bonus, Refund"
                  className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>

              <div className="flex items-center gap-3 p-3 border-4 border-black bg-red-50">
                <input 
                  type="checkbox" 
                  id="resetLifetime"
                  checked={resetLifetime}
                  onChange={(e) => setResetLifetime(e.target.checked)}
                  className="w-5 h-5 accent-red-600 border-2 border-black"
                />
                <label htmlFor="resetLifetime" className="text-xs font-black uppercase tracking-widest text-red-600 cursor-pointer">
                  Also Wipe Lifetime Points to 0
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full p-4 bg-primary border-4 border-black font-black text-lg uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
