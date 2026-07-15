'use client'

import * as React from 'react'
import { addDays, format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  onRangeChange?: (range: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  onRangeChange,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2026, 6, 1),
    to: addDays(new Date(2026, 6, 1), 20),
  })

  React.useEffect(() => {
    onRangeChange?.(date)
  }, [date, onRangeChange])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger
          className={cn(
            'brutal-button bg-white flex items-center justify-start text-left font-bold min-w-[280px]',
            !date && 'text-black/50'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'LLL dd, y')} -{' '}
                {format(date.to, 'LLL dd, y')}
              </>
            ) : (
              format(date.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" 
          align="end"
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            className="rounded-none bg-white p-3 font-bold"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
