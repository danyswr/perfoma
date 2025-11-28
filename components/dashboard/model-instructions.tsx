"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Brain, Bot, Terminal, Lightbulb, Trash2, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { useModelInstructions } from "@/hooks/use-model-instructions"
import type { ModelInstruction } from "@/lib/types"

export function ModelInstructions() {
  const { instructions, clearInstructions, connected } = useModelInstructions()
  const [expanded, setExpanded] = useState<string | null>(null)

  const getTypeIcon = (type: ModelInstruction["type"]) => {
    switch (type) {
      case "command":
        return <Terminal className="w-3 h-3" />
      case "analysis":
        return <Lightbulb className="w-3 h-3" />
      case "decision":
        return <Sparkles className="w-3 h-3" />
      default:
        return <Brain className="w-3 h-3" />
    }
  }

  const getTypeColor = (type: ModelInstruction["type"]) => {
    switch (type) {
      case "command":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "analysis":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "decision":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      default:
        return "bg-muted text-muted-foreground"
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
                        className={`shrink-0 text-[10px] px-1.5 py-0 h-5 ${getTypeColor(instruction.type)}`}
                      >
                        {getTypeIcon(instruction.type)}
                        <span className="ml-1 capitalize">{instruction.type}</span>
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Bot className="w-3 h-3" />
                        <span>Agent-{instruction.agentId.slice(0, 8)}</span>
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
                    <p className={`text-xs font-mono ${expanded === instruction.id ? "" : "line-clamp-2"}`}>
                      {instruction.instruction}
                    </p>
                  </div>

                  {expanded === instruction.id && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Model: {instruction.modelName}</span>
                        <Badge variant="outline" className="text-[9px] h-4">
                          {instruction.type}
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
