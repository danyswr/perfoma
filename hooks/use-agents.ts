"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, type AgentResponse } from "@/lib/api"
import { useWebSocket } from "./use-websocket"
import type { Agent } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

function transformAgent(agentRes: AgentResponse, index: number): Agent {
  return {
    id: agentRes.id,
    displayId: `${index + 1}`,
    status: (agentRes.status || "idle") as "idle" | "running" | "paused" | "error",
    lastCommand: agentRes.last_command || "Awaiting command...",
    executionTime: formatDuration(agentRes.execution_time || 0),
    lastExecuteTime: agentRes.last_execute_time 
      ? new Date(agentRes.last_execute_time).toLocaleTimeString() 
      : undefined,
    cpuUsage: agentRes.cpu_usage || 0,
    memoryUsage: agentRes.memory_usage || 0,
    progress: agentRes.progress || 0,
  }
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const { lastMessage, requestUpdates, connected } = useWebSocket()
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)
  const isCreatingRef = useRef<boolean>(false)

  const fetchAgents = useCallback(async () => {
    if (isCreatingRef.current) {
      return
    }
    
    try {
      const response = await api.getAgents()
      if (response.data?.agents) {
        const newAgents = response.data.agents.map((agent: any, index: number) => 
          transformAgent(agent, index)
        )
        setAgents(newAgents)
        lastFetchRef.current = Date.now()
      }
    } catch {
    }
  }, [])

  const removeAgent = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const response = await (api as any).deleteAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      // Optimistic update jika API gagal/tidak respon
      setAgents((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setLoading(false)
    }
  }, [])

  const pauseAgent = useCallback(async (id: string) => {
    try {
      const response = await (api as any).pauseAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "paused" as const } : a)))
      }
    } catch {
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "paused" as const } : a)))
    }
  }, [])

  const resumeAgent = useCallback(async (id: string) => {
    try {
      const response = await (api as any).resumeAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running" as const } : a)))
      }
    } catch {
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running" as const } : a)))
    }
  }, [])

  // Handle WebSocket updates
  useEffect(() => {
    if (isCreatingRef.current) {
      return
    }
    
    if (lastMessage?.type === "agent_update" && lastMessage.agents) {
      setAgents(
        lastMessage.agents.map((a: any, index: number) => ({
          id: a.id,
          displayId: `${index + 1}`,
          status: (a.status || "idle") as "idle" | "running" | "paused" | "error",
          lastCommand: a.last_command || "Awaiting command...",
          executionTime: formatDuration(a.execution_time || 0),
          lastExecuteTime: new Date().toLocaleTimeString(),
          cpuUsage: a.cpu_usage || 0,
          memoryUsage: a.memory_usage || 0,
          progress: a.progress || 0,
        })) as Agent[],
      )
    }
  }, [lastMessage])

  // Polling fallback - use longer interval to prevent race conditions
  useEffect(() => {
    const initialFetch = setTimeout(() => {
      if (!isCreatingRef.current) {
        fetchAgents()
      }
    }, 500)

    const interval = connected ? 3000 : 5000
    pollIntervalRef.current = setInterval(() => {
      if (isCreatingRef.current) {
        return
      }
      
      if (connected) {
        requestUpdates()
      } else {
        fetchAgents()
      }
    }, interval)

    return () => {
      clearTimeout(initialFetch)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [connected, fetchAgents, requestUpdates])

  const syncAgents = useCallback((agentIds: string[]) => {
    isCreatingRef.current = true
    
    const newAgents: Agent[] = agentIds.map((id, index) => ({
      id: id,
      displayId: `${index + 1}`,
      status: "running" as const,
      lastCommand: "Initializing...",
      executionTime: "00:00",
      lastExecuteTime: new Date().toLocaleTimeString(),
      cpuUsage: 0,
      memoryUsage: 0,
      progress: 0,
    }))
    setAgents(newAgents)
    
    setTimeout(() => {
      isCreatingRef.current = false
    }, 3000)
  }, [])

  const addAgent = useCallback(async (config?: {
    target?: string
    category?: string
    custom_instruction?: string
    stealth_mode?: boolean
    aggressive_mode?: boolean
    model_name?: string
  }) => {
    if (agents.length >= 10) return null
    
    isCreatingRef.current = true
    setLoading(true)
    
    try {
      const response = await api.createAgent(config)
      if (response.data?.agent) {
        const newAgent = transformAgent(response.data.agent, agents.length)
        setAgents(prev => [...prev, newAgent])
        
        setTimeout(() => {
          isCreatingRef.current = false
        }, 2000)
        
        return response.data.agent_id
      }
      if (response.error) {
        console.error("Failed to create agent:", response.error)
      }
      isCreatingRef.current = false
      return null
    } catch (error) {
      console.error("Failed to create agent:", error)
      isCreatingRef.current = false
      return null
    } finally {
      setLoading(false)
    }
  }, [agents.length])

  return {
    agents,
    loading,
    addAgent,
    removeAgent,
    pauseAgent,
    resumeAgent,
    syncAgents,
    fetchAgents,
  }
}