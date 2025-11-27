"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bot, Trash2, Pause, Play, Clock, Cpu, HardDrive, MoreVertical, Terminal, Maximize2 } from "lucide-react"
import { useAgents } from "@/hooks/use-agents"
import type { Agent } from "@/lib/types"

export function AgentGrid() {
  const { agents, removeAgent, pauseAgent, resumeAgent } = useAgents() // Removed addAgent since agents are created via mission start
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const visibleAgents = agents.slice(0, 9)
  const hasMoreAgents = agents.length > 9

  return (
    <Card className="border-border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-medium">Active Agents</CardTitle>
          <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-5">
            {agents.length}/10
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasMoreAgents && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-transparent">
                  <Maximize2 className="w-3.5 h-3.5" />
                  View All ({agents.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" /> All Deployed Agents
                  </DialogTitle>
                  <DialogDescription>Managing {agents.length} active autonomous agents.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden p-6 pt-2">
                  <ScrollArea className="h-full pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pb-4">
                      {agents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          compact={true}
                          onPause={() => pauseAgent(agent.id)}
                          onResume={() => resumeAgent(agent.id)}
                          onRemove={() => removeAgent(agent.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 px-4 pb-4">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground border border-dashed rounded-md bg-muted/5">
            <Bot className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">No agents deployed</p>
            <p className="text-xs mt-1">Start a mission to deploy agents</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {visibleAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  compact={true}
                  onPause={() => pauseAgent(agent.id)}
                  onResume={() => resumeAgent(agent.id)}
                  onRemove={() => removeAgent(agent.id)}
                />
              ))}
            </div>
            {hasMoreAgents && (
              <div
                className="text-center p-2 border border-dashed rounded-md bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setIsDialogOpen(true)}
              >
                <p className="text-xs text-muted-foreground">
                  + {agents.length - 9} more agents running. Click to view all.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AgentCardProps {
  agent: Agent
  compact?: boolean
  onPause: () => void
  onResume: () => void
  onRemove: () => void
}

function AgentCard({ agent, compact, onPause, onResume, onRemove }: AgentCardProps) {
  const statusColors = {
    idle: "bg-muted text-muted-foreground border-border",
    running: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  const indicatorColors = {
    idle: "bg-muted-foreground",
    running: "bg-emerald-500 animate-pulse",
    paused: "bg-yellow-500",
    error: "bg-red-500",
  }

  return (
    <div
      className={`group relative rounded-lg border p-2.5 transition-all hover:shadow-sm ${
        agent.status === "running" ? "border-primary/20 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5 p-0.5 rounded bg-background border text-muted-foreground" />
            <div
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background ${
                indicatorColors[agent.status] || "bg-gray-400"
              }`}
            />
          </div>
          <div className="flex flex-col leading-none gap-0">
            <span className="font-semibold text-sm">Agent-{agent.id}</span>
            <span className="text-[8px] text-muted-foreground uppercase font-mono">{agent.status}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1">
              <MoreVertical className="w-3 h-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {agent.status === "running" ? (
              <DropdownMenuItem onClick={onPause} className="text-xs">
                <Pause className="w-3 h-3 mr-1.5" /> Pause
              </DropdownMenuItem>
            ) : agent.status === "paused" ? (
              <DropdownMenuItem onClick={onResume} className="text-xs">
                <Play className="w-3 h-3 mr-1.5" /> Resume
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRemove} className="text-xs text-destructive">
              <Trash2 className="w-3 h-3 mr-1.5" /> Terminate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Terminal Output */}
      <div className="mb-1.5 p-1 rounded bg-black/80 font-mono text-[9px] text-green-400 truncate border border-border/50 flex items-center gap-1">
        <Terminal className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
        <span className="truncate opacity-90 line-clamp-1">{agent.lastCommand}</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-1 mb-1.5">
        <MetricItem icon={Clock} label="Time" value={agent.executionTime} />
        <MetricItem icon={Cpu} label="CPU" value={`${agent.cpuUsage}%`} />
        <MetricItem icon={HardDrive} label="MEM" value={`${agent.memoryUsage}MB`} />
      </div>

      {/* Last Execute Time */}
      {agent.lastExecuteTime && (
        <div className="mb-1.5 text-[8px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          <span>Last: {agent.lastExecuteTime}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[8px] text-muted-foreground">
          <span>Task</span>
          <span>{agent.progress}%</span>
        </div>
        <Progress value={agent.progress} className={`h-0.5 ${agent.status === "paused" ? "opacity-50" : ""}`} />
      </div>
    </div>
  )
}

function MetricItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-0.5 rounded bg-muted/30 border border-border/30">
      <Icon className="w-2.5 h-2.5 text-muted-foreground mb-0.5" />
      <span className="text-[7px] text-muted-foreground uppercase leading-none">{label}</span>
      <span className="text-[8px] font-mono font-medium leading-none mt-0.5">{value}</span>
    </div>
  )
}
