const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

export interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    const data = await res.json()
    if (!res.ok) {
      return { error: data.detail || data.message || "Request failed", status: res.status }
    }
    return { data, status: res.status }
  } catch {
    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}`, status: res.status }
    }
    return { error: "Failed to parse response" }
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/agents`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

export const api = {
  // Health Check
  async healthCheck() {
    try {
      const res = await fetch(`${API_BASE}/`)
      return handleResponse<{ message: string; version: string; status: string }>(res)
    } catch {
      return { error: "Cannot connect to backend server" }
    }
  },

  // Mission
  async startMission(config: {
    target: string
    category: string
    custom_instruction: string
    stealth_mode: boolean
    aggressive_mode: boolean
    model_name: string
    num_agents: number
  }) {
    try {
      const res = await fetch(`${API_BASE}/api/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      return handleResponse<{ status: string; agent_ids: string[]; timestamp: string }>(res)
    } catch {
      return { error: "Cannot connect to backend server. Make sure it's running." }
    }
  },

  // Agents
  async getAgents() {
    try {
      const res = await fetch(`${API_BASE}/api/agents`)
      return handleResponse<{ agents: AgentResponse[]; total: number }>(res)
    } catch {
      return { error: "Cannot fetch agents", data: { agents: [], total: 0 } }
    }
  },

  async getAgent(agentId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}`)
      return handleResponse<AgentResponse>(res)
    } catch {
      return { error: "Cannot fetch agent details" }
    }
  },

  async createAgent() {
    try {
      // This endpoint doesn't exist in the backend - agents are created via startMission
      // Return a stub response to prevent errors
      return {
        error: "Agents are created via mission start. Use startMission instead.",
        data: null,
      }
    } catch {
      return { error: "Cannot create agent" }
    }
  },

  async deleteAgent(agentId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}`, {
        method: "DELETE",
      })
      return handleResponse<{ status: string; agent_id: string }>(res)
    } catch {
      return { error: "Cannot delete agent" }
    }
  },

  async pauseAgent(agentId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/pause`, {
        method: "POST",
      })
      return handleResponse<{ status: string; agent_id: string }>(res)
    } catch {
      return { error: "Cannot pause agent" }
    }
  },

  async resumeAgent(agentId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/resume`, {
        method: "POST",
      })
      return handleResponse<{ status: string; agent_id: string }>(res)
    } catch {
      return { error: "Cannot resume agent" }
    }
  },

  // Resources
  async getResources() {
    try {
      const res = await fetch(`${API_BASE}/api/resources`)
      return handleResponse<ResourcesResponse>(res)
    } catch {
      return {
        error: "Cannot fetch resources",
        data: { cpu: 0, memory: 0, disk: 0, network: 0, timestamp: new Date().toISOString() },
      }
    }
  },

  async getAgentResources() {
    try {
      const res = await fetch(`${API_BASE}/api/resources/agents`)
      return handleResponse<AgentResourcesResponse>(res)
    } catch {
      return { error: "Cannot fetch agent resources", data: {} }
    }
  },

  // Findings
  async getFindings() {
    try {
      const res = await fetch(`${API_BASE}/api/findings`)
      return handleResponse<FindingsResponse>(res)
    } catch {
      return {
        error: "Cannot fetch findings",
        data: { findings: [], total: 0, severity_summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } },
      }
    }
  },

  // Models
  async getModels() {
    try {
      const res = await fetch(`${API_BASE}/api/models`)
      return handleResponse<{ models: ModelInfo[] }>(res)
    } catch {
      return { error: "Cannot fetch models", data: { models: [] } }
    }
  },

  async testModel(payload: { provider: string; model: string; api_key?: string }) {
    try {
      const res = await fetch(`${API_BASE}/api/models/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return handleResponse<{ status: string; message: string; provider: string; model: string; latency?: string; response?: string }>(res)
    } catch {
      return { error: "Cannot connect to backend. Make sure the server is running." }
    }
  },
}

export interface AgentResponse {
  id: string
  status: "idle" | "running" | "paused" | "error"
  last_command: string
  execution_time: number
  last_execute_time?: string
  cpu_usage: number
  memory_usage: number
  progress: number
  target?: string
  category?: string
}

export interface ResourcesResponse {
  cpu: number
  memory: number
  disk: number
  network: number
  timestamp: string
}

export interface AgentResourcesResponse {
  [agentId: string]: {
    cpu: number
    memory: number
    network: number
  }
}

export interface FindingsResponse {
  findings: FindingResponse[]
  total: number
  severity_summary: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
}

export interface FindingResponse {
  id: string
  title: string
  description: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  cve?: string
  cvss?: number
  agent_id: string
  timestamp: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
}
