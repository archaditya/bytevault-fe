"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, ArrowRight, X, Sparkles, Tag } from "lucide-react";
import { useFiles } from "@/services";
import { useFilesStore } from "@/store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils";
import { FileRecord } from "@/types";

export function GlobalSearch() {
  const router = useRouter();
  const { setSearchQuery } = useFilesStore();
  
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  // Fetch live matching files from backend FTS API
  const { data, isLoading } = useFiles({
    search: debouncedQuery.length > 0 ? debouncedQuery : undefined,
    limit: 6,
  });

  const suggestions: FileRecord[] = debouncedQuery.length > 0 && data?.files ? data.files : [];

  // Open dropdown when query is typed
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectFile = useCallback((fileId: string) => {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setQuery("");
    router.push(`/files/${fileId}`);
  }, [router]);

  const handleSearchAll = useCallback((searchStr: string) => {
    const q = searchStr.trim();
    if (!q) return;
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery(q);
    router.push(`/files?q=${encodeURIComponent(q)}`);
  }, [router, setSearchQuery]);

  // Handle keyboard navigation inside search suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectFile(suggestions[selectedIndex].id);
      } else {
        handleSearchAll(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="text-accent font-bold bg-accent/15 px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Desktop Search Bar */}
      <div ref={containerRef} className="hidden sm:block relative max-w-sm md:max-w-md flex-1 mx-4">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files, content, tags... (Ctrl+K)"
            className={cn(
              "w-full h-9 pl-9 pr-8 text-[13px] rounded-lg bg-bg-raised/80 border border-border text-ink placeholder:text-ink-faint",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all",
              isOpen && "rounded-b-none border-b-transparent border-accent"
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (debouncedQuery.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint font-mono bg-bg-overlay px-1.5 py-0.5 rounded border border-border">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Suggestions Popover */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-9 z-50 rounded-b-xl border border-t-0 border-accent bg-bg-surface/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-150">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin text-accent mr-2" />
                Searching documents & AI labels…
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-col py-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-ink-faint uppercase tracking-wider flex items-center justify-between border-b border-border/40">
                  <span>Suggested Files</span>
                  <span className="flex items-center gap-1 text-accent lowercase font-normal">
                    <Sparkles className="h-2.5 w-2.5" /> FTS + AI tags
                  </span>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {suggestions.map((file, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleSelectFile(file.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "bg-accent/15 text-ink"
                            : "hover:bg-bg-raised text-ink-muted hover:text-ink"
                        )}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                          style={{
                            backgroundColor: `${file.thumbnailColor}20`,
                            color: file.thumbnailColor,
                          }}
                        >
                          <FileKindIcon kind={file.kind} className="h-4 w-4" />
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate text-xs font-semibold text-ink">
                            {highlightMatch(file.name, debouncedQuery)}
                          </span>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-faint">
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(file.uploadedAt)}</span>

                            {file.tags && file.tags.length > 0 && (
                              <div className="hidden md:flex items-center gap-1 ml-auto">
                                {file.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="px-1 py-0.2 rounded bg-accent/10 text-accent border border-accent/20 text-[9px] font-medium"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-ink-faint shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>

                {/* View All Matches Footer */}
                <button
                  type="button"
                  onClick={() => handleSearchAll(query)}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 border-t border-border/50 transition-colors"
                >
                  <span>See all matching results for &ldquo;{query}&rdquo;</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-medium text-ink">No matching files found</p>
                <p className="text-[11px] text-ink-faint mt-1">
                  Try searching by filename, document text, or AI tags
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Search Icon Button */}
      <button
        type="button"
        onClick={() => {
          setIsMobileSearchOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        }}
        className="sm:hidden p-2 text-ink-muted hover:text-ink transition-colors rounded-md"
        aria-label="Search files"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Mobile Search Modal Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-surface sm:hidden animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Search className="h-4 w-4 text-ink-faint shrink-0 ml-1" />
            <input
              ref={mobileInputRef}
              type="text"
              placeholder="Search files, content, tags..."
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchAll(query);
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-ink-faint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="text-xs font-semibold text-accent px-2 py-1"
            >
              Cancel
            </button>
          </div>

          {/* Mobile Results */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-xs text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin text-accent mr-2" />
                Searching…
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-col gap-1">
                {suggestions.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleSelectFile(file.id)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-bg-raised/40 hover:bg-bg-raised text-left border border-border/30"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${file.thumbnailColor}20`,
                        color: file.thumbnailColor,
                      }}
                    >
                      <FileKindIcon kind={file.kind} className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-xs font-semibold text-ink">
                        {highlightMatch(file.name, debouncedQuery)}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-ink-faint mt-0.5">
                        <span>{formatBytes(file.sizeBytes)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleSearchAll(query)}
                  className="w-full flex items-center justify-center gap-2 p-3 mt-2 text-xs font-semibold text-accent bg-accent/10 rounded-lg border border-accent/20"
                >
                  <span>View all results for &ldquo;{query}&rdquo;</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : debouncedQuery ? (
              <div className="py-10 text-center text-xs text-ink-faint">
                No matching files found
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-ink-faint">
                Search documents by title, contents, or AI tags
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
