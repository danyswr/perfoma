"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Bot, Play, Shield, Zap, Target,
  Globe, FolderOpen, MessageSquare, X, Download, FileJson, FileText, FileSpreadsheet,
  ChevronRight, AlertTriangle, Settings, Terminal, Clock,
  MoreVertical, Pause, Trash2, ExternalLink, Check, Network, Eye, EyeOff,
  RefreshCw, Send, User, ListOrdered, PanelLeft, Monitor, Brain, Timer,
  Cpu, MemoryStick, Activity, FileDown
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ResourceMonitor } from "@/components/dashboard/resource-monitor"
import { MissionTimer } from "@/components/dashboard/mission-timer"
import { ModelInstructions } from "@/components/dashboard/model-instructions"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMission } from "@/hooks/use-mission"
import { useAgents } from "@/hooks/use-agents"
import { useResources } from "@/hooks/use-resources"
import { useFindings } from "@/hooks/use-findings"
import { useChat } from "@/hooks/use-chat"
import { useWebSocket } from "@/hooks/use-websocket"
import { checkBackendHealth, api } from "@/lib/api"
import type { MissionConfig, Agent, Finding, StealthOptions, CapabilityOptions } from "@/lib/types"
import { OPENROUTER_MODELS, DEFAULT_STEALTH_OPTIONS, DEFAULT_CAPABILITY_OPTIONS } from "@/lib/types"

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [configTab, setConfigTab] = useState("target")
  
  const { mission, startMission, stopMission } = useMission()
  const { agents, syncAgents, pauseAgent, resumeAgent, removeAgent, addAgent } = useAgents()
  const { resources } = useResources()
  const { findings, severitySummary, exportFindings, exportCsv, exportPdf } = useFindings()
  
  const [config, setConfig] = useState<MissionConfig>({
    target: "",
    category: "domain",
    customInstruction: "",
    stealthMode: true,
    aggressiveLevel: 1,
    modelName: "anthropic/claude-3.5-sonnet",
    numAgents: 3,
    stealthOptions: DEFAULT_STEALTH_OPTIONS,
    capabilities: DEFAULT_CAPABILITY_OPTIONS,
    osType: "linux",
  })
  const [customModelId, setCustomModelId] = useState("")
  const [testingApi, setTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [apiTestPassed, setApiTestPassed] = useState(false)

  useEffect(() => {
    let isMounted = true
    let isFirstCheck = true
    
    const checkHealth = async () => {
      if (!isMounted) return
      
      if (isFirstCheck) {
        setBackendStatus("checking")
        isFirstCheck = false
      }
      
      const isHealthy = await checkBackendHealth()
      if (isMounted) {
        setBackendStatus(isHealthy ? "online" : "offline")
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleStartMission = useCallback(async () => {
    if (config.target) {
      const finalConfig = {
        ...config,
        modelName: config.modelName === "custom" ? customModelId : config.modelName,
      }
      const agentIds = await startMission(finalConfig)
      if (agentIds) syncAgents(agentIds)
    }
  }, [config, customModelId, startMission, syncAgents])

  const handleTestApi = async () => {
    const isCustomModel = config.modelName === "custom"
    const modelId = isCustomModel ? customModelId : config.modelName
    
    if (!modelId || !modelId.trim()) {
      setApiTestResult({ success: false, message: isCustomModel ? "Please enter a custom model ID" : "Please select a model" })
      setApiTestPassed(false)
      return
    }
    
    setTestingApi(true)
    setApiTestResult(null)
    setApiTestPassed(false)
    try {
      const selectedModel = OPENROUTER_MODELS.find(m => m.id === config.modelName)
      const providerName = isCustomModel ? "custom" : (selectedModel?.provider || "OpenRouter")
      
      const response = await api.testModel({ 
        provider: providerName, 
        model: modelId 
      })
      
      if (response.error) {
        setApiTestResult({ success: false, message: String(response.error) })
        setApiTestPassed(false)
      } else if (response.data?.status === "error") {
        setApiTestResult({ success: false, message: response.data.message || "API test failed" })
        setApiTestPassed(false)
      } else {
        const latencyInfo = response.data?.latency ? ` (${response.data.latency})` : ""
        setApiTestResult({ success: true, message: `Connected to ${modelId}${latencyInfo}` })
        setApiTestPassed(true)
      }
    } catch {
      setApiTestResult({ success: false, message: "Failed to connect to API" })
      setApiTestPassed(false)
    } finally {
      setTestingApi(false)
    }
  }

  const updateStealthOption = (key: keyof StealthOptions, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      stealthOptions: { ...prev.stealthOptions, [key]: value }
    }))
  }

  const updateCapability = (key: keyof CapabilityOptions, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      capabilities: { ...prev.capabilities, [key]: value }
    }))
  }

  const selectAllStealth = (value: boolean) => {
    setConfig(prev => ({
      ...prev,
      stealthOptions: {
        proxyChain: value,
        torRouting: value,
        vpnChaining: value,
        macSpoofing: value,
        timestampSpoofing: value,
        logWiping: value,
        memoryScrambling: value,
        secureDelete: value,
      }
    }))
  }

  const selectAllCapabilities = (value: boolean) => {
    setConfig(prev => ({
      ...prev,
      capabilities: {
        packetInjection: value,
        arpSpoof: value,
        mitm: value,
        trafficHijack: value,
        realtimeManipulation: value,
        corsExploitation: value,
        ssrfChaining: value,
        deserializationExploit: value,
        wafBypass: value,
        bacTesting: value,
        websocketHijack: value,
      }
    }))
  }

  const isAllStealthSelected = Object.values(config.stealthOptions).every(v => v)
  const isAllCapabilitiesSelected = Object.values(config.capabilities).every(v => v)

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <img src="/performa-logo.png" alt="Performa" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Performa</h1>
            <p className="text-xs text-muted-foreground">Autonomous Security Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={backendStatus === "online" ? "default" : backendStatus === "offline" ? "destructive" : "secondary"}>
            {backendStatus === "online" ? "Online" : backendStatus === "offline" ? "Offline" : "Connecting..."}
          </Badge>
          {mission.active && (
            <>
              <MissionTimer 
                active={mission.active} 
                startTime={mission.startTime} 
                duration={mission.duration} 
              />
              <Button variant="destructive" size="sm" onClick={stopMission}>
                Stop Mission
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
        
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <ResourceMonitor />

          <div className="flex-1 flex gap-4 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Active Agents</CardTitle>
                    <Badge variant="secondary">{agents.length}/10</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAgent({
                        target: config.target,
                        category: config.category,
                        model_name: config.modelName,
                        stealth_mode: config.stealthMode,
                        aggressive_mode: config.aggressiveLevel > 2
                      })}
                      disabled={agents.length >= 10 || backendStatus !== "online"}
                      className="h-7 text-xs"
                    >
                      <Bot className="w-3 h-3 mr-1" />
                      Add Agent
                    </Button>
                    {agents.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => agents.forEach(a => removeAgent(a.id))}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-2">
                {agents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Bot className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">No agents deployed</p>
                    <p className="text-xs">Configure and start a mission or add agents manually</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAgent({
                        target: config.target,
                        category: config.category,
                        model_name: config.modelName
                      })}
                      disabled={backendStatus !== "online"}
                      className="mt-3"
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      Add First Agent
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 p-2">
                      {agents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onDetail={() => setSelectedAgent(agent)}
                          onPause={() => pauseAgent(agent.id)}
                          onResume={() => resumeAgent(agent.id)}
                          onRemove={() => removeAgent(agent.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="w-80 flex flex-col overflow-hidden shrink-0">
              <CardHeader className="py-3 px-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Findings</CardTitle>
                    <Badge variant="secondary">{findings.length}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportFindings}>
                        <FileJson className="w-4 h-4 mr-2" />JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportCsv}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportPdf}>
                        <FileDown className="w-4 h-4 mr-2" />PDF Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Badge className="bg-red-500/20 text-red-500 text-xs">Critical: {severitySummary.critical}</Badge>
                  <Badge className="bg-orange-500/20 text-orange-500 text-xs">High: {severitySummary.high}</Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">Medium: {severitySummary.medium}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-2">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-2">
                    {findings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No findings yet</p>
                      </div>
                    ) : (
                      findings.map((finding, index) => (
                        <FindingCard key={finding.id || `finding-${index}`} finding={finding} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="w-96 border-l border-border flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Mission Config</h2>
            </div>
            <Tabs value={configTab} onValueChange={setConfigTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8">
                <TabsTrigger value="target" className="text-xs">Target</TabsTrigger>
                <TabsTrigger value="mode" className="text-xs">Mode</TabsTrigger>
                <TabsTrigger value="stealth" className="text-xs">Stealth</TabsTrigger>
                <TabsTrigger value="caps" className="text-xs">Caps</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {configTab === "target" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Target</Label>
                    <Input
                      placeholder="example.com or /path/to/file"
                      value={config.target}
                      onChange={(e) => setConfig({ ...config, target: e.target.value })}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Category</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={config.category === "domain" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ ...config, category: "domain" })}
                        className="h-9"
                      >
                        <Globe className="w-4 h-4 mr-2" />URL/Domain
                      </Button>
                      <Button
                        variant={config.category === "path" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ ...config, category: "path" })}
                        className="h-9"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />Path (File)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">AI Model</Label>
                    <Select value={config.modelName} onValueChange={(v) => setConfig({ ...config, modelName: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              {m.name}
                              <Badge variant="outline" className="text-xs">{m.provider}</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(config.modelName === "custom" || config.modelName === "ollama") && (
                      <div className="space-y-2 mt-2 p-3 rounded-lg bg-muted/30 border border-border">
                        <Label className="text-xs font-medium">
                          {config.modelName === "ollama" ? "Ollama Model Name" : "Custom Model ID"}
                        </Label>
                        <Input
                          placeholder={config.modelName === "ollama" ? "llama3.2, codellama, mistral..." : "openai/gpt-4-turbo-preview"}
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                          className="h-9"
                        />
                        {config.modelName === "ollama" && (
                          <p className="text-xs text-muted-foreground">
                            Enter your locally installed Ollama model name
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTestApi} 
                        disabled={testingApi || ((config.modelName === "custom" || config.modelName === "ollama") && !customModelId.trim())} 
                        className="flex-1 h-8"
                      >
                        {testingApi ? "Testing..." : "Test API"}
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="h-8">
                        <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                    {apiTestResult && (
                      <div className={`text-xs p-2 rounded ${apiTestResult.success ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {apiTestResult.success ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                        {apiTestResult.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Agents</Label>
                      <Badge variant="secondary">{config.numAgents}</Badge>
                    </div>
                    <Slider
                      value={[config.numAgents]}
                      onValueChange={(v) => setConfig({ ...config, numAgents: v[0] })}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Custom Instructions</Label>
                    <Textarea
                      placeholder="Specific objectives, constraints..."
                      value={config.customInstruction}
                      onChange={(e) => setConfig({ ...config, customInstruction: e.target.value })}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </>
              )}

              {configTab === "mode" && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Stealth Mode</p>
                        <p className="text-xs text-muted-foreground">Evasive scanning</p>
                      </div>
                    </div>
                    <Switch
                      checked={config.stealthMode}
                      onCheckedChange={(v) => setConfig({ ...config, stealthMode: v })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Aggressive Level
                      </Label>
                      <Badge variant="secondary">{config.aggressiveLevel}</Badge>
                    </div>
                    <Slider
                      value={[config.aggressiveLevel]}
                      onValueChange={(v) => setConfig({ ...config, aggressiveLevel: v[0] })}
                      min={1}
                      max={5}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 - Minimal</span>
                      <span>5 - Maximum</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      Operating System
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the target OS for command execution
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={config.osType === "linux" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ ...config, osType: "linux" })}
                        className="h-10 gap-2"
                      >
                        <Terminal className="w-4 h-4" />
                        Linux
                      </Button>
                      <Button
                        variant={config.osType === "windows" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ ...config, osType: "windows" })}
                        className="h-10 gap-2"
                      >
                        <Monitor className="w-4 h-4" />
                        Windows
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {config.osType === "linux" 
                        ? "Commands will execute via Bash shell" 
                        : "Commands will execute via PowerShell"}
                    </p>
                  </div>
                </>
              )}

              {configTab === "stealth" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">Advanced stealth capabilities</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectAllStealth(!isAllStealthSelected)}
                      className="h-6 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {isAllStealthSelected ? "Unselect All" : "Select All"}
                    </Button>
                  </div>
                  <StealthToggle label="ProxyChain" desc="Multi-hop proxy routing" checked={config.stealthOptions.proxyChain} onChange={(v) => updateStealthOption("proxyChain", v)} />
                  <StealthToggle label="Tor Routing" desc="Onion network routing" checked={config.stealthOptions.torRouting} onChange={(v) => updateStealthOption("torRouting", v)} />
                  <StealthToggle label="VPN Chaining" desc="Multi-VPN tunneling" checked={config.stealthOptions.vpnChaining} onChange={(v) => updateStealthOption("vpnChaining", v)} />
                  <StealthToggle label="MAC Spoofing" desc="Hardware address masking" checked={config.stealthOptions.macSpoofing} onChange={(v) => updateStealthOption("macSpoofing", v)} />
                  <StealthToggle label="Timestamp Spoofing" desc="Time manipulation" checked={config.stealthOptions.timestampSpoofing} onChange={(v) => updateStealthOption("timestampSpoofing", v)} />
                  <StealthToggle label="Log Wiping" desc="Evidence removal" checked={config.stealthOptions.logWiping} onChange={(v) => updateStealthOption("logWiping", v)} />
                  <StealthToggle label="Memory Scrambling" desc="RAM obfuscation" checked={config.stealthOptions.memoryScrambling} onChange={(v) => updateStealthOption("memoryScrambling", v)} />
                  <StealthToggle label="Secure Delete" desc="7-pass overwrite" checked={config.stealthOptions.secureDelete} onChange={(v) => updateStealthOption("secureDelete", v)} />
                </div>
              )}

              {configTab === "caps" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">Agent capabilities</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectAllCapabilities(!isAllCapabilitiesSelected)}
                      className="h-6 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {isAllCapabilitiesSelected ? "Unselect All" : "Select All"}
                    </Button>
                  </div>
                  <CapToggle label="Packet Injection" checked={config.capabilities.packetInjection} onChange={(v) => updateCapability("packetInjection", v)} />
                  <CapToggle label="ARP Spoof" checked={config.capabilities.arpSpoof} onChange={(v) => updateCapability("arpSpoof", v)} />
                  <CapToggle label="MITM Attack" checked={config.capabilities.mitm} onChange={(v) => updateCapability("mitm", v)} />
                  <CapToggle label="Traffic Hijack" checked={config.capabilities.trafficHijack} onChange={(v) => updateCapability("trafficHijack", v)} />
                  <CapToggle label="Realtime Manipulation" checked={config.capabilities.realtimeManipulation} onChange={(v) => updateCapability("realtimeManipulation", v)} />
                  <CapToggle label="CORS Exploitation" checked={config.capabilities.corsExploitation} onChange={(v) => updateCapability("corsExploitation", v)} />
                  <CapToggle label="SSRF Chaining" checked={config.capabilities.ssrfChaining} onChange={(v) => updateCapability("ssrfChaining", v)} />
                  <CapToggle label="Deserialization Exploit" checked={config.capabilities.deserializationExploit} onChange={(v) => updateCapability("deserializationExploit", v)} />
                  <CapToggle label="WAF Bypass" checked={config.capabilities.wafBypass} onChange={(v) => updateCapability("wafBypass", v)} />
                  <CapToggle label="BAC Testing" checked={config.capabilities.bacTesting} onChange={(v) => updateCapability("bacTesting", v)} />
                  <CapToggle label="WebSocket Hijack" checked={config.capabilities.websocketHijack} onChange={(v) => updateCapability("websocketHijack", v)} />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border shrink-0 space-y-2">
            {!apiTestPassed && config.target.trim() && (
              <p className="text-xs text-yellow-500 text-center">Test API first before starting mission</p>
            )}
            {!config.target.trim() && (
              <p className="text-xs text-muted-foreground text-center">Enter a target to start mission</p>
            )}
            {backendStatus !== "online" && (
              <p className="text-xs text-red-500 text-center">Waiting for backend connection...</p>
            )}
            <Button
              onClick={handleStartMission}
              disabled={!config.target.trim() || mission.active || backendStatus !== "online"}
              className="w-full gap-2"
            >
              <Play className="w-4 h-4" />
              {mission.active ? "Mission Running..." : "Start Mission"}
            </Button>
          </div>
        </div>
      </div>


      <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  )
}


function formatExecutionTime(timeStr: string | undefined): string {
  if (!timeStr) return "00:00"
  const parts = timeStr.split(':').map(p => {
    const num = parseInt(p, 10)
    return isNaN(num) ? 0 : num
  })
  if (parts.length === 3) {
    const totalMins = parts[0] * 60 + parts[1]
    return `${totalMins.toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`
  } else if (parts.length === 2) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`
  }
  return "00:00"
}

function AgentDetailModal({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  const [cpuHistory, setCpuHistory] = useState<{value: number, time: string}[]>([])
  const [memHistory, setMemHistory] = useState<{value: number, time: string}[]>([])
  const [displayTime, setDisplayTime] = useState(formatExecutionTime(agent?.executionTime))

  useEffect(() => {
    if (!agent) return
    
    const generateData = () => {
      const now = new Date()
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      
      setCpuHistory(prev => {
        const newData = [...prev, { value: Math.max(0, Math.min(100, agent.cpuUsage + Math.random() * 10 - 5)), time }]
        return newData.slice(-20)
      })
      
      setMemHistory(prev => {
        const newData = [...prev, { value: Math.max(0, agent.memoryUsage + Math.random() * 20 - 10), time }]
        return newData.slice(-20)
      })
    }

    generateData()
    const interval = setInterval(generateData, 2000)
    return () => clearInterval(interval)
  }, [agent])

  useEffect(() => {
    if (agent) setDisplayTime(formatExecutionTime(agent.executionTime))
  }, [agent?.executionTime])

  useEffect(() => {
    if (!agent || agent.status !== "running") return
    
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      return 0
    }
    
    const formatSeconds = (totalSeconds: number): string => {
      const mins = Math.floor(totalSeconds / 60)
      const secs = Math.floor(totalSeconds % 60)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    let baseSeconds = parseTime(formatExecutionTime(agent.executionTime))
    const interval = setInterval(() => {
      baseSeconds += 1
      setDisplayTime(formatSeconds(baseSeconds))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [agent?.status, agent?.executionTime])

  const getCpuColor = (value: number) => {
    if (value >= 80) return "text-red-500"
    if (value >= 60) return "text-yellow-500"
    return "text-emerald-500"
  }

  if (!agent) return null

  return (
    <Dialog open={!!agent} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Agent-{agent.displayId || agent.id} Details
            <Badge variant={agent.status === "running" ? "default" : agent.status === "paused" ? "secondary" : "outline"} className="ml-2 capitalize">
              {agent.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Execution Time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-primary">{displayTime}</span>
                {agent.status === "running" && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CPU Usage</span>
              </div>
              <span className={`text-lg font-mono font-semibold ${getCpuColor(agent.cpuUsage)}`}>{agent.cpuUsage}%</span>
              <Progress value={agent.cpuUsage} className="h-1.5 mt-1" />
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <MemoryStick className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Memory</span>
              </div>
              <span className="text-lg font-mono font-semibold text-blue-500">{agent.memoryUsage}MB</span>
              <Progress value={Math.min(agent.memoryUsage / 5, 100)} className="h-1.5 mt-1" />
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Progress</span>
              </div>
              <span className="text-lg font-mono font-semibold text-emerald-500">{agent.progress}%</span>
              <Progress value={agent.progress} className="h-1.5 mt-1" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/80 font-mono text-sm text-green-400 border border-green-900/30">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Last Command</span>
            </div>
            <p className="text-sm">{agent.lastCommand || "Waiting for command..."}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                CPU Usage History
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory}>
                    <defs>
                      <linearGradient id="modalCpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#modalCpuGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-emerald-500" />
                Memory Usage History
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memHistory}>
                    <defs>
                      <linearGradient id="modalMemGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}MB`, 'Memory']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#modalMemGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AgentCard({ agent, onDetail, onPause, onResume, onRemove }: { agent: Agent; onDetail: () => void; onPause: () => void; onResume: () => void; onRemove: () => void }) {
  const [displayTime, setDisplayTime] = useState(formatExecutionTime(agent.executionTime))
  
  useEffect(() => {
    setDisplayTime(formatExecutionTime(agent.executionTime))
  }, [agent.executionTime])

  useEffect(() => {
    if (agent.status !== "running") return
    
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      return 0
    }
    
    const formatSeconds = (totalSeconds: number): string => {
      const mins = Math.floor(totalSeconds / 60)
      const secs = Math.floor(totalSeconds % 60)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    let baseSeconds = parseTime(formatExecutionTime(agent.executionTime))
    const interval = setInterval(() => {
      baseSeconds += 1
      setDisplayTime(formatSeconds(baseSeconds))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [agent.status, agent.executionTime])

  const statusColors = {
    idle: "border-muted-foreground/20",
    running: "border-emerald-500/50 bg-emerald-500/5",
    paused: "border-yellow-500/50 bg-yellow-500/5",
    error: "border-red-500/50 bg-red-500/5",
  }

  const statusDot = {
    idle: "bg-muted-foreground",
    running: "bg-emerald-500",
    paused: "bg-yellow-500",
    error: "bg-red-500",
  }

  return (
    <div className={`p-3 rounded-lg border ${statusColors[agent.status]} transition-all hover:shadow-md cursor-pointer group`} onClick={onDetail}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${agent.status === "running" ? "bg-primary/10" : "bg-muted"}`}>
              <Bot className={`w-4 h-4 ${agent.status === "running" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${statusDot[agent.status]}`} />
          </div>
          <div>
            <span className="font-semibold text-sm">Agent-{agent.displayId || agent.id.slice(0,4)}</span>
            <p className="text-[10px] text-muted-foreground capitalize">{agent.status}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDetail(); }}>
              <Eye className="w-3 h-3 mr-2" />View Details
            </DropdownMenuItem>
            {agent.status === "running" ? (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPause(); }}><Pause className="w-3 h-3 mr-2" />Pause</DropdownMenuItem>
            ) : agent.status === "paused" ? (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResume(); }}><Play className="w-3 h-3 mr-2" />Resume</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-destructive">
              <Trash2 className="w-3 h-3 mr-2" />Terminate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="p-2 rounded-md bg-black/80 font-mono text-[10px] text-green-400 truncate mb-3 border border-green-900/30">
        <Terminal className="w-3 h-3 inline mr-1.5 opacity-60" />
        {agent.lastCommand || "Waiting for command..."}
      </div>
      
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Execution Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-mono font-bold text-primary">{displayTime}</span>
          {agent.status === "running" && (
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="text-[10px] text-muted-foreground">Click for CPU/Memory details</span>
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [showDetails, setShowDetails] = useState(false)
  
  const colors = {
    critical: "border-l-red-500 bg-red-500/5",
    high: "border-l-orange-500 bg-orange-500/5",
    medium: "border-l-yellow-500 bg-yellow-500/5",
    low: "border-l-blue-500 bg-blue-500/5",
    info: "border-l-gray-500 bg-gray-500/5",
  }

  const badgeColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    info: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  return (
    <>
      <div 
        className={`p-3 rounded-lg border-l-2 ${colors[finding.severity]} hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50`}
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] capitalize ${badgeColors[finding.severity]}`}>
              {finding.severity}
            </Badge>
            {finding.cvss && (
              <span className="text-[10px] font-mono text-muted-foreground">
                CVSS: {finding.cvss.toFixed(1)}
              </span>
            )}
          </div>
          {finding.cve && (
            <Badge variant="secondary" className="text-[9px] font-mono h-4 px-1.5">{finding.cve}</Badge>
          )}
        </div>
        <p className="text-xs font-medium leading-tight mb-1">{finding.title}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{finding.description}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
          <span className="text-[9px] text-muted-foreground">Agent {finding.agentId}</span>
          <span className="text-[9px] text-muted-foreground">{finding.timestamp}</span>
        </div>
      </div>
      
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                finding.severity === 'critical' ? 'text-red-500' :
                finding.severity === 'high' ? 'text-orange-500' :
                finding.severity === 'medium' ? 'text-yellow-500' :
                finding.severity === 'low' ? 'text-blue-500' : 'text-gray-500'
              }`} />
              Security Finding Report
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={badgeColors[finding.severity]}>
                {finding.severity.toUpperCase()}
              </Badge>
              {finding.cvss && (
                <Badge variant="outline" className="font-mono">
                  CVSS: {finding.cvss.toFixed(1)}
                </Badge>
              )}
              {finding.cve && (
                <Badge variant="secondary" className="font-mono">{finding.cve}</Badge>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-1">{finding.title}</h4>
              <p className="text-sm text-muted-foreground">{finding.description}</p>
            </div>
            
            {finding.details && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <h5 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Technical Details</h5>
                <p className="text-sm font-mono whitespace-pre-wrap">{finding.details}</p>
              </div>
            )}
            
            {finding.remediation && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h5 className="text-xs font-semibold mb-2 text-primary uppercase">Remediation</h5>
                <p className="text-sm">{finding.remediation}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Discovered by Agent {finding.agentId}</span>
              <span>{finding.timestamp}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StealthToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function CapToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <p className="text-xs font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ChatSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [input, setInput] = useState("")
  const [sidebarTab, setSidebarTab] = useState<"chat" | "queue" | "history">("chat")
  const [queueState, setQueueState] = useState<{pending: any[], executing: any[], total_pending: number, total_executing: number}>({pending: [], executing: [], total_pending: 0, total_executing: 0})
  const { messages, sendMessage, sendQueueCommand, mode, setMode, connected } = useChat()
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    if (lastMessage?.type === "queue_update" && lastMessage.queue) {
      const q = lastMessage.queue as any
      if (q.pending !== undefined) {
        setQueueState(q)
      }
    }
  }, [lastMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    if (input.startsWith("/queue")) {
      sendQueueCommand(input)
    } else if (input.startsWith("/chat")) {
      setMode("chat")
    } else {
      sendMessage(input, mode)
    }
    setInput("")
  }

  const handleTabChange = (tab: "chat" | "queue" | "history") => {
    setSidebarTab(tab)
    if (tab === "chat") setMode("chat")
    if (tab === "queue") setMode("queue")
  }

  return (
    <div className={`h-full border-r border-border flex flex-col transition-all duration-300 ${open ? "w-80 min-w-[320px] max-w-[380px]" : "w-12"}`}>
      <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className="h-8 w-8"
        >
          {open ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        </Button>
        {open && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {sidebarTab === "history" ? "History" : sidebarTab === "queue" ? "Queue" : "Chat"}
            </span>
            {connected ? (
              <Badge variant="default" className="text-xs shrink-0">Online</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs shrink-0">Offline</Badge>
            )}
          </div>
        )}
      </div>

      {open ? (
        <>
          <div className="px-1.5 py-1 border-b border-border flex gap-0.5 shrink-0">
            <Button
              variant={sidebarTab === "chat" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("chat")}
              className="h-7 text-xs flex-1 gap-1 px-2"
            >
              <MessageSquare className="w-3 h-3" />
              Chat
            </Button>
            <Button
              variant={sidebarTab === "queue" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("queue")}
              className="h-7 text-xs flex-1 gap-1 px-2"
            >
              <ListOrdered className="w-3 h-3" />
              Queue
              {queueState.total_pending > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{queueState.total_pending}</Badge>
              )}
            </Button>
            <Button
              variant={sidebarTab === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("history")}
              className="h-7 text-xs flex-1 gap-1 px-2"
            >
              <Brain className="w-3 h-3" />
              History
            </Button>
          </div>

          {sidebarTab === "history" ? (
            <div className="flex-1 min-h-0">
              <ModelInstructions />
            </div>
          ) : sidebarTab === "queue" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Shared Queue</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">Pending: {queueState.total_pending}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Running: {queueState.total_executing}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] flex-1"
                  onClick={() => sendQueueCommand("/queue list")}
                >
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] flex-1"
                  onClick={() => sendQueueCommand("/queue clear")}
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {queueState.executing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-yellow-500 mb-1">Executing</p>
                    {queueState.executing.map((inst: any) => (
                      <div key={inst.id} className="p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[9px] h-4">#{inst.id}</Badge>
                          <span className="text-[9px] text-muted-foreground">{inst.claimed_by?.slice(0, 8) || "agent"}</span>
                        </div>
                        <p className="text-[10px] font-mono text-yellow-500 truncate">{inst.command}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {queueState.pending.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Pending ({queueState.pending.length})</p>
                    {queueState.pending.map((inst: any, idx: number) => (
                      <div key={inst.id} className="p-2 rounded-md bg-muted/30 border border-border mb-1 group">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[9px] h-4">#{inst.id}</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 opacity-0 group-hover:opacity-100"
                            onClick={() => sendQueueCommand(`/queue rm ${inst.id}`)}
                          >
                            <Trash2 className="w-2.5 h-2.5 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{inst.command}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {queueState.pending.length === 0 && queueState.executing.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Queue is empty</p>
                    <p className="text-[10px]">Commands will appear here when the AI predicts them</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-2 border-t border-border shrink-0">
              <p className="text-[10px] text-muted-foreground mb-1">Add Command</p>
              <div className="flex gap-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='{"1": "RUN nmap..."}'
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { sendQueueCommand(`/queue add ${input}`); setInput(""); } }}
                />
                <Button 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={() => { sendQueueCommand(`/queue add ${input}`); setInput(""); }}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          ) : (
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a conversation</p>
                <div className="mt-4 text-left text-xs space-y-1">
                  <p className="text-muted-foreground">Chat with the AI assistant to get help with security analysis</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary/20" : "bg-muted"}`}>
                      {msg.role === "user" ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] opacity-70 mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          )}

          {sidebarTab === "chat" && (
          <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-9"
              />
              <Button type="submit" size="icon" disabled={!connected} className="h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            title="Open Chat"
          >
            <Terminal className="w-4 h-4" />
          </Button>
          {connected && (
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
          )}
        </div>
      )}
    </div>
  )
}
