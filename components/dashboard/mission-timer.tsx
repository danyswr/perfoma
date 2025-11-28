"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Timer } from "lucide-react"

interface MissionTimerProps {
  active: boolean
  startTime?: number
  duration: number
}

export function MissionTimer({ active, startTime, duration }: MissionTimerProps) {
  const [elapsed, setElapsed] = useState(duration)
  const fallbackStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      fallbackStartRef.current = null
      return
    }

    if (!startTime && !fallbackStartRef.current) {
      fallbackStartRef.current = Date.now() - (duration * 1000)
    }

    const effectiveStartTime = startTime || fallbackStartRef.current

    const interval = setInterval(() => {
      if (effectiveStartTime) {
        const now = Date.now()
        const diff = Math.floor((now - effectiveStartTime) / 1000)
        setElapsed(Math.max(0, diff))
      } else {
        setElapsed(prev => prev + 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [active, startTime, duration])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!active) return null

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-chart-3/50 text-chart-3 bg-chart-3/5 font-mono text-sm px-2.5 py-1"
    >
      <Timer className="w-3.5 h-3.5 animate-pulse" />
      {formatTime(elapsed)}
    </Badge>
  )
}
