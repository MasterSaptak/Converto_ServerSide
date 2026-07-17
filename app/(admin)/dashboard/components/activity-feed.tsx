'use client'

import { Activity } from 'lucide-react'

export function DashboardActivityFeed() {
  return (
    <div className="brutal-card-static p-4 space-y-3">
      <div className="flex items-center justify-between border-b-4 border-border pb-3">
        <h3 className="font-black text-base uppercase tracking-tight">System Activity</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-border"></div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-6 opacity-50">
        <Activity className="w-8 h-8 mb-2" />
        <p className="text-xs font-black uppercase tracking-widest text-center">No recent events</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-1 text-center">Real-time events will appear here</p>
      </div>
    </div>
  )
}
