'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Globe, Shield, RefreshCw, Check, X } from 'lucide-react'
import { updateCurrencyRate } from '../actions'
import { toast } from 'react-hot-toast'

interface CurrencyRate {
  id?: string
  target_currency: string
  market_rate: number
  custom_rate: number
}

// Format number utility
const formatRate = (rate: number, currency: string) => {
  if (currency === 'INR') return rate.toFixed(2)
  if (currency === 'CNY') return rate.toFixed(3)
  return rate.toFixed(4)
}

const getFlagEmoji = (currency: string) => {
  switch (currency) {
    case 'INR': return '🟨' // Using colored squares as per mockup
    case 'USD': return '🟩'
    case 'EUR': return '🟦'
    case 'CNY': return '🩷'
    case 'GBP': return '🟪'
    case 'BDT': return '🔴'
    default: return '⬜'
  }
}

const getBgColor = (currency: string) => {
  return 'bg-white'
}

const getCurrencyFlagUrl = (currency: string) => {
  switch (currency) {
    case 'USD': return 'https://flagcdn.com/w320/us.png';
    case 'EUR': return 'https://flagcdn.com/w320/eu.png';
    case 'CNY': return 'https://flagcdn.com/w320/cn.png';
    case 'INR': return 'https://flagcdn.com/w320/in.png';
    case 'GBP': return 'https://flagcdn.com/w320/gb.png';
    case 'BDT': return 'https://flagcdn.com/w320/bd.png';
    default: return '';
  }
};

