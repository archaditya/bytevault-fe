"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useAdminLogFiles,
  useAdminLogTail,
  downloadAdminLogFile,
  LogFileInfo,
} from "@/services";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Terminal,
  Download,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Clock,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

type LogLevel = "ALL" | "ERROR" | "WARN" | "INFO";

interface ParsedLogLine {
  raw: string;
  timestamp?: string;
  level?: string;
  caller?: string;
  message?: string;
  details?: Record<string, any>;
}

function parseLogLine(line: string): ParsedLogLine {
  if (!line || !line.trim()) {
    return { raw: line };
  }

  // Attempt JSON parsing (production zerolog format)
  if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
    try {
      const obj = JSON.parse(line);
      const { time, level, caller, message, msg, ...rest } = obj;
      return {
        raw: line,
        timestamp: time,
        level: (level || "").toUpperCase(),
        caller: caller,
        message: message || msg || "",
        details: Object.keys(rest).length > 0 ? rest : undefined,
      };
    } catch {
      // Fall through to regex/text
    }
  }

  // ConsoleWriter format: "2026-11-13T23:44:37Z INF message caller=..."
  const levelMatch = line.match(/\b(ERR|ERROR|WRN|WARN|INF|INFO|DBG|DEBUG)\b/i);
  let lvl = "INFO";
  if (levelMatch) {
    const rawLvl = levelMatch[1].toUpperCase();
    if (rawLvl.startsWith("ERR")) lvl = "ERROR";
    else if (rawLvl.startsWith("WRN")) lvl = "WARN";
    else if (rawLvl.startsWith("DBG")) lvl = "DEBUG";
    else lvl = "INFO";
  }

  return {
    raw: line,
    level: lvl,
    message: line,
  };
}

