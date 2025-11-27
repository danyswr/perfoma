"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, type FindingResponse } from "@/lib/api"
import type { Finding } from "@/lib/types"

function transformFinding(f: FindingResponse): Finding {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    severity: f.severity,
    cve: f.cve,
    cvss: f.cvss,
    agentId: f.agent_id,
    timestamp: new Date(f.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }
}

export function useFindings() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [severitySummary, setSeveritySummary] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  })
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFindings = useCallback(async () => {
    try {
      const response = await api.getFindings()
      if (response.data) {
        setFindings(response.data.findings.map(transformFinding))
        setSeveritySummary(response.data.severity_summary)
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchFindings().finally(() => setLoading(false))

    intervalRef.current = setInterval(fetchFindings, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchFindings])

  const exportFindings = useCallback(() => {
    const data = JSON.stringify(findings, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `findings-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [findings])

  const exportHtmlReport = useCallback(() => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Assessment Report - ${new Date().toISOString().split("T")[0]}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fafafa; }
    h1 { color: #22c55e; }
    .finding { border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .critical { border-left: 4px solid #ef4444; }
    .high { border-left: 4px solid #f97316; }
    .medium { border-left: 4px solid #eab308; }
    .low { border-left: 4px solid #3b82f6; }
    .info { border-left: 4px solid #6b7280; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge.critical { background: rgba(239,68,68,0.2); color: #ef4444; }
    .badge.high { background: rgba(249,115,22,0.2); color: #f97316; }
    .badge.medium { background: rgba(234,179,8,0.2); color: #eab308; }
    .badge.low { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .badge.info { background: rgba(107,114,128,0.2); color: #9ca3af; }
    .summary { display: flex; gap: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Security Assessment Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <div class="summary">
    <span class="badge critical">Critical: ${severitySummary.critical}</span>
    <span class="badge high">High: ${severitySummary.high}</span>
    <span class="badge medium">Medium: ${severitySummary.medium}</span>
    <span class="badge low">Low: ${severitySummary.low}</span>
    <span class="badge info">Info: ${severitySummary.info}</span>
  </div>
  <h2>Findings</h2>
  ${findings
    .map(
      (f) => `
    <div class="finding ${f.severity}">
      <span class="badge ${f.severity}">${f.severity.toUpperCase()}</span>
      ${f.cve ? `<span class="badge info">${f.cve}</span>` : ""}
      ${f.cvss ? `<span class="badge info">CVSS: ${f.cvss}</span>` : ""}
      <h3>${f.title}</h3>
      <p>${f.description}</p>
      <small>Agent: ${f.agentId} | Time: ${f.timestamp}</small>
    </div>
  `,
    )
    .join("")}
</body>
</html>
    `
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `security-report-${new Date().toISOString().split("T")[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [findings, severitySummary])

  return {
    findings,
    severitySummary,
    loading,
    exportFindings,
    exportHtmlReport,
    refetch: fetchFindings,
  }
}
