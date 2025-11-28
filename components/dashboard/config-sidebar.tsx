"use client"

import React, { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Target,
  Shield,
  Zap,
  Play,
  Globe,
  Server,
  Route,
  Sparkles,
  ExternalLink,
  TentIcon as TestIcon,
  Check,
  X,
  AlertCircle,
  Loader2
} from "lucide-react"
import { api } from "@/lib/api"

export interface MissionConfig {
  target: string
  category: "ip" | "domain" | "path"
  customInstruction: string
  stealthMode: boolean
  aggressiveMode: boolean
  modelName: string
  numAgents: number
}

interface ConfigSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartMission: (config: MissionConfig) => void
  missionActive: boolean
}

const MODELS = [
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenRouter" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenRouter" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "OpenRouter" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "OpenRouter" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "OpenRouter" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "OpenRouter" },
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "OpenRouter" },
  { id: "custom", name: "Custom Model", provider: "OpenRouter" },
]

const CATEGORIES = [
  { id: "ip", name: "IP Address", icon: Server },
  { id: "domain", name: "URL/Domain", icon: Globe },
  { id: "path", name: "Path", icon: Route },
]

function parseApiError(error: any): string {
  if (!error) return "Unknown error occurred"
  if (typeof error === "string") return error
  if (typeof error === "object") {
    if (error.msg) return error.msg
    if (error.detail) {
      if (Array.isArray(error.detail)) {
        const firstError = error.detail[0]
        return `${firstError.loc?.[1] || 'Field'}: ${firstError.msg}`
      }
      return String(error.detail)
    }
    return JSON.stringify(error)
  }
  return String(error)
}

