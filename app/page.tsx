"use client"

import { useState, useCallback, useEffect } from "react"
import { Navbar } from "@/components/dashboard/navbar"
import { ConfigSidebar } from "@/components/dashboard/config-sidebar"
import { AgentGrid } from "@/components/dashboard/agent-grid"
import { LiveChat } from "@/components/dashboard/live-chat"
import { ResourceMonitor } from "@/components/dashboard/resource-monitor"
import { FindingsPanel } from "@/components/dashboard/findings-panel"
import { MissionStatus } from "@/components/dashboard/mission-status"
import { useMission } from "@/hooks/use-mission"
import { useAgents } from "@/hooks/use-agents"
import { checkBackendHealth } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Server } from "lucide-react"
import type { MissionConfig } from "@/lib/types"

export default function Dashboard() {
  const [configOpen, setConfigOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const { mission, error, startMission, stopMission } = useMission()
  const { syncAgents } = useAgents()

  useEffect(() => {
    const checkHealth = async () => {
      setBackendStatus("checking")
      const isHealthy = await checkBackendHealth()
      setBackendStatus(isHealthy ? "online" : "offline")
    }

    checkHealth()

    // Recheck every 30 seconds if offline
    const interval = setInterval(() => {
      if (backendStatus === "offline") {
        checkHealth()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [backendStatus])

  const handleRetryConnection = useCallback(async () => {
    setBackendStatus("checking")
    const isHealthy = await checkBackendHealth()
    setBackendStatus(isHealthy ? "online" : "offline")
  }, [])

  const handleStartMission = useCallback(
    async (config: MissionConfig) => {
      const agentIds = await startMission(config)
      if (agentIds) {
        syncAgents(agentIds)
        setConfigOpen(false)
      }
    },
    [startMission, syncAgents],
  )

  const handleConfigClick = useCallback(() => {
    setConfigOpen(true)
  }, [])

  const handleConfigOpenChange = useCallback((open: boolean) => {
    setConfigOpen(open)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar onConfigClick={handleConfigClick} missionActive={mission.active} />

      <ConfigSidebar
        open={configOpen}
        onOpenChange={handleConfigOpenChange}
        onStartMission={handleStartMission}
        missionActive={mission.active}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {backendStatus === "offline" && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">Backend Server Unavailable</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-3">
              <p>
                Cannot connect to the backend server at{" "}
                <code className="px-1.5 py-0.5 rounded bg-destructive/10 text-xs">
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
                </code>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryConnection}
                  className="gap-2 border-destructive/30 hover:bg-destructive/10 bg-transparent"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Connection
                </Button>
                <span className="text-xs text-muted-foreground">
                  Run <code className="px-1 py-0.5 rounded bg-muted">./start.sh</code> to start the backend
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {backendStatus === "checking" && (
          <Alert className="border-chart-3/50 bg-chart-3/5">
            <Server className="h-4 w-4 text-chart-3 animate-pulse" />
            <AlertTitle className="text-chart-3">Connecting to Backend</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Checking connection to the backend server...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Mission Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Mission Status Bar */}
        <MissionStatus mission={mission} onStop={stopMission} />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Agents & Resources */}
          <div className="xl:col-span-2 space-y-6">
            <AgentGrid />
            <ResourceMonitor />
          </div>

          {/* Right Column - Chat & Findings */}
          <div className="space-y-6">
            <LiveChat />
            <FindingsPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
