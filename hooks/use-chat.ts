"use client"

import { useState, useEffect, useCallback } from "react"
import { useWebSocket } from "./use-websocket"
import type { ChatMessage } from "@/lib/types"
import { formatTime } from "@/lib/utils"

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mode, setMode] = useState<"chat" | "queue">("chat")
  const { connected, connecting, connectionError, sendCommand, sendChat, onMessage, lastMessage, reconnect } = useWebSocket()

  const addMessage = useCallback((role: "user" | "assistant" | "system", content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: formatTime(new Date()),
    }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case "system":
        addMessage("system", lastMessage.message || "Connected to system")
        break
      case "mode_change":
        setMode(lastMessage.mode === "chat" ? "chat" : "queue")
        addMessage("system", lastMessage.message || `Switched to ${lastMessage.mode} mode`)
        break
      case "chat_response":
        addMessage("assistant", lastMessage.message || "")
        break
      case "queue_list":
        if (lastMessage.queue && lastMessage.queue.length > 0) {
          const queueStr = lastMessage.queue.map((item) => `${item.index}. ${item.command}`).join("\n")
          addMessage("system", `Queue (${lastMessage.total} items):\n${queueStr}`)
        } else {
          addMessage("system", "Queue is empty")
        }
        break
      case "queue_add":
        addMessage("system", lastMessage.message || "Commands added to queue")
        break
      case "queue_remove":
        addMessage("system", lastMessage.message || "Command removed from queue")
        break
      case "queue_edit":
        addMessage("system", lastMessage.message || "Queue item updated")
        break
      case "error":
        addMessage("system", `Error: ${lastMessage.message}`)
        break
    }
  }, [lastMessage, addMessage])

  const sendMessage = useCallback(
    (content: string, currentMode: "chat" | "queue") => {
      addMessage("user", content)

      if (currentMode === "chat") {
        sendChat(content)
      } else {
        // For queue mode, treat as command execution
        sendCommand(content)
      }
    },
    [addMessage, sendChat, sendCommand],
  )

  const sendQueueCommand = useCallback(
    (command: string) => {
      addMessage("user", command)
      sendCommand(command)
    },
    [addMessage, sendCommand],
  )

  return {
    messages,
    sendMessage,
    sendQueueCommand,
    mode,
    setMode,
    connected,
    connecting,
    connectionError,
    reconnect,
  }
}
