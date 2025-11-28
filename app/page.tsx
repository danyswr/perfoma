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
  RefreshCw, Send, User, ListOrdered, PanelLeft
} from "lucide-react"
import { ResourceMonitor } from "@/components/dashboard/resource-monitor"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMission } from "@/hooks/use-mission"
import { useAgents } from "@/hooks/use-agents"
import { useResources } from "@/hooks/use-resources"
import { useFindings } from "@/hooks/use-findings"
import { useChat } from "@/hooks/use-chat"
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
  const { findings, severitySummary, exportFindings, exportHtmlReport } = useFindings()
  
  const [config, setConfig] = useState<MissionConfig>({
    target: "",
    category: "domain",
    customInstruction: "",
    stealthMode: true,
    aggressiveLevel: 1,
    modelName: "openai/gpt-4-turbo",
    numAgents: 3,
    stealthOptions: DEFAULT_STEALTH_OPTIONS,
    capabilities: DEFAULT_CAPABILITY_OPTIONS,
  })
  const [customModelId, setCustomModelId] = useState("")
  const [testingApi, setTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [apiTestPassed, setApiTestPassed] = useState(false)

  useEffect(() => {
    let isMounted = true
    const checkHealth = async () => {
      if (!isMounted) return
      setBackendStatus("checking")
      const isHealthy = await checkBackendHealth()
      if (isMounted) {
        setBackendStatus(isHealthy ? "online" : "offline")
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 5000)
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
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
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
            <Button variant="destructive" size="sm" onClick={stopMission}>
              Stop Mission
            </Button>
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
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-2">
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
                      <DropdownMenuItem onClick={exportHtmlReport}>
                        <FileText className="w-4 h-4 mr-2" />HTML Report
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
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
                      findings.map((finding) => (
                        <FindingCard key={finding.id} finding={finding} />
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
                        <SelectItem value="custom">Custom Model</SelectItem>
                      </SelectContent>
                    </Select>
                    {config.modelName === "custom" && (
                      <Input
                        placeholder="openai/gpt-4-turbo-preview"
                        value={customModelId}
                        onChange={(e) => setCustomModelId(e.target.value)}
                        className="h-9 mt-2"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTestApi} 
                        disabled={testingApi || (config.modelName === "custom" && !customModelId.trim())} 
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


      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Agent-{selectedAgent?.displayId || selectedAgent?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedAgent.status}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="font-medium">{selectedAgent.progress}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">CPU Usage</p>
                  <p className="font-medium">{selectedAgent.cpuUsage}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Memory</p>
                  <p className="font-medium">{selectedAgent.memoryUsage}MB</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-black/80 font-mono text-sm text-green-400">
                <p className="text-xs text-muted-foreground mb-1">Last Command</p>
                {selectedAgent.lastCommand}
              </div>
              <Progress value={selectedAgent.progress} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


function AgentCard({ agent, onDetail, onPause, onResume, onRemove }: { agent: Agent; onDetail: () => void; onPause: () => void; onResume: () => void; onRemove: () => void }) {
  const statusColors = {
    idle: "border-muted-foreground/20",
    running: "border-emerald-500/50 bg-emerald-500/5",
    paused: "border-yellow-500/50 bg-yellow-500/5",
    error: "border-red-500/50 bg-red-500/5",
  }

  return (
    <div className={`p-2 rounded-lg border ${statusColors[agent.status]} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-primary" />
          <span className="font-semibold text-xs">Agent-{agent.displayId || agent.id.slice(0,4)}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDetail}>
              <Eye className="w-3 h-3 mr-2" />Detail
            </DropdownMenuItem>
            {agent.status === "running" ? (
              <DropdownMenuItem onClick={onPause}><Pause className="w-3 h-3 mr-2" />Pause</DropdownMenuItem>
            ) : agent.status === "paused" ? (
              <DropdownMenuItem onClick={onResume}><Play className="w-3 h-3 mr-2" />Resume</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <Trash2 className="w-3 h-3 mr-2" />Terminate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-1 rounded bg-black/60 font-mono text-[9px] text-green-400 truncate mb-1">
        {agent.lastCommand || "Waiting..."}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{agent.status}</span>
        <span>{agent.progress}%</span>
      </div>
      <Progress value={agent.progress} className="h-1 mt-1" />
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const colors = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
    info: "border-l-gray-500",
  }

  return (
    <div className={`p-2 rounded-lg bg-muted/30 border-l-2 ${colors[finding.severity]} hover:bg-muted/50 transition-colors cursor-pointer`}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-xs capitalize">{finding.severity}</Badge>
        {finding.cve && <Badge variant="secondary" className="text-xs font-mono">{finding.cve}</Badge>}
      </div>
      <p className="text-xs font-medium truncate">{finding.title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{finding.description}</p>
    </div>
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
  const { messages, sendMessage, sendQueueCommand, mode, setMode, connected } = useChat()

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

  return (
    <div className={`h-full border-r border-border flex flex-col transition-all duration-300 ${open ? "w-80" : "w-12"}`}>
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
            <span className="font-semibold text-sm">Live Chat</span>
            {connected ? (
              <Badge variant="default" className="text-xs">Online</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Offline</Badge>
            )}
          </div>
        )}
      </div>

      {open ? (
        <>
          <div className="px-2 py-1 border-b border-border flex gap-1 shrink-0">
            <Button
              variant={mode === "chat" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("chat")}
              className="h-7 text-xs flex-1"
            >
              Chat
            </Button>
            <Button
              variant={mode === "queue" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("queue")}
              className="h-7 text-xs flex-1"
            >
              Queue
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a conversation</p>
                <div className="mt-4 text-left text-xs space-y-1">
                  <p><code className="bg-muted px-1 rounded">/chat</code> - Chat mode</p>
                  <p><code className="bg-muted px-1 rounded">/queue list</code> - View queue</p>
                  <p><code className="bg-muted px-1 rounded">/queue add</code> - Add command</p>
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

          <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "chat" ? "Type a message..." : "/queue command..."}
                className="flex-1 h-9"
              />
              <Button type="submit" size="icon" disabled={!connected} className="h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
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
