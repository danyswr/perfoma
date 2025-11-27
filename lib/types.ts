export interface MissionConfig {
  target: string
  category: string
  customInstruction: string
  stealthMode: boolean
  aggressiveMode: boolean
  modelName: string
  numAgents: number
}

export interface Mission {
  active: boolean
  target: string
  category: string
  instruction: string
  duration: number
  progress: number
  activeAgents: number
  totalAgents: number
  completedTasks: number
  findings: number
}

export interface Agent {
  id: string
  displayId: string // Added displayId for sequential numbering (1, 2, 3...) while keeping actual UUID in id
  status: "idle" | "running" | "paused" | "error"
  lastCommand: string
  executionTime: string
  lastExecuteTime?: string
  cpuUsage: number
  memoryUsage: number
  progress: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
}

export interface Finding {
  id: string
  title: string
  description: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  cve?: string
  cvss?: number
  agentId: string
  timestamp: string
}

export interface Resources {
  cpu: number
  memory: number
  disk: number
  network: number
}

export interface ResourceHistory {
  time: string
  cpu: number
  memory: number
}
