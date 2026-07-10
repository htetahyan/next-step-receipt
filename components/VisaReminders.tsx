import { createClient } from '@/utils/supabase/server'
import { addDays, startOfDay, differenceInDays } from 'date-fns'
import { AlertCircle, Clock, PlaneTakeoff, Bus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function VisaReminders() {
  const supabase = await createClient()
  const today = startOfDay(new Date())
  const in7Days = addDays(today, 7)

  const { data: services, error } = await supabase
    .from('customer_services')
    .select('*, customer:customers(*)')
    .neq('status', 'Case Closed')
    .neq('status', 'Cancelled')
    .neq('status', 'Refunded')
    .neq('status', 'File Closed')

  if (error || !services) {
    return null
  }

  const reminders = services.filter((s: any) => {
    const details = s.details || {}
    const travelDate = details.travel_date
    if (!travelDate) return false
    const tDate = new Date(travelDate)
    
    const mode = (s.category || '').toLowerCase()
    const isA2AorB2B = mode.includes('air') || mode.includes('bus') || mode.includes('b2b') || mode.includes('a2a') || mode.includes('transit')
    
    if (!isA2AorB2B) return false
    
    return tDate >= today && tDate <= in7Days
  }).sort((a: any, b: any) => new Date(a.details?.travel_date).getTime() - new Date(b.details?.travel_date).getTime())

  if (reminders.length === 0) return null

  return (
    <div className="card-anthropic overflow-hidden mb-8 border border-red-900/10">
      <div className="border-b border-[var(--card-border)] px-8 py-5 flex items-center justify-between bg-red-50/50 dark:bg-red-900/10">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-serif">
            A2A / B2B Action Reminders (Next 7 Days)
          </h3>
        </div>
        <span className="text-[10px] font-mono uppercase bg-red-100 text-red-700 px-2 py-1 rounded">
          {reminders.length} Upcoming
        </span>
      </div>
      <div className="divide-y divide-[var(--card-border)]">
        {reminders.map((service: any) => {
          const tDate = new Date(service.details?.travel_date)
          const daysLeft = differenceInDays(tDate, today)
          const isHot = daysLeft <= 2
          const mode = (service.category || '').toLowerCase()
          const isBus = mode.includes('bus') || mode.includes('b2b')
          const customerName = service.customer?.name || 'Unknown'
          const customerIdStr = service.referenceId || service.customerId

          return (
            <div key={service.id} className={`p-6 flex items-center justify-between transition-colors hover:bg-[var(--sidebar-bg)] ${isHot ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full border border-[var(--card-border)] ${isHot ? 'text-red-600 bg-red-50' : 'opacity-70'}`}>
                  {isBus ? <Bus className="w-5 h-5" /> : <PlaneTakeoff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-lg">{customerName}</h4>
                    {isHot && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-red-500 text-white">
                        HOT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs opacity-70 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--card-border)]">
                      {customerIdStr}
                    </span>
                    <span>•</span>
                    <span className="uppercase">{service.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Travel: {service.details?.travel_date} ({daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} days`})
                    </span>
                  </div>
                </div>
              </div>
              
              <Link 
                href={`/dashboard/uae-visa`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all
                  ${isHot 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-[var(--card-border)] hover:opacity-80'
                  }`}
              >
                View <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
