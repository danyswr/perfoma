"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ModelInstruction } from "@/lib/types"
import { useWebSocket } from "@/hooks/use-websocket"

export function useModelInstructions() {
  const [instructions, setInstructions] = useState<ModelInstruction[]>([])
  const { lastMessage, connected } = useWebSocket()
  const processedCommands = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (lastMessage) {
      const data = lastMessage as Record<string, unknown>
      
      if (data.type === "model_instruction") {
        const newInstruction: ModelInstruction = {
          id: crypto.randomUUID(),
          agentId: String(data.agent_id || "unknown"),
          modelName: String(data.model_name || "GPT-4 Turbo"),
          instruction: String(data.instruction || data.content || ""),
          timestamp: new Date().toLocaleTimeString(),
          type: (data.instruction_type as ModelInstruction["type"]) || "command"
        }
        setInstructions(prev => [newInstruction, ...prev].slice(0, 100))
      }
      
      if (data.type === "agent_command" || data.type === "command") {
        const newInstruction: ModelInstruction = {
          id: crypto.randomUUID(),
          agentId: String(data.agent_id || "unknown"),
          modelName: String(data.model || "AI Model"),
          instruction: String(data.command || data.content || ""),
          timestamp: new Date().toLocaleTimeString(),
          type: "command"
        }
        setInstructions(prev => [newInstruction, ...prev].slice(0, 100))
      }

      if (data.type === "agent_analysis" || data.type === "analysis") {
        const newInstruction: ModelInstruction = {
          id: crypto.randomUUID(),
          agentId: String(data.agent_id || "unknown"),
          modelName: String(data.model || "AI Model"),
          instruction: String(data.analysis || data.content || ""),
          timestamp: new Date().toLocaleTimeString(),
          type: "analysis"
        }
        setInstructions(prev => [newInstruction, ...prev].slice(0, 100))
      }

      if (data.type === "agent_update" || data.type === "agent_status") {
        const lastCommand = data.last_command as string | undefined
        const agentId = String(data.agent_id || data.id || "unknown")
        
        if (lastCommand && lastCommand !== "Waiting..." && lastCommand.trim()) {
          const commandKey = `${agentId}-${lastCommand}`
          if (!processedCommands.current.has(commandKey)) {
            processedCommands.current.add(commandKey)
            if (processedCommands.current.size > 500) {
              const entries = Array.from(processedCommands.current)
              processedCommands.current = new Set(entries.slice(-250))
            }
            
            const newInstruction: ModelInstruction = {
              id: crypto.randomUUID(),
              agentId,
              modelName: "AI Model",
              instruction: lastCommand,
              timestamp: new Date().toLocaleTimeString(),
              type: "command"
            }
            setInstructions(prev => [newInstruction, ...prev].slice(0, 100))
          }
        }
      }
    }
  }, [lastMessage])

  const addInstruction = useCallback((instruction: Omit<ModelInstruction, "id" | "timestamp">) => {
    const newInstruction: ModelInstruction = {
      ...instruction,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString()
    }
    setInstructions(prev => [newInstruction, ...prev].slice(0, 100))
  }, [])

  const clearInstructions = useCallback(() => {
    setInstructions([])
    processedCommands.current.clear()
  }, [])

  return {
    instructions,
    addInstruction,
    clearInstructions,
    connected
  }
}