export function RatesManager({ initialRates }: { initialRates: any[] }) {
  const [baseCurrency, setBaseCurrency] = useState('BDT')
  const [rates, setRates] = useState<CurrencyRate[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Inline editing state
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const availableBases = ['BDT', 'INR', 'USD', 'EUR', 'CNY']

  const fetchLiveRates = useCallback(async (base: string) => {
    setIsRefreshing(true)
    try {
      // 1. Fetch live market rates
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`)
      const data = await res.json()
      
      // 2. Fetch or merge with Converto rates (from props initially, or ideally a Supabase fetch)
      // For now, since it's a client component, we'll merge the API rates with our initialRates.
      // In a real robust setup, we'd fetch from Supabase here too via a Server Action or route handler.
      const currentDbRates = initialRates.filter(r => r.base_currency === base)
      
      const newRates: CurrencyRate[] = ['BDT', 'INR', 'USD', 'EUR', 'CNY'].filter(c => c !== base).map(currency => {
        const dbRate = currentDbRates.find(r => r.target_currency === currency)
        return {
          id: dbRate?.id,
          target_currency: currency,
          market_rate: data.rates[currency] || 0,
          custom_rate: dbRate?.custom_rate || data.rates[currency] || 0
        }
      })
      
      setRates(newRates)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch rates', err)
      toast.error('Failed to refresh live rates')
    } finally {
      setIsRefreshing(false)
    }
  }, [initialRates])

  useEffect(() => {
    fetchLiveRates(baseCurrency)
    
    // Auto refresh every minute
    const interval = setInterval(() => {
      fetchLiveRates(baseCurrency)
    }, 60000)
    
    return () => clearInterval(interval)
  }, [baseCurrency, fetchLiveRates])

  const handleSaveRate = async (targetCurrency: string) => {
    const numValue = parseFloat(editValue)
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Invalid rate')
      return
    }

    setIsSaving(true)
    try {
      await updateCurrencyRate({
        baseCurrency,
        targetCurrency,
        customRate: numValue
      })
      
      // Optimistic update
      setRates(prev => prev.map(r => r.target_currency === targetCurrency ? { ...r, custom_rate: numValue } : r))
      setEditingCurrency(null)
      toast.success('Rate updated successfully')
    } catch (err) {
      toast.error('Failed to update rate')
    } finally {
      setIsSaving(false)
    }
  }

  // Time ago logic
  const secondsAgo = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)

  return (
    <div className="border-4 border-black bg-[#FAF9F6] shadow-[8px_8px_0px_rgba(0,0,0,1)] mb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b-4 border-black gap-4">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <div className="bg-[#FF90E8] p-2 border-2 border-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          Exchange Rates
        </h2>
        
        <div className="flex items-center gap-3">
          <span className="font-black uppercase tracking-widest text-xs">Base:</span>
          <div className="relative">
            <select 
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="appearance-none bg-white border-2 border-black font-black uppercase tracking-widest py-2 pl-4 pr-10 outline-none focus:ring-2 ring-primary cursor-pointer hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              {availableBases.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-black">▼</div>
          </div>
        </div>
      </div>

      {/* Google Live Market Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-black/10">
          <h3 className="font-black uppercase tracking-widest flex items-center gap-2 text-sm opacity-60">
            <Globe className="w-4 h-4" /> Google Live Market
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
              Last Updated<br/>
              {secondsAgo < 5 ? 'Just now' : `${secondsAgo} sec ago`}
            </div>
            <button 
              onClick={() => fetchLiveRates(baseCurrency)}
              disabled={isRefreshing}
              className="p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 active:translate-x-0.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rates.map(rate => {
            const flagUrl = getCurrencyFlagUrl(rate.target_currency);
            return (
              <div key={`market_${rate.target_currency}`} className="bg-white border-2 border-black flex h-[72px] shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform">
                {/* Flag Left Section - Fixed Aspect Ratio */}
                <div className="w-[108px] shrink-0 border-r-2 border-black relative bg-zinc-100">
                  {flagUrl && (
                    <img 
                      src={flagUrl} 
                      alt={`${rate.target_currency} flag`}
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                  )}
                </div>
                {/* Details Right Section */}
                <div className="flex-1 px-3 py-2 flex flex-col justify-center bg-white relative">
                  <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80 mb-1 leading-none">
                    {getFlagEmoji(rate.target_currency)} {rate.target_currency}
                  </div>
                  <div className="font-mono text-lg font-black leading-none">{formatRate(rate.market_rate, rate.target_currency)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Converto Rates Section */}
      <div className="p-6 border-t-2 border-black/10">
        <h3 className="font-black uppercase tracking-widest flex items-center gap-2 text-sm opacity-60 mb-6 pb-2 border-b-2 border-black/10">
          <Shield className="w-4 h-4" /> Converto Rates
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rates.map(rate => {
            const isEditing = editingCurrency === rate.target_currency
            const flagUrl = getCurrencyFlagUrl(rate.target_currency);

            return (
              <div 
                key={`custom_${rate.target_currency}`} 
                onClick={() => {
                  if (!isEditing) {
                    setEditingCurrency(rate.target_currency)
                    setEditValue(rate.custom_rate.toString())
                  }
                }}
                className={`bg-white border-2 border-black flex shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden group ${isEditing ? 'min-h-[100px] flex-col' : 'h-[72px]'} ${!isEditing ? 'cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all' : ''}`}
              >
                {/* Flag Left Section (or Top if editing) */}
                <div className={`${isEditing ? 'w-full h-12 border-b-2' : 'w-[108px] shrink-0 border-r-2'} border-black relative bg-zinc-100`}>
                  {flagUrl && (
                    <img 
                      src={flagUrl} 
                      alt={`${rate.target_currency} flag`}
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                  )}
                </div>
                {/* Details Right Section (or Bottom if editing) */}
                <div className={`flex-1 ${isEditing ? 'p-3 flex flex-col justify-between' : 'px-3 py-2 flex flex-col justify-center'} bg-white relative`}>
                  <div className={`flex items-center justify-between w-full ${!isEditing ? 'mb-1' : ''}`}>
                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80 leading-none">
                      {getFlagEmoji(rate.target_currency)} {rate.target_currency}
                    </div>
                    {!isEditing && (
                      <div className="bg-yellow-400 px-1 py-0.5 border-2 border-black text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] leading-none">
                        Custom
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="number"
                        step="0.0001"
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRate(rate.target_currency)
                          if (e.key === 'Escape') setEditingCurrency(null)
                        }}
                        className="w-full bg-white border-2 border-black font-mono font-black text-lg p-1 outline-none focus:ring-2 ring-black"
                      />
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => handleSaveRate(rate.target_currency)}
                          disabled={isSaving}
                          className="bg-black text-white p-1 hover:bg-emerald-500 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setEditingCurrency(null)}
                          className="bg-black text-white p-1 hover:bg-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-lg font-black leading-none">
                      {formatRate(rate.custom_rate, rate.target_currency)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Difference Section */}
      <div className="p-6 bg-slate-900 text-white border-t-4 border-black">
        <h3 className="font-black uppercase tracking-widest text-sm opacity-60 mb-6 pb-2 border-b-2 border-white/20">
          Difference (Margin)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rates.map(rate => {
            const diff = rate.custom_rate - rate.market_rate
            const isPositive = diff > 0
            
            return (
              <div key={`diff_${rate.target_currency}`} className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {rate.target_currency}
                </div>
                <div className={`font-mono font-black text-xl ${isPositive ? 'text-[#00FF66]' : 'text-[#FF90E8]'}`}>
                  {isPositive ? '+' : ''}{formatRate(diff, rate.target_currency)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
