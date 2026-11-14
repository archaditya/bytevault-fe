"use client";

import { Move, Trash2, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchActionBarProps {
  selectedCount: number;
  onMove: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export function BatchActionBar({
  selectedCount,
  onMove,
  onDelete,
  onDeselect,
}: BatchActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <aside
      aria-label="Batch item actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-bg-surface/95 border border-border-strong rounded-full shadow-2xl backdrop-blur-md px-4 py-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 text-xs text-ink select-none font-sans"
    >
      <div className="flex items-center gap-2 pl-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent-bright font-bold text-[11px]">
          {selectedCount}
        </span>
        <span className="font-semibold text-ink-muted hidden sm:inline">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <Button
        size="sm"
        variant="outline"
        onClick={onMove}
        className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold hover:bg-bg-overlay"
      >
        <Move className="h-3.5 w-3.5 text-ink-muted" />
        <span>Move</span>
      </Button>

      <Button
        size="sm"
        variant="danger"
        onClick={onDelete}
        className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Delete</span>
      </Button>

      <div className="h-4 w-px bg-border hidden sm:block" />

      <Button
        size="sm"
        variant="ghost"
        onClick={onDeselect}
        className="flex items-center gap-1 h-7 px-2.5 rounded-full text-xs text-ink-muted hover:text-ink"
        title="Deselect all (Esc)"
      >
        <X className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Clear</span>
      </Button>
    </aside>
  );
}
