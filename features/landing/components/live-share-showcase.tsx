"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio, ArrowRight, Zap, Clock, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

export function LiveShareShowcase() {
  return (
    <section className="border-b border-border py-20 bg-gradient-to-b from-bg to-bg-surface/30">
      <div className="container space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Instant Link
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-ink">
            Don't wait for a 2&nbsp;GB upload to finish before sharing the link.
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Traditional file sharing forces you to wait until 100% of your upload is complete before generating a link.
            With <span className="text-ink font-semibold">PushPostVault Live Share</span>, your link is ready at{" "}
            <span className="text-emerald-400 font-semibold">0%</span>. The recipient sees live progress and can download the moment the upload finishes.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Traditional Way */}
          <div className="rounded-2xl border border-border bg-bg-surface/50 p-6 sm:p-8 flex flex-col justify-between space-y-6 opacity-85">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  The Old Way
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                  <XCircle className="w-3.5 h-3.5" /> Sequential Bottleneck
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink">Traditional Cloud Upload</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                You sit staring at an upload spinner. Your recipient has no idea what is happening until the entire upload is finished and you manually message them.
              </p>

              <div className="space-y-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-bg-raised border border-border flex items-center justify-between">
                  <span className="text-ink-muted">Upload file to server</span>
                  <span className="text-amber-400">Wait for 100%</span>
                </div>
                <div className="p-3 rounded-lg bg-bg-raised border border-border flex items-center justify-between">
                  <span className="text-ink-muted">Send link & recipient begins</span>
                  <span className="text-amber-400">Delayed notification</span>
                </div>
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-between font-bold text-rose-400">
                  <span>Traditional Sequential Delay</span>
                  <span>Wait until 100% before sharing</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-ink-muted flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-faint shrink-0" />
              <span>Recipient has zero visibility during the upload.</span>
            </div>
          </div>

          {/* PushPostVault Live Pipeline */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-bg-surface to-bg-raised p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Live Handoff • Instant Link
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  PushPostVault Live
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Progress
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink">Instant Link at 0% + Live Progress</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                As soon as you select your file, you get a live share link immediately. Share it right away. The recipient joins the live session, watches the real-time chunk progress, and auto-downloads the moment assembly finishes.
              </p>

              <div className="space-y-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300">
                  <span>Generate Link &amp; Share with Recipient</span>
                  <span className="font-bold">Instant (0 Seconds)</span>
                </div>
                <div className="p-3 rounded-lg bg-bg-raised border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-ink-muted">Sender Upload + Recipient Live Standby</span>
                  <span className="text-emerald-400">Live Progress Stream</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-between font-bold text-emerald-300">
                  <span>Verified Single-Use Handoff</span>
                  <span>Instant download upon verified assembly</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-ink-muted flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AES-256 encrypted at rest &bull; Auto single-use burn</span>
              </div>
              <Link href="/live" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs h-10 px-5 gap-2">
                  Try Live Share Now <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-ink-muted font-mono">
          <span className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Up to 2 GB per guest transfer
          </span>
          <span className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-accent" /> Live byte & percentage telemetry
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero account registration needed
          </span>
        </div>
      </div>
    </section>
  );
}
