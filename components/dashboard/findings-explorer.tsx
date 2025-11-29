"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  FolderOpen, FileJson, FileText, File, FileCode, 
  ChevronRight, ChevronDown, Download, X, RefreshCw,
  Clock, HardDrive, Eye, Terminal
} from "lucide-react"
import { useFindingsExplorer, type FileInfo, type FolderInfo } from "@/hooks/use-findings-explorer"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function getFileIcon(type: string) {
  switch (type) {
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-500" />
    case 'text':
    case 'log':
      return <FileText className="w-4 h-4 text-blue-500" />
    case 'html':
      return <FileCode className="w-4 h-4 text-orange-500" />
    case 'pdf':
      return <File className="w-4 h-4 text-red-500" />
    default:
      return <File className="w-4 h-4 text-muted-foreground" />
  }
}

function FileItem({ file, onClick }: { file: FileInfo; onClick: () => void }) {
  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {getFileIcon(file.type)}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <HardDrive className="w-3 h-3" />
            {formatFileSize(file.size)}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {formatDate(file.modified)}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
        <Eye className="w-3 h-3" />
      </Button>
    </div>
  )
}

function FolderItem({ folder, onFileClick }: { folder: FolderInfo; onFileClick: (file: FileInfo) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium flex-1 text-left truncate">{folder.name}</span>
        <Badge variant="secondary" className="text-[10px] h-4">{folder.file_count}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 pl-2 border-l border-border/50 mt-1 space-y-0.5">
          {folder.files.map((file) => (
            <FileItem key={file.path} file={file} onClick={() => onFileClick(file)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function FileViewer({ file, content, loading, onClose }: { 
  file: FileInfo | null
  content: { type: string; content: any; filename: string } | null
  loading: boolean
  onClose: () => void 
}) {
  if (!file) return null

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (!content) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Unable to load file content</p>
        </div>
      )
    }

    switch (content.type) {
      case 'json':
        return (
          <ScrollArea className="h-[500px]">
            <pre className="text-xs font-mono p-4 bg-muted/30 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {typeof content.content === 'string' 
                ? content.content 
                : JSON.stringify(content.content, null, 2)}
            </pre>
          </ScrollArea>
        )
      case 'html':
        return (
          <ScrollArea className="h-[500px]">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none p-4"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </ScrollArea>
        )
      case 'text':
      case 'log':
      case 'csv':
      case 'xml':
        return (
          <ScrollArea className="h-[500px]">
            <pre className="text-xs font-mono p-4 bg-muted/30 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {content.content}
            </pre>
          </ScrollArea>
        )
      case 'pdf':
        return (
          <div className="text-center py-8">
            <File className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p className="text-sm text-muted-foreground mb-3">PDF files are downloaded automatically</p>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/findings/file/${encodeURIComponent(file.path)}`} download>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </a>
            </Button>
          </div>
        )
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Preview not available for this file type</p>
          </div>
        )
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(file.type)}
            <span className="truncate">{file.name}</span>
            <Badge variant="outline" className="text-xs uppercase">{file.type}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatFileSize(file.size)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(file.modified)}
          </span>
          {file.target && (
            <Badge variant="secondary" className="text-[10px]">Target: {file.target}</Badge>
          )}
        </div>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}

export function FindingsExplorer() {
  const { 
    explorer, 
    logs,
    loading, 
    selectedFile, 
    fileContent, 
    fileLoading,
    openFile, 
    closeFile,
    refetch,
    refetchLogs 
  } = useFindingsExplorer()
  const [activeTab, setActiveTab] = useState<"findings" | "logs">("findings")

  return (
    <>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Findings Explorer</CardTitle>
              <Badge variant="secondary">{explorer.total_files} files</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7"
              onClick={() => { refetch(); refetchLogs(); }}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "findings" | "logs")} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-2 grid grid-cols-2 h-8">
              <TabsTrigger value="findings" className="text-xs gap-1">
                <FolderOpen className="w-3 h-3" />
                Findings
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs gap-1">
                <Terminal className="w-3 h-3" />
                Agent Logs
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="findings" className="flex-1 overflow-hidden m-0 p-2">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {explorer.folders.length === 0 && explorer.root_files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No findings yet</p>
                      <p className="text-xs">Start a mission to generate findings</p>
                    </div>
                  ) : (
                    <>
                      {explorer.folders.map((folder) => (
                        <FolderItem 
                          key={folder.path} 
                          folder={folder} 
                          onFileClick={(file) => openFile(file, false)}
                        />
                      ))}
                      {explorer.root_files.length > 0 && (
                        <div className="pt-2 border-t border-border/50 mt-2">
                          <p className="text-[10px] text-muted-foreground mb-1 px-2">Root Files</p>
                          {explorer.root_files.map((file) => (
                            <FileItem 
                              key={file.path} 
                              file={file} 
                              onClick={() => openFile(file, false)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="logs" className="flex-1 overflow-hidden m-0 p-2">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Terminal className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No logs available</p>
                      <p className="text-xs">Agent logs will appear here</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <FileItem 
                        key={log.path} 
                        file={log} 
                        onClick={() => openFile(log, true)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FileViewer 
        file={selectedFile} 
        content={fileContent} 
        loading={fileLoading}
        onClose={closeFile} 
      />
    </>
  )
}
