'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TraceEvent } from '@/lib/api-client'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'

interface TraceTimelineProps {
  events: TraceEvent[]
  title?: string
}

const EVENT_STATUS_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  success: 'bg-green-500/20 text-green-600 dark:text-green-400',
  error: 'bg-red-500/20 text-red-600 dark:text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
}

const EVENT_STATUS_ICONS: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
}

export function TraceTimeline({ events, title = 'Trace Timeline' }: TraceTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filteredEvents = filter === 'all'
    ? events
    : events.filter((e) => e.status === filter)

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">暂无 Trace 事件</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-1">
          <Activity className="h-4 w-4" />
          {title} ({filteredEvents.length})
        </p>
        <div className="flex gap-1">
          {['all', 'info', 'success', 'error'].map((f) => (
            <Badge
              key={f}
              variant={filter === f ? 'accent' : 'outline'}
              className="text-[10px] cursor-pointer px-1.5 py-0"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border/50" />
        <div className="space-y-1">
          {filteredEvents.map((event) => {
            const isExpanded = expandedId === event.id
            const StatusIcon = EVENT_STATUS_ICONS[event.status] || Info
            const statusColor = EVENT_STATUS_COLORS[event.status] || EVENT_STATUS_COLORS.info

            return (
              <div key={event.id} className="relative pl-8">
                <div className={`absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-background ${statusColor.split(' ')[0]}`}>
                  <StatusIcon className="h-2 w-2 absolute top-0.5 left-0.5" />
                </div>

                <div
                  className="p-2 rounded-lg bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={`text-[9px] px-1 py-0 ${statusColor}`}>
                        {event.event_type}
                      </Badge>
                      <span className="text-xs font-medium truncate">{event.title}</span>
                      {event.latency_ms > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {event.latency_ms}ms
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {event.message && (
                    <p className="text-[11px] text-muted-foreground mt-1">{event.message}</p>
                  )}

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {event.metadata_ && Object.keys(event.metadata_).length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Metadata:</p>
                          <pre className="text-[10px] p-2 rounded bg-muted/30 overflow-auto max-h-32">
                            {JSON.stringify(event.metadata_, null, 2)}
                          </pre>
                        </div>
                      )}
                      {event.output_data && Object.keys(event.output_data).length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Output:</p>
                          <pre className="text-[10px] p-2 rounded bg-muted/30 overflow-auto max-h-32">
                            {JSON.stringify(event.output_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {event.error_data && Object.keys(event.error_data).length > 0 && (
                        <div>
                          <p className="text-[10px] text-error mb-1">Error:</p>
                          <pre className="text-[10px] p-2 rounded bg-error/10 overflow-auto max-h-32">
                            {JSON.stringify(event.error_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
