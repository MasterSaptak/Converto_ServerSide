'use client'

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Sidebar } from "./sidebar"

export function MobileSidebar({ role = 'Staff' }: { role?: string }) {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden p-2 border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--color-border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-r-4 border-border h-full bg-card">
        <Sidebar role={role} />
      </SheetContent>
    </Sheet>
  )
}
