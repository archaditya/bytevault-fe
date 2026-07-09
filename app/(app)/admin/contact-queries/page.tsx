"use client";

import { useState } from "react";
import { useAdminContactQueries, useReplyContactQueryMutation, ContactQuery } from "@/services/admin.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Clock, MessageSquare, Loader2, Sparkles, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminContactQueriesPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading } = useAdminContactQueries(page, 20);
  const replyMutation = useReplyContactQueryMutation();

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuery || !replyMessage.trim()) return;

    replyMutation.mutate(
      { id: selectedQuery.id, reply: replyMessage },
      {
        onSuccess: () => {
          setReplyMessage("");
          setSelectedQuery(null);
        },
      }
    );
  };

  const filteredQueries = (data?.queries || []).filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      q.name.toLowerCase().includes(term) ||
      q.email.toLowerCase().includes(term) ||
      q.subject.toLowerCase().includes(term) ||
      q.message.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 font-sans text-ink">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contact Queries</h1>
          <p className="text-xs text-ink-muted">View and reply to customer tickets and messages.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter queries..."
          className="max-w-xs h-9 text-[12px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : filteredQueries.length === 0 ? (
        <Card className="bg-bg-surface border-border-strong text-ink">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-ink-faint mb-3" />
            <h3 className="text-sm font-semibold">No queries registered</h3>
            <p className="text-xs text-ink-muted mt-1">Queries submitted via the Contact form will show up here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredQueries.map((query) => (
            <Card
              key={query.id}
              onClick={() => setSelectedQuery(query)}
              className="bg-bg-surface border-border-strong text-ink hover:border-accent/40 transition-all cursor-pointer p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-ink truncate">{query.subject}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted">
                    <span className="font-medium text-ink">{query.name}</span>
                    <span>•</span>
                    <span>{query.email}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium font-mono capitalize ${
                  query.status === "replied"
                    ? "bg-success/15 text-success"
                    : "bg-live/15 text-live"
                }`}>
                  {query.status}
                </span>
              </div>

              <p className="text-[12px] text-ink-muted leading-relaxed line-clamp-2 mt-1">
                {query.message}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-ink-faint font-mono mt-1 border-t border-border/40 pt-2">
                <Clock className="h-3.5 w-3.5" /> Received {formatDateTime(query.created_at)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Query Detail & Reply Dialog */}
      <Dialog open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
        <DialogContent className="sm:max-w-lg bg-bg-surface border-border-strong text-ink">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-ink flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-accent" /> Ticket Information
            </DialogTitle>
          </DialogHeader>

          {selectedQuery && (
            <div className="flex flex-col gap-4 py-3">
              <div className="flex justify-between items-start gap-4 border-b border-border/50 pb-3">
                <div>
                  <h3 className="text-[13px] font-bold text-ink">{selectedQuery.subject}</h3>
                  <div className="text-[11px] text-ink-muted mt-1 leading-none">
                    From: <strong className="text-ink">{selectedQuery.name}</strong> ({selectedQuery.email})
                  </div>
                </div>
                <span className={`text-[10px] font-mono rounded-full px-2 py-0.5 capitalize ${
                  selectedQuery.status === "replied" ? "bg-success/15 text-success" : "bg-live/15 text-live"
                }`}>
                  {selectedQuery.status}
                </span>
              </div>

              <div className="bg-bg-overlay/50 rounded-md p-3 border border-border/50">
                <p className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">Submitted Message</p>
                <p className="text-[12px] text-ink leading-relaxed mt-2 whitespace-pre-wrap">
                  {selectedQuery.message}
                </p>
              </div>

              {selectedQuery.status === "replied" ? (
                <div className="bg-success/5 rounded-md p-3 border border-success/30 flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-success flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Response Sent
                    </span>
                    <span className="font-mono text-ink-faint">
                      {formatDateTime(selectedQuery.replied_at!)}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink leading-relaxed mt-1">
                    {selectedQuery.reply}
                  </p>
                  <p className="text-[10px] text-ink-faint mt-1">
                    Answered by: {selectedQuery.replier_name} ({selectedQuery.replier_email})
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-ink-muted">Write a Reply</label>
                    <Textarea
                      required
                      rows={4}
                      placeholder="Type your response to send to the client..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="text-[12px]"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedQuery(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="gap-1.5" disabled={replyMutation.isPending}>
                      {replyMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Send Response
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
