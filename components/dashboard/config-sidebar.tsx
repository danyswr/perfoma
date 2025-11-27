"use client"

import React, { useState } from "react"
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
} from "lucide-react"
import { api } from "@/lib/api"
import type { MissionConfig } from "@/lib/types"

interface ConfigSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartMission: (config: MissionConfig) => void
  missionActive: boolean
}

const MODELS = [
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral" },
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "Meta" },
  { id: "custom", name: "Custom Model", provider: "OpenRouter" },
]

const CATEGORIES = [
  { id: "ip", name: "IP Address", icon: Server },
  { id: "domain", name: "URL/Domain", icon: Globe },
  { id: "path", name: "Path", icon: Route },
]

// Helper function untuk menangani error object dari API dengan aman
function parseApiError(error: any): string {
  if (!error) return "Unknown error occurred"
  if (typeof error === "string") return error
  
  if (typeof error === "object") {
    // Cek format error umum dari Pydantic/FastAPI
    if (error.msg) return error.msg
    if (error.detail) {
      if (Array.isArray(error.detail)) {
        // Jika detail array (seperti error validasi field), ambil pesan pertama
        // Contoh: Field required: provider
        const firstError = error.detail[0]
        return `${firstError.loc?.[1] || 'Field'}: ${firstError.msg}`
      }
      return String(error.detail)
    }
    // Fallback: ubah objek jadi string JSON
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

  const handleStart = () => {
    if (config.target) {
      const finalConfig = {
        ...config,
        modelName: config.modelName === "custom" ? customModelId : config.modelName,
      }
      onStartMission(finalConfig)
      onOpenChange(false)
    }
  }

  const handleTestModel = async () => {
    setTestingModel(true)
    setTestResult(null)
    
    try {
      const modelId = config.modelName === "custom" ? customModelId : config.modelName
      const selectedModel = MODELS.find(m => m.id === config.modelName)
      const providerName = selectedModel ? selectedModel.provider : "OpenRouter"

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
      console.error("Test API Error:", e)
      setTestResult({ success: false, message: "Failed to connect to backend API" })
    } finally {
      setTestingModel(false)
    }
  }

  const isCustomModel = config.modelName === "custom"
  const canStart = config.target && (!isCustomModel || customModelId.trim())

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

            <div className="space-y-8">
              {/* Target Input */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-sidebar-foreground">Target</Label>
                <Input
                  placeholder="Enter IP, domain, or path..."
                  value={config.target}
                  onChange={(e) => setConfig({ ...config, target: e.target.value })}
                  className="h-11 bg-sidebar-accent border-sidebar-border focus:border-primary"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-sidebar-foreground">Category</Label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={config.category === cat.id ? "default" : "outline"}
                      className={`h-auto py-4 flex-col gap-2 transition-all ${
                        config.category === cat.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-sidebar-accent border-sidebar-border hover:bg-sidebar-accent/80 hover:border-primary/50"
                      }`}
                      onClick={() => setConfig({ ...config, category: cat.id })}
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
                    <p className="text-xs text-muted-foreground">
                      Enter the model ID from OpenRouter. Visit{" "}
                      <a
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        openrouter.ai/models
                      </a>{" "}
                      to find available models.
                    </p>
                  </div>
                )}

                <Button
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
                  onClick={handleStart}
                  disabled={!canStart || missionActive}
                  className="w-full gap-3 h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  <Play className="w-5 h-5" />
                  {missionActive ? "Mission in Progress..." : "Start Mission"}
                </Button>
                {!canStart && isCustomModel && !customModelId.trim() && (
                  <p className="text-xs text-destructive mt-2 text-center">Please enter a custom model ID</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}