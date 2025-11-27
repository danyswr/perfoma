"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Send, Bot, User, ListOrdered, Terminal, Wifi, WifiOff } from "lucide-react"
import { useChat } from "@/hooks/use-chat"
import type { ChatMessage } from "@/lib/types"

export function LiveChat() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, sendQueueCommand, mode, setMode, connected } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
    <Card className="border-border flex flex-col h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Live Chat</CardTitle>
          {connected ? <Wifi className="w-4 h-4 text-primary" /> : <WifiOff className="w-4 h-4 text-destructive" />}
        </div>
        <div className="flex gap-1">
          <Button
            variant={mode === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("chat")}
            className="gap-1.5 h-7 text-xs"
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </Button>
          <Button
            variant={mode === "queue" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("queue")}
            className="gap-1.5 h-7 text-xs"
          >
            <ListOrdered className="w-3 h-3" />
            Queue
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a conversation with the AI.</p>
                <p className="text-xs mt-1">Use /queue commands to manage task queue.</p>
                <div className="mt-4 text-left max-w-xs mx-auto">
                  <p className="text-xs font-medium mb-2">Available Commands:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>
                      <code className="bg-muted px-1 rounded">/chat</code> - Switch to chat mode
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">/queue list</code> - View queue
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">/queue add</code> - Add command
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">/queue rm &lt;index&gt;</code> - Remove
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">/queue edit &lt;index&gt;</code> - Edit
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatBubble key={message.id} message={message} />)
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "chat" ? "Type a message..." : "/queue list, /queue add {...}"}
                className="pr-20 bg-muted border-border"
              />
              <Badge variant="outline" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                {mode}
              </Badge>
            </div>
            <Button type="submit" size="icon" disabled={!connected}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setInput("/queue list")}
            >
              /queue list
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setInput('/queue add {"1":"RUN ')}
            >
              /queue add
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setInput("/queue rm ")}
            >
              /queue rm
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground flex items-start gap-1.5 max-w-[90%]">
          <Terminal className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <pre className="whitespace-pre-wrap font-mono">{message.content}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary/20" : "bg-muted"
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}