export function ConfigSidebar({ open, onOpenChange, onStartMission, missionActive }: ConfigSidebarProps) {
  const [config, setConfig] = useState<MissionConfig>({
    target: "",
    category: "domain",
    customInstruction: "",
    stealthMode: true,
    aggressiveMode: false,
    modelName: "openai/gpt-4-turbo",
    numAgents: 3,
  })
  const [customModelId, setCustomModelId] = useState("")
  const [testingModel, setTestingModel] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // Local loading state
  const [isStarting, setIsStarting] = useState(false)

  // --- VALIDATION LOGIC ---
  const isCustomModel = config.modelName === "custom"
  const isValidModel = !isCustomModel || (customModelId && customModelId.trim().length > 0)
  const canStart = isValidModel && !missionActive && !isStarting

  // 🔥 DEBUGGING: Tampilkan nilai penting di console
  useEffect(() => {
    console.log("🚀 [ConfigSidebar] Rendered with:", {
      missionActive,
      isStarting,
      isValidModel,
      canStart,
      selectedModel: config.modelName,
      customModelId: isCustomModel ? customModelId : "N/A",
    })
  }, [missionActive, isStarting, isValidModel, canStart, config.modelName, customModelId])

  // Tentukan teks tombol
  let statusMessage = "Start Mission"
  if (missionActive) statusMessage = "Mission in Progress..."
  else if (isStarting) statusMessage = "Initializing..."
  else if (!isValidModel) statusMessage = "Enter Custom Model ID"

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    console.log("🚀 [ConfigSidebar] handleStart triggered. canStart =", canStart)

    if (canStart) {
      setIsStarting(true)

      const finalConfig = {
        ...config,
        target: config.target.trim(),
        modelName: config.modelName === "custom" ? customModelId.trim() : config.modelName,
      }

      try {
        console.log("✅ [ConfigSidebar] Calling onStartMission with config:", finalConfig)
        onStartMission(finalConfig)
        onOpenChange(false) // Tutup sidebar setelah start
      } catch (error) {
        console.error("❌ [ConfigSidebar] Error in onStartMission:", error)
        // Tetap reset isStarting agar tombol bisa diklik lagi
      } finally {
        console.log("🔄 [ConfigSidebar] Resetting isStarting to false")
        setIsStarting(false)
      }
    } else {
      console.warn("⚠️ [ConfigSidebar] Start blocked. Reasons:", {
        isValidModel,
        missionActive,
        isStarting
      })
    }
  }

  const handleTestModel = async () => {
    setTestingModel(true)
    setTestResult(null)
    
    try {
      const modelId = config.modelName === "custom" ? customModelId : config.modelName
      const selectedModel = MODELS.find(m => m.id === config.modelName)
      const providerName = selectedModel ? selectedModel.provider : "OpenRouter"

      console.log(`🧪 Testing model: ${modelId} via provider: ${providerName}`)

      const response = await api.testModel({
        provider: providerName,
        model: modelId
      })

      if (response.error) {
        const errorMessage = parseApiError(response.error)
        setTestResult({ success: false, message: errorMessage })
      } else if (response.data?.status === "error") {
        setTestResult({ success: false, message: response.data.message })
      } else {
        const latencyInfo = response.data?.latency ? ` (${response.data.latency})` : ""
        setTestResult({ success: true, message: `Connected to ${modelId}${latencyInfo}` })
      }
    } catch (e) {
      console.error("🧪 [ConfigSidebar] Test API Error:", e)
      setTestResult({ success: false, message: "Failed to connect to backend API" })
    } finally {
      setTestingModel(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 bg-sidebar border-sidebar-border">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 pb-6">
              <SheetTitle className="flex items-center gap-3 text-sidebar-foreground text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                Mission Configuration
              </SheetTitle>
              <SheetDescription className="text-sidebar-foreground/70 text-sm">
                Configure target and agent parameters for your security assessment.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleStart} className="space-y-8">
              
              {/* Target Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-sidebar-foreground">Target</Label>
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Enter IP, domain, or path (Optional)..."
                    value={config.target}
                    onChange={(e) => setConfig({ ...config, target: e.target.value })}
                    className={`h-11 bg-sidebar-accent border-sidebar-border focus:border-primary pr-10 ${
                      config.target && config.target.trim().length > 0 ? "border-primary/50" : ""
                    }`}
                  />
                  {config.target && config.target.trim().length > 0 && (
                    <div className="absolute right-3 top-3 text-emerald-500">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-sidebar-foreground">Category</Label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      type="button" 
                      variant={config.category === cat.id ? "default" : "outline"}
                      className={`h-auto py-4 flex-col gap-2 transition-all ${
                        config.category === cat.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-sidebar-accent border-sidebar-border hover:bg-sidebar-accent/80 hover:border-primary/50"
                      }`}
                      onClick={() => setConfig({ ...config, category: cat.id as any })}
                    >
                      <cat.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{cat.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Instruction */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-sidebar-foreground">Custom Instruction</Label>
                <Textarea
                  placeholder="Describe your assessment objectives, specific areas to focus on, or any constraints..."
                  value={config.customInstruction}
                  onChange={(e) => setConfig({ ...config, customInstruction: e.target.value })}
                  className="min-h-[120px] bg-sidebar-accent border-sidebar-border resize-none focus:border-primary"
                />
              </div>

              <Separator className="bg-sidebar-border/50" />

              {/* Operation Mode */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-sidebar-foreground">Operation Mode</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-sidebar-accent border border-sidebar-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-sidebar-foreground">Stealth Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Evasive scanning with delays</p>
                      </div>
                    </div>
                    <Switch
                      checked={config.stealthMode}
                      onCheckedChange={(checked) => setConfig({ ...config, stealthMode: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-sidebar-accent border border-sidebar-border hover:border-chart-3/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-chart-3/10">
                        <Zap className="w-4 h-4 text-chart-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-sidebar-foreground">Aggressive Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Fast, thorough scanning</p>
                      </div>
                    </div>
                    <Switch
                      checked={config.aggressiveMode}
                      onCheckedChange={(checked) => setConfig({ ...config, aggressiveMode: checked })}
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-sidebar-border/50" />

              {/* Model Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-sidebar-foreground">AI Model</Label>
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Browse Models
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Select value={config.modelName} onValueChange={(value) => setConfig({ ...config, modelName: value })}>
                  <SelectTrigger className="h-11 bg-sidebar-accent border-sidebar-border">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border">
                    {MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{model.name}</span>
                          <Badge variant="outline" className="text-xs bg-sidebar-accent">
                            {model.provider}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isCustomModel && (
                  <div className="space-y-3 p-4 rounded-xl bg-sidebar-accent/50 border border-dashed border-primary/30">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium text-sidebar-foreground">Custom Model ID</Label>
                    </div>
                    <Input
                      placeholder="e.g., openai/gpt-4-turbo-preview"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      className="h-11 bg-sidebar border-sidebar-border focus:border-primary"
                    />
                  </div>
                )}

                <Button
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={handleTestModel}
                  disabled={testingModel || (!isCustomModel && !config.modelName) || (isCustomModel && !customModelId)}
                  className="w-full gap-2 border-primary/30 hover:bg-primary/5 bg-transparent"
                >
                  <TestIcon className="w-3.5 h-3.5" />
                  {testingModel ? "Testing..." : "Test API"}
                </Button>

                {testResult && (
                  <Alert
                    className={
                      testResult.success
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-destructive/50 bg-destructive/5"
                    }
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-destructive mt-0.5" />
                      )}
                      <AlertDescription
                        className={testResult.success ? "text-emerald-500 text-sm" : "text-destructive text-sm"}
                      >
                        {testResult.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>

              {/* Agent Count */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-sidebar-foreground">Number of Agents</Label>
                  <Badge variant="secondary" className="font-mono text-sm px-3 py-1 bg-primary/10 text-primary">
                    {config.numAgents}
                  </Badge>
                </div>
                <div className="px-1">
                  <Slider
                    value={[config.numAgents]}
                    onValueChange={(values) => setConfig({ ...config, numAgents: values[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="py-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>1 Agent (Minimal)</span>
                  <span>10 Agents (Maximum)</span>
                </div>
              </div>

              <Separator className="bg-sidebar-border/50" />

              {/* Start Button */}
              <div className="pt-2 pb-4">
                <Button
                  type="submit" 
                  disabled={!canStart}
                  className="w-full gap-3 h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting || missionActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {statusMessage}
                </Button>
                
                {!canStart && isCustomModel && !customModelId.trim() && (
                  <p className="text-xs text-destructive mt-2 text-center animate-pulse">
                    Please enter a custom model ID
                  </p>
                )}
              </div>
            </form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}