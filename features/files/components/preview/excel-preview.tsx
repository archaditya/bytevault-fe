"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Search,
  AlertCircle,
  Lock,
  Download,
  Loader2,
  Table as TableIcon,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api-client";

interface ExcelPreviewProps {
  url: string;
  filename: string;
  fileSize?: number;
}

export function ExcelPreview({ url, filename, fileSize }: ExcelPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [forceLoadLarge, setForceLoadLarge] = useState(false);

  const [detectedSize, setDetectedSize] = useState<number | null>(null);
  const effectiveSize = fileSize || detectedSize || 0;
  const isLargeFile = effectiveSize > 15 * 1024 * 1024; // > 15MB

  useEffect(() => {
    let isCancelled = false;

    async function loadSpreadsheet() {
      // If declared size exceeds 15MB and user hasn't confirmed, show gate
      if (fileSize && fileSize > 15 * 1024 * 1024 && !forceLoadLarge) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setIsEncrypted(false);

      try {
        const response = await fetchWithAuth(url);
        if (!response.ok) {
          throw new Error(`Failed to load file (${response.status} ${response.statusText})`);
        }

        // Dynamically inspect response Content-Length header if available
        const cl = response.headers.get("content-length");
        if (cl) {
          const parsedCl = parseInt(cl, 10);
          if (!isNaN(parsedCl) && parsedCl > 15 * 1024 * 1024 && !forceLoadLarge) {
            if (!isCancelled) {
              setDetectedSize(parsedCl);
              setLoading(false);
            }
            return;
          }
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        // Fallback size gate on downloaded payload before parsing with SheetJS
        if (arrayBuffer.byteLength > 15 * 1024 * 1024 && !forceLoadLarge) {
          if (!isCancelled) {
            setDetectedSize(arrayBuffer.byteLength);
            setLoading(false);
          }
          return;
        }

        // SheetJS parse with safety limit of 1000 rows per sheet
        const wb = XLSX.read(arrayBuffer, {
          type: "array",
          sheetRows: 1000,
          dense: true,
        });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error("No readable sheets found in spreadsheet");
        }

        if (!isCancelled) {
          setWorkbook(wb);
          setActiveSheet(wb.SheetNames[0]);
        }
      } catch (err: any) {
        if (isCancelled) return;
        const msg = (err?.message || "").toLowerCase();
        if (
          msg.includes("password") ||
          msg.includes("encrypted") ||
          msg.includes("cdf") ||
          msg.includes("crypto") ||
          msg.includes("protect") ||
          msg.includes("ole") ||
          msg.includes("security")
        ) {
          setIsEncrypted(true);
        } else {
          setError(err?.message || "Failed to parse spreadsheet");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadSpreadsheet();

    return () => {
      isCancelled = true;
    };
  }, [url, fileSize, forceLoadLarge]);

  const rawData: (string | number)[][] = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) {
      return [];
    }
    try {
      const sheet = workbook.Sheets[activeSheet];
      return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as (string | number)[][];
    } catch {
      return [];
    }
  }, [workbook, activeSheet]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  }, [rawData, searchQuery]);

  // Large File Gate
  if (isLargeFile && !forceLoadLarge) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <FileSpreadsheet className="h-12 w-12 text-accent mb-3" />
        <h3 className="text-base font-semibold text-ink">Large Spreadsheet ({formatBytes(effectiveSize || 0)})</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-md">
          Parsing this file in the browser may cause lag. You can preview the first 1,000 rows or download the original file directly.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setForceLoadLarge(true)}
            className="px-3.5 py-1.5 rounded-lg bg-bg-raised hover:bg-bg-overlay border border-border text-xs font-medium text-ink transition-colors"
          >
            Preview Sample (1,000 rows)
          </button>
          <a
            href={url}
            download={filename}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-bright transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download Full File
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-ink-muted">
        <Loader2 className="h-7 w-7 animate-spin text-accent mb-2" />
        <p className="text-xs font-mono">Parsing workbook & formatting cells...</p>
      </div>
    );
  }

  // Encrypted state
  if (isEncrypted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-ink">Password-Protected Spreadsheet</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          This spreadsheet is encrypted. In-browser preview cannot decrypt the contents without the password.
        </p>
        <a
          href={url}
          download={filename}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-bright shadow transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download Original File
        </a>
      </div>
    );
  }

  // Error state
  if (error || !workbook) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <AlertCircle className="h-8 w-8 text-danger mb-2" />
        <h3 className="text-sm font-semibold text-ink">Could Not Render Spreadsheet</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-md">{error || "File format is invalid or corrupted."}</p>
        <a
          href={url}
          download={filename}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-raised border border-border text-xs font-medium text-ink hover:bg-bg-overlay transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download File Instead
        </a>
      </div>
    );
  }

  const sheetNames = workbook.SheetNames || [];

  return (
    <div className="flex flex-col h-full w-full rounded-xl border border-border bg-bg-surface overflow-hidden shadow-sm">
      {/* Workbook Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-bg-raised border-b border-border text-xs">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full sm:max-w-md">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors shrink-0 ${
                activeSheet === name
                  ? "bg-accent text-bg font-bold shadow-xs"
                  : "bg-bg-surface hover:bg-bg-overlay text-ink-muted hover:text-ink border border-border/60"
              }`}
            >
              <span className="flex items-center gap-1">
                <TableIcon className="h-3 w-3 opacity-70" />
                {name}
              </span>
            </button>
          ))}
        </div>

        {/* Search within sheet */}
        <div className="relative min-w-[160px] sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Filter cells..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 rounded-md bg-bg-surface border border-border text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Spreadsheet Grid Viewport */}
      <div className="flex-1 overflow-auto max-h-[550px] min-h-[300px] select-text font-mono text-[11px]">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-ink-muted">
            <p>No matching rows in sheet &quot;{activeSheet}&quot;</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg-overlay/80 sticky top-0 z-10 border-b border-border text-ink-muted">
                <th className="w-10 px-2 py-1 text-center font-semibold bg-bg-overlay border-r border-border select-none">
                  #
                </th>
                {filteredRows[0]?.map((_, colIdx) => (
                  <th
                    key={colIdx}
                    className="px-3 py-1.5 text-left font-semibold border-r border-border truncate max-w-[220px]"
                  >
                    {String.fromCharCode(65 + (colIdx % 26))}
                    {colIdx >= 26 ? Math.floor(colIdx / 26) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIdx) => {
                const isHeaderRow = rowIdx === 0 && !searchQuery;
                return (
                  <tr
                    key={rowIdx}
                    className={`border-b border-border/50 hover:bg-bg-overlay/40 transition-colors ${
                      isHeaderRow ? "bg-bg-raised/60 font-semibold text-ink" : "text-ink-muted"
                    }`}
                  >
                    <td className="px-2 py-1 text-center font-mono text-[10px] text-ink-faint bg-bg-raised/40 border-r border-border select-none">
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-1 border-r border-border/40 truncate max-w-[260px] whitespace-pre"
                        title={String(cell || "")}
                      >
                        {String(cell || "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Spreadsheet Footer info */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-raised border-t border-border text-[10px] text-ink-faint font-mono">
        <span>
          Sheet: <strong className="text-ink">{activeSheet}</strong> ({filteredRows.length} rows)
        </span>
        {rawData.length >= 1000 && (
          <span className="text-amber-400">
            Preview capped at first 1,000 rows. Download file for complete dataset.
          </span>
        )}
      </div>
    </div>
  );
}
