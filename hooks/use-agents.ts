"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, type AgentResponse } from "@/lib/api"
import { useWebSocket } from "./use-websocket"
import type { Agent } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

const MISSION_CONFIG_KEY = "performa_mission_config"

function getMissionConfig() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(MISSION_CONFIG_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to load mission config:", e)
  }
  return null
}

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
    target: agentRes.target,
    category: agentRes.category,
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
        const newAgents = response.data.agents.map((agent: AgentResponse, index: number) => 
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
      const response = await api.deleteAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      setAgents((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setLoading(false)
    }
  }, [])

  const pauseAgent = useCallback(async (id: string) => {
    try {
      const response = await api.pauseAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "paused" as const } : a)))
      }
    } catch {
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "paused" as const } : a)))
    }
  }, [])

  const resumeAgent = useCallback(async (id: string) => {
    try {
      const response = await api.resumeAgent(id)
      if (!response.error) {
        setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running" as const } : a)))
      }
    } catch {
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running" as const } : a)))
    }
  }, [])

  useEffect(() => {
    if (isCreatingRef.current) {
      return
    }
    
    if (lastMessage?.type === "agent_update" && lastMessage.agents) {
      setAgents(
        lastMessage.agents.map((a: AgentUpdate, index: number) => ({
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
      const missionConfig = getMissionConfig()
      
      const agentConfig = {
        target: config?.target || missionConfig?.target || "",
        category: config?.category || missionConfig?.category || "domain",
        custom_instruction: config?.custom_instruction || missionConfig?.customInstruction || "",
        stealth_mode: config?.stealth_mode ?? missionConfig?.stealthMode ?? false,
        aggressive_mode: config?.aggressive_mode ?? (missionConfig?.aggressiveLevel > 2) ?? false,
        model_name: config?.model_name || missionConfig?.modelName || "openai/gpt-4-turbo",
      }
      
      const response = await api.createAgent(agentConfig)
      if (response.data?.agent) {
        const newAgent = transformAgent(response.data.agent, agents.length)
        newAgent.status = agentConfig.target ? "running" : "idle"
        setAgents(prev => [...prev, newAgent])
        
        setTimeout(() => {
          isCreatingRef.current = false
        }, 2000)
        
        return response.data.agent_id
      }
      if (response.error) {
        console.error("Failed to create agent:", response.error)
        isCreatingRef.current = false
        return null
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

interface AgentUpdate {
  id: string
  status: string
  last_command: string
  execution_time: number
  cpu_usage: number
  memory_usage: number
  progress: number
}
