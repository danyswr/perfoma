"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Shield, Activity, Terminal, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"

interface NavbarProps {
  onConfigClick: () => void
  missionActive: boolean
}

export function Navbar({ onConfigClick, missionActive }: NavbarProps) {
  const { connected, connecting, connectionError } = useWebSocket()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Performa</h1>
              <p className="text-xs text-muted-foreground">Autonomous Security Agent</p>
            </div>
          </div>

          {/* Center Status */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 text-chart-3 animate-spin" />
                  <span className="text-sm text-chart-3">Connecting...</span>
                </>
              ) : connected ? (
                <>
                  <div className="relative">
                    <Wifi className="w-4 h-4 text-primary" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <span className="text-sm text-primary font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">Offline</span>
                </>
              )}
            </div>

            {connectionError && !connecting && (
              <Badge variant="outline" className="border-destructive/50 text-destructive text-xs">
                Backend unavailable
              </Badge>
            )}

            {missionActive && (
              <Badge variant="outline" className="border-primary/50 text-primary gap-1.5">
                <Activity className="w-3 h-3 animate-pulse" />
                Mission Active
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Terminal className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={onConfigClick} className="gap-2 bg-transparent">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configure</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
