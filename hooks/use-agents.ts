"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, type AgentResponse } from "@/lib/api"
import { useWebSocket } from "./use-websocket"
import type { Agent } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

function transformAgent(agentRes: AgentResponse, index: number): Agent {
  return {
    id: agentRes.id, // PENTING: Gunakan ID asli untuk API call
    displayId: `${index + 1}`, // Gunakan ini untuk tampilan nomor urut
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

  const fetchAgents = useCallback(async () => {
    try {
      // Menggunakan (as any) untuk bypass jika tipe di api belum update
      const response = await (api as any).getAgents()
      if (response.data?.agents) {
        setAgents(response.data.agents.map((agent: any, index: number) => 
          transformAgent(agent, index)
        ))
      }
    } catch {
      // Silent fail, will retry on next poll
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
    if (lastMessage?.type === "agent_update" && lastMessage.agents) {
      setAgents(
        lastMessage.agents.map((a: any, index: number) => ({
          id: a.id, // ID Asli
          displayId: `${index + 1}`, // Nomor urut tampilan
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

  // Polling fallback
  useEffect(() => {
    fetchAgents()

    // Poll every 1 second if connected, otherwise wait longer
    const interval = connected ? 1000 : 5000
    pollIntervalRef.current = setInterval(() => {
      if (connected) {
        requestUpdates()
      } else {
        fetchAgents()
      }
    }, interval)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [connected, fetchAgents, requestUpdates])

  const syncAgents = useCallback((agentIds: string[]) => {
    const newAgents: Agent[] = agentIds.map((id, index) => ({
      id: id, // ID Asli dari parameter
      displayId: `${index + 1}`, // Nomor urut
      status: "running" as const,
      lastCommand: "Initializing...",
      executionTime: "00:00",
      lastExecuteTime: new Date().toLocaleTimeString(),
      cpuUsage: 0,
      memoryUsage: 0,
      progress: 0,
    }))
    setAgents(newAgents)
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
    try {
      setLoading(true)
      const response = await api.createAgent(config)
      if (response.data?.agent) {
        const newAgent = transformAgent(response.data.agent, agents.length)
        setAgents(prev => [...prev, newAgent])
        return response.data.agent_id
      }
      if (response.error) {
        console.error("Failed to create agent:", response.error)
      }
      return null
    } catch (error) {
      console.error("Failed to create agent:", error)
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