"use client";

import { useMemo, useEffect } from "react";
import { useTransfers, useTransferStats } from "@/services";
import { useTransferStore } from "@/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransferCard } from "./transfer-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TransferTab } from "@/store/transfer.store";
import { UploadStation } from "./upload-station";

const tabs: { value: TransferTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "queued", label: "Queued" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function TransfersList() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: stats } = useTransferStats();
  const { activeTab, setActiveTab, directionFilter, setDirectionFilter, loadFromLocalStorage } = useTransferStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const filtered = useMemo(() => {
    if (!transfers) return [];
    return transfers.filter((t) => {
      const matchesTab = activeTab === "all" || t.status === activeTab;
      const matchesDirection = directionFilter === "all" || t.direction === directionFilter;
      return matchesTab && matchesDirection;
    });
  }, [transfers, activeTab, directionFilter]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Full-Page Upload Station */}
      <UploadStation />

      {/* 2. Transfer Activity & Sessions */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Transfer Sessions & History
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Detailed chunk visualizations, bandwidth metrics, and background worker state.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <div className="flex items-center rounded-md border border-border-strong bg-bg-surface p-0.5">
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 px-2.5", directionFilter === "all" && "bg-bg-overlay text-ink")}
                onClick={() => setDirectionFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 px-2.5", directionFilter === "upload" && "bg-bg-overlay text-ink")}
                onClick={() => setDirectionFilter("upload")}
              >
                <ArrowUp className="h-3 w-3" /> Up
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 px-2.5", directionFilter === "download" && "bg-bg-overlay text-ink")}
                onClick={() => setDirectionFilter("download")}
              >
                <ArrowDown className="h-3 w-3" /> Down
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransferTab)} className="w-full sm:w-auto">
            <TabsList className="flex w-max min-w-full sm:min-w-0 sm:w-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                  {tab.label}
                  {stats && tab.value !== "all" && tab.value in stats && (
                    <span className="font-mono text-[10px] text-ink-faint ml-1">
                      {(stats as Record<string, number>)[tab.value]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[148px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transfer sessions found"
            description="Nothing matches this filter right now. New transfers will appear here automatically as they initiate."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filtered.map((transfer) => (
              <TransferCard key={transfer.id} transfer={transfer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