export default function AdminLogsPage() {
  const { data: logFiles = [], isLoading: filesLoading, refetch: refetchFiles } = useAdminLogFiles();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [linesCount, setLinesCount] = useState<number>(200);
  const [filterLevel, setFilterLevel] = useState<LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Auto-select the newest log file
  useEffect(() => {
    if (logFiles.length > 0 && !selectedFile) {
      setSelectedFile(logFiles[0].filename);
    }
  }, [logFiles, selectedFile]);

  const {
    data: tailData,
    isLoading: tailLoading,
    isFetching: tailFetching,
    refetch: refetchTail,
  } = useAdminLogTail(selectedFile, linesCount, {
    refetchInterval: autoRefresh ? 3000 : undefined,
    enabled: !!selectedFile,
  });

  const parsedLines: ParsedLogLine[] = useMemo(() => {
    if (!tailData?.lines) return [];
    return tailData.lines.map(parseLogLine);
  }, [tailData?.lines]);

  const filteredLines = useMemo(() => {
    return parsedLines.filter((line) => {
      // Level filter
      if (filterLevel !== "ALL") {
        if (!line.level || !line.level.includes(filterLevel)) {
          return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return line.raw.toLowerCase().includes(query);
      }
      return true;
    });
  }, [parsedLines, filterLevel, searchQuery]);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLines, autoScroll]);

  const handleDownload = async () => {
    if (!selectedFile) return;
    setIsDownloading(true);
    try {
      await downloadAdminLogFile(selectedFile);
      toast.success(`Log file "${selectedFile}" downloaded`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download log file");
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedFileInfo = logFiles.find((f) => f.filename === selectedFile);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Terminal className="h-5 w-5 text-accent-bright" /> Server Application Logs
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Real-time stdout & daily zerolog streams, live tailing console, and server log exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchFiles();
              refetchTail();
            }}
            disabled={tailFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${tailFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!selectedFile || isDownloading}
            className="h-8 gap-1.5 text-xs bg-accent hover:bg-accent-bright text-white"
          >
            <Download className="h-3.5 w-3.5" />
            {isDownloading ? "Downloading..." : "Download Log"}
          </Button>
        </div>
      </div>

      {/* Control Toolbar */}
      <Card className="bg-bg-surface border-border-strong p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* File & Window Selection */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ink-muted" />
              <select
                value={selectedFile || ""}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="bg-bg-elevated border border-border text-ink text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {filesLoading ? (
                  <option>Loading log files...</option>
                ) : logFiles.length === 0 ? (
                  <option>No log files generated</option>
                ) : (
                  logFiles.map((file) => (
                    <option key={file.filename} value={file.filename}>
                      {file.filename} ({formatBytes(file.size_bytes)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted font-medium">Lines:</span>
              <select
                value={linesCount}
                onChange={(e) => setLinesCount(Number(e.target.value))}
                className="bg-bg-elevated border border-border text-ink text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            {selectedFileInfo && (
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-ink-faint font-mono">
                <span>Updated: {new Date(selectedFileInfo.updated_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Level Filter Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-md bg-bg-elevated p-0.5 border border-border text-xs">
              {(["ALL", "INFO", "WARN", "ERROR"] as LogLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    filterLevel === level
                      ? level === "ERROR"
                        ? "bg-danger text-white font-semibold"
                        : level === "WARN"
                        ? "bg-amber-500 text-white font-semibold"
                        : "bg-accent text-white font-semibold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
              <Input
                placeholder="Filter logs in stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-bg-elevated border-border"
              />
            </div>

            {/* Auto refresh switch */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border font-mono transition-colors ${
                autoRefresh
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "bg-bg-elevated border-border text-ink-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-ink-muted"}`} />
              Live Tail
            </button>
          </div>
        </div>
      </Card>

      {/* Terminal Log Console */}
      <Card className="bg-[#0D1117] border-border-strong overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161B22] border-b border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56] inline-block opacity-80" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E] inline-block opacity-80" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F] inline-block opacity-80" />
            <span className="font-mono text-ink-muted text-[11px] ml-2 font-medium flex items-center gap-1.5">
              <span>logs/{selectedFile || "stdout.log"}</span>
              {tailFetching && <RefreshCw className="h-3 w-3 animate-spin text-accent-bright" />}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-ink-muted">
            <span>
              Showing {filteredLines.length} of {parsedLines.length} lines
            </span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                autoScroll
                  ? "border-accent/40 bg-accent/15 text-accent-bright"
                  : "border-border text-ink-faint"
              }`}
              title="Toggle auto-scroll to latest lines"
            >
              <ArrowDown className="h-3 w-3" /> Auto-scroll
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-[12px] leading-relaxed max-h-[620px] min-h-[420px] overflow-y-auto space-y-1 select-text">
          {tailLoading && parsedLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-muted gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-accent" />
              <span>Streaming server logs...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-muted gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <span>No log records match current filter or file is empty.</span>
            </div>
          ) : (
            filteredLines.map((line, idx) => {
              const isErr = line.level === "ERROR" || line.level === "ERR";
              const isWarn = line.level === "WARN" || line.level === "WRN";
              const isDebug = line.level === "DEBUG" || line.level === "DBG";

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 py-0.5 px-1.5 rounded transition-colors hover:bg-white/[0.04] ${
                    isErr
                      ? "bg-red-500/10 text-red-200 border-l-2 border-red-500"
                      : isWarn
                      ? "bg-amber-500/10 text-amber-200 border-l-2 border-amber-500"
                      : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-600 select-none text-[11px] w-8 text-right shrink-0">
                    {idx + 1}
                  </span>

                  {line.timestamp && (
                    <span className="text-slate-500 text-[11px] shrink-0">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                  )}

                  {line.level && (
                    <span
                      className={`text-[10px] px-1 py-0 rounded font-semibold uppercase shrink-0 ${
                        isErr
                          ? "bg-red-500/20 text-red-400"
                          : isWarn
                          ? "bg-amber-500/20 text-amber-400"
                          : isDebug
                          ? "bg-slate-700 text-slate-300"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {line.level}
                    </span>
                  )}

                  {line.caller && (
                    <span className="text-slate-500 text-[11px] shrink-0">
                      [{line.caller}]
                    </span>
                  )}

                  <span className="break-all whitespace-pre-wrap flex-1">
                    {line.message || line.raw}
                    {line.details && (
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {JSON.stringify(line.details)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={consoleBottomRef} />
        </div>
      </Card>
    </div>
  );
}
