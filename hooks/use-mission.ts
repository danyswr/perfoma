"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "@/lib/api"
import type { Mission, MissionConfig } from "@/lib/types"

const initialMission: Mission = {
  active: false,
  target: "",
  category: "",
  instruction: "",
  duration: 0,
  progress: 0,
  activeAgents: 0,
  totalAgents: 0,
  completedTasks: 0,
  findings: 0,
}

export function useMission() {
  const [mission, setMission] = useState<Mission>(initialMission)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const findingsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFindings = useCallback(async () => {
    try {
      const response = await api.getFindings()
      if (response.data) {
        setMission((prev) => ({
          ...prev,
          findings: response.data!.total,
        }))
      }
    } catch {
      // Silent fail
    }
  }, [])

  const startMission = useCallback(
    async (config: MissionConfig): Promise<string[] | null> => {
      setError(null)
      try {
        const response = await api.startMission({
          target: config.target,
          category: config.category,
          custom_instruction: config.customInstruction,
          stealth_mode: config.stealthMode,
          aggressive_mode: config.aggressiveMode,
          model_name: config.modelName,
          num_agents: config.numAgents,
        })

        if (response.error) {
          setError(response.error)
          return null
        }

        const agentIds = response.data?.agent_ids || []

        setMission({
          active: true,
          target: config.target,
          category: config.category,
          instruction: config.customInstruction,
          duration: 0,
          progress: 0,
          activeAgents: agentIds.length,
          totalAgents: config.numAgents,
          completedTasks: 0,
          findings: 0,
        })

        // Start duration timer
        timerRef.current = setInterval(() => {
          setMission((prev) => ({
            ...prev,
            duration: prev.duration + 1,
          }))
        }, 1000)

        // Start polling for findings
        findingsIntervalRef.current = setInterval(fetchFindings, 5000)

        return agentIds
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start mission")
        return null
      }
    },
    [fetchFindings],
  )

  const stopMission = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (findingsIntervalRef.current) {
      clearInterval(findingsIntervalRef.current)
      findingsIntervalRef.current = null
    }
    setMission((prev) => ({ ...prev, active: false }))
  }, [])

  const updateProgress = useCallback((progress: number, activeAgents: number, completedTasks: number) => {
    setMission((prev) => ({
      ...prev,
      progress,
      activeAgents,
      completedTasks,
    }))
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (findingsIntervalRef.current) {
        clearInterval(findingsIntervalRef.current)
      }
    }
  }, [])

  return { mission, error, startMission, stopMission, updateProgress }
}
