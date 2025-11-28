"use client"

import { useState, useEffect } from "react"
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
import { Bot, Trash2, Pause, Play, Clock, Cpu, HardDrive, MoreVertical, Terminal, Maximize2, Activity, Eye, Plus } from "lucide-react"
import { useAgents } from "@/hooks/use-agents"
import type { Agent } from "@/lib/types"
import { AnimatedProgress, LoadingDots, PulseRing, SpinnerProgress } from "@/components/ui/animated-progress"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts"

export function AgentGrid() {
  const { agents, addAgent, removeAgent, pauseAgent, resumeAgent, loading } = useAgents()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const visibleAgents = agents.slice(0, 9)
  const hasMoreAgents = agents.length > 9

  const handleViewDetails = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsDetailOpen(true)
  }

  const handleAddAgent = async () => {
    await addAgent()
  }

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
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 bg-transparent"
            onClick={handleAddAgent}
            disabled={loading || agents.length >= 10}
          >
            {loading ? (
              <SpinnerProgress size={12} />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add Agent
          </Button>
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
                  onViewDetails={() => handleViewDetails(agent)}
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
      
      <AgentDetailDialog 
        agent={selectedAgent}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Card>
  )
}

interface AgentCardProps {
  agent: Agent
  compact?: boolean
  onPause: () => void
  onResume: () => void
  onRemove: () => void
  onViewDetails?: () => void
}

function AgentCard({ agent, compact, onPause, onResume, onRemove, onViewDetails }: AgentCardProps) {
  const statusColors = {
    idle: "bg-muted text-muted-foreground border-border",
    running: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  const indicatorColors = {
    idle: "bg-muted-foreground",
    running: "bg-emerald-500",
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
            {onViewDetails && (
              <DropdownMenuItem onClick={onViewDetails} className="text-xs">
                <Eye className="w-3 h-3 mr-1.5" /> Details
              </DropdownMenuItem>
            )}
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
          <span className="flex items-center gap-1">
            Task
            {agent.status === "running" && <PulseRing size="sm" className="ml-0.5" />}
          </span>
          <span>{agent.progress}%</span>
        </div>
        <AnimatedProgress 
          value={agent.progress} 
          variant={agent.status === "running" ? "striped" : "default"}
          size="sm"
          className={agent.status === "paused" ? "opacity-50" : ""}
        />
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

interface AgentDetailDialogProps {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AgentDetailDialog({ agent, open, onOpenChange }: AgentDetailDialogProps) {
  const [cpuHistory, setCpuHistory] = useState<{value: number, time: string}[]>([])
  const [memoryHistory, setMemoryHistory] = useState<{value: number, time: string}[]>([])

  useEffect(() => {
    if (!agent || !open) return

    const generateData = () => {
      const now = new Date()
      const time = now.toLocaleTimeString()
      
      setCpuHistory(prev => {
        const newData = [...prev, { value: agent.cpuUsage + Math.random() * 10 - 5, time }]
        return newData.slice(-30)
      })
      
      setMemoryHistory(prev => {
        const newData = [...prev, { value: agent.memoryUsage + Math.random() * 20 - 10, time }]
        return newData.slice(-30)
      })
    }

    generateData()
    const interval = setInterval(generateData, 2000)
    return () => clearInterval(interval)
  }, [agent, open])

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Agent-{agent.id} Details
            <Badge variant={agent.status === "running" ? "default" : "secondary"} className="ml-2">
              {agent.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Real-time monitoring and resource usage for this agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Execution Time</span>
              </div>
              <span className="text-lg font-mono font-semibold">{agent.executionTime}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CPU Usage</span>
              </div>
              <span className="text-lg font-mono font-semibold">{agent.cpuUsage}%</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Memory</span>
              </div>
              <span className="text-lg font-mono font-semibold">{agent.memoryUsage}MB</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Progress</span>
              </div>
              <span className="text-lg font-mono font-semibold">{agent.progress}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border bg-card">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                CPU Usage History
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory}>
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fill="url(#cpuGradient)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                Memory Usage History
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memoryHistory}>
                    <defs>
                      <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      fill="url(#memGradient)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-black/80">
            <h4 className="text-xs font-medium mb-2 text-green-400 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              Last Command
            </h4>
            <pre className="text-xs font-mono text-green-400/80 whitespace-pre-wrap">
              {agent.lastCommand}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Task Progress</span>
              <span className="font-mono">{agent.progress}%</span>
            </div>
            <AnimatedProgress 
              value={agent.progress} 
              variant={agent.status === "running" ? "striped" : "default"}
              size="md"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
