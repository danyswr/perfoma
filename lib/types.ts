export interface MissionConfig {
  target: string
  category: "domain" | "path"
  customInstruction: string
  stealthMode: boolean
  aggressiveLevel: number
  modelName: string
  numAgents: number
  stealthOptions: StealthOptions
  capabilities: CapabilityOptions
  osType: "windows" | "linux"
}

export interface StealthOptions {
  proxyChain: boolean
  torRouting: boolean
  vpnChaining: boolean
  macSpoofing: boolean
  timestampSpoofing: boolean
  logWiping: boolean
  memoryScrambling: boolean
  secureDelete: boolean
}

export interface CapabilityOptions {
  packetInjection: boolean
  arpSpoof: boolean
  mitm: boolean
  trafficHijack: boolean
  realtimeManipulation: boolean
  corsExploitation: boolean
  ssrfChaining: boolean
  deserializationExploit: boolean
  wafBypass: boolean
  bacTesting: boolean
  websocketHijack: boolean
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
  startTime?: number
}

export interface Agent {
  id: string
  displayId: string
  status: "idle" | "running" | "paused" | "error"
  lastCommand: string
  executionTime: string
  lastExecuteTime?: string
  cpuUsage: number
  memoryUsage: number
  progress: number
  target?: string
  category?: string
  currentTask?: string
  tasksCompleted?: number
  findingsCount?: number
  cpuHistory?: ResourceDataPoint[]
  memoryHistory?: ResourceDataPoint[]
}

export interface ResourceDataPoint {
  time: string
  value: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
}

export interface ModelInstruction {
  id: string
  agentId: string
  modelName: string
  instruction: string
  timestamp: string
  type: "command" | "found" | "execute" | "model_output" | "info" | "analysis" | "decision"
  severity?: "critical" | "high" | "medium" | "low" | "info"
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
  details?: string
  remediation?: string
}

export interface Resources {
  cpu: number
  memory: number
  disk: number
  network: number
  wifiSpeed?: number
}

export interface ResourceHistory {
  time: string
  cpu: number
  memory: number
}

export const OPENROUTER_MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "Meta" },
  { id: "custom", name: "Custom Model", provider: "OpenRouter" },
]

export const DEFAULT_STEALTH_OPTIONS: StealthOptions = {
  proxyChain: false,
  torRouting: false,
  vpnChaining: false,
  macSpoofing: false,
  timestampSpoofing: false,
  logWiping: false,
  memoryScrambling: false,
  secureDelete: false,
}

export const DEFAULT_CAPABILITY_OPTIONS: CapabilityOptions = {
  packetInjection: false,
  arpSpoof: false,
  mitm: false,
  trafficHijack: false,
  realtimeManipulation: false,
  corsExploitation: false,
  ssrfChaining: false,
  deserializationExploit: false,
  wafBypass: false,
  bacTesting: false,
  websocketHijack: false,
}
