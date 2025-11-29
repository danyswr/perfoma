"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Brain, Bot, Terminal, Lightbulb, Trash2, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Play, Cpu, Info } from "lucide-react"
import { useModelInstructions } from "@/hooks/use-model-instructions"
import type { ModelInstruction } from "@/lib/types"

export function ModelInstructions() {
  const { instructions, clearInstructions, connected } = useModelInstructions()
  const [expanded, setExpanded] = useState<string | null>(null)

  const getTypeIcon = (type: ModelInstruction["type"]) => {
    switch (type) {
      case "command":
        return <Terminal className="w-3 h-3" />
      case "found":
        return <AlertTriangle className="w-3 h-3" />
      case "execute":
        return <Play className="w-3 h-3" />
      case "model_output":
        return <Cpu className="w-3 h-3" />
      case "info":
        return <Info className="w-3 h-3" />
      case "analysis":
        return <Lightbulb className="w-3 h-3" />
      case "decision":
        return <Sparkles className="w-3 h-3" />
      default:
        return <Brain className="w-3 h-3" />
    }
  }

  const getTypeColor = (type: ModelInstruction["type"], severity?: string) => {
    if (type === "found") {
      switch (severity) {
        case "critical":
          return "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
        case "high":
          return "bg-orange-500/20 text-orange-400 border-orange-500/30"
        case "medium":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "low":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        default:
          return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      }
    }
    
    switch (type) {
      case "command":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "execute":
        return "bg-green-500/10 text-green-400 border-green-500/20"
      case "model_output":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20"
      case "info":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20"
      case "analysis":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "decision":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }
  
  const getTypeLabel = (type: ModelInstruction["type"]) => {
    switch (type) {
      case "command":
        return "Command"
      case "found":
        return "Found"
      case "execute":
        return "Execute"
      case "model_output":
        return "Model"
      case "info":
        return "Info"
      case "analysis":
        return "Analysis"
      case "decision":
        return "Decision"
      default:
        return type
    }
  }

  return (
    <Card className="border-border flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-3 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-medium">Model Instructions</CardTitle>
          <Badge variant="secondary" className="text-xs px-1.5 h-5">
            {instructions.length}
          </Badge>
        </div>
        {instructions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearInstructions}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 px-2 pb-2">
        {instructions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Brain className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">No instructions yet</p>
            <p className="text-xs mt-1 text-center px-4">
              Model instructions will appear here when agents receive commands from AI models
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 p-1">
              {instructions.map((instruction) => (
                <div
                  key={instruction.id}
                  className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === instruction.id ? null : instruction.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] px-1.5 py-0 h-5 ${getTypeColor(instruction.type, instruction.severity)}`}
                      >
                        {getTypeIcon(instruction.type)}
                        <span className="ml-1">{getTypeLabel(instruction.type)}</span>
                      </Badge>
                      {instruction.severity && instruction.type === "found" && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[9px] px-1 py-0 h-4 uppercase ${
                            instruction.severity === "critical" ? "bg-red-500/20 text-red-400" :
                            instruction.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                            instruction.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {instruction.severity}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Bot className="w-3 h-3" />
                        <span>{instruction.agentId === "system" ? "System" : `Agent-${instruction.agentId.slice(0, 8)}`}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{instruction.timestamp}</span>
                      {expanded === instruction.id ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1.5">
                    <p className={`text-xs font-mono ${expanded === instruction.id ? "" : "line-clamp-2"} ${
                      instruction.type === "found" && instruction.severity === "critical" ? "text-red-400" : ""
                    }`}>
                      {instruction.instruction}
                    </p>
                  </div>

                  {expanded === instruction.id && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Model: {instruction.modelName}</span>
                        <Badge variant="outline" className="text-[9px] h-4">
                          {getTypeLabel(instruction.type)}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
