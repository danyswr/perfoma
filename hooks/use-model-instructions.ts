"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ModelInstruction } from "@/lib/types"
import { useWebSocket } from "@/hooks/use-websocket"

const STORAGE_KEY = "performa_model_instructions"
const MAX_INSTRUCTIONS = 100

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function loadFromStorage(): ModelInstruction[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to load model instructions from storage:", e)
  }
  return []
}

function saveToStorage(instructions: ModelInstruction[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions.slice(0, MAX_INSTRUCTIONS)))
  } catch (e) {
    console.error("Failed to save model instructions to storage:", e)
  }
}

export function useModelInstructions() {
  const [instructions, setInstructions] = useState<ModelInstruction[]>([])
  const { lastMessage, connected } = useWebSocket()
  const processedCommands = useRef<Set<string>>(new Set())
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isInitialized.current) {
      const stored = loadFromStorage()
      if (stored.length > 0) {
        setInstructions(stored)
        stored.forEach(inst => {
          const key = `${inst.agentId}-${inst.instruction}`
          processedCommands.current.add(key)
        })
      }
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    if (isInitialized.current && instructions.length > 0) {
      saveToStorage(instructions)
    }
  }, [instructions])

  useEffect(() => {
    if (lastMessage) {
      const data = lastMessage as unknown as Record<string, unknown>
      
      if (data.type === "model_instruction") {
        const newInstruction: ModelInstruction = {
          id: generateUUID(),
          agentId: String(data.agent_id || "unknown"),
          modelName: String(data.model_name || "GPT-4 Turbo"),
          instruction: String(data.instruction || data.content || ""),
          timestamp: new Date().toLocaleTimeString(),
          type: (data.instruction_type as ModelInstruction["type"]) || "command"
        }
        
        const commandKey = `${newInstruction.agentId}-${newInstruction.instruction}`
        if (!processedCommands.current.has(commandKey)) {
          processedCommands.current.add(commandKey)
          setInstructions(prev => [newInstruction, ...prev].slice(0, MAX_INSTRUCTIONS))
        }
      }
      
      if (data.type === "agent_command" || data.type === "command") {
        const commandContent = String(data.command || data.content || "")
        const agentId = String(data.agent_id || "unknown")
        const commandKey = `${agentId}-${commandContent}`
        
        if (commandContent && !processedCommands.current.has(commandKey)) {
          processedCommands.current.add(commandKey)
          const newInstruction: ModelInstruction = {
            id: generateUUID(),
            agentId,
            modelName: String(data.model || "AI Model"),
            instruction: commandContent,
            timestamp: new Date().toLocaleTimeString(),
            type: "command"
          }
          setInstructions(prev => [newInstruction, ...prev].slice(0, MAX_INSTRUCTIONS))
        }
      }

      if (data.type === "agent_analysis" || data.type === "analysis") {
        const analysisContent = String(data.analysis || data.content || "")
        const agentId = String(data.agent_id || "unknown")
        const commandKey = `${agentId}-${analysisContent}`
        
        if (analysisContent && !processedCommands.current.has(commandKey)) {
          processedCommands.current.add(commandKey)
          const newInstruction: ModelInstruction = {
            id: generateUUID(),
            agentId,
            modelName: String(data.model || "AI Model"),
            instruction: analysisContent,
            timestamp: new Date().toLocaleTimeString(),
            type: "analysis"
          }
          setInstructions(prev => [newInstruction, ...prev].slice(0, MAX_INSTRUCTIONS))
        }
      }

      if (data.type === "agent_update" || data.type === "agent_status") {
        const lastCommand = data.last_command as string | undefined
        const agentId = String(data.agent_id || data.id || "unknown")
        
        if (lastCommand && lastCommand !== "Waiting..." && lastCommand !== "Awaiting command..." && lastCommand.trim()) {
          const commandKey = `${agentId}-${lastCommand}`
          if (!processedCommands.current.has(commandKey)) {
            processedCommands.current.add(commandKey)
            if (processedCommands.current.size > 500) {
              const entries = Array.from(processedCommands.current)
              processedCommands.current = new Set(entries.slice(-250))
            }
            
            const newInstruction: ModelInstruction = {
              id: generateUUID(),
              agentId,
              modelName: "AI Model",
              instruction: lastCommand,
              timestamp: new Date().toLocaleTimeString(),
              type: "command"
            }
            setInstructions(prev => [newInstruction, ...prev].slice(0, MAX_INSTRUCTIONS))
          }
        }
      }
    }
  }, [lastMessage])

  const addInstruction = useCallback((instruction: Omit<ModelInstruction, "id" | "timestamp">) => {
    const newInstruction: ModelInstruction = {
      ...instruction,
      id: generateUUID(),
      timestamp: new Date().toLocaleTimeString()
    }
    const commandKey = `${newInstruction.agentId}-${newInstruction.instruction}`
    if (!processedCommands.current.has(commandKey)) {
      processedCommands.current.add(commandKey)
      setInstructions(prev => [newInstruction, ...prev].slice(0, MAX_INSTRUCTIONS))
    }
  }, [])

  const clearInstructions = useCallback(() => {
    setInstructions([])
    processedCommands.current.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return {
    instructions,
    addInstruction,
    clearInstructions,
    connected
  }
}
