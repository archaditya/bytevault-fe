"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Box, Flame, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export function LandingNav() {
  const { isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md font-sans">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <Image
            src="/pushportvault-logo.svg"
            alt="PushPortVault"
            width={140}
            height={28}
            priority
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 text-[13px] text-ink-muted md:flex">
          <Link
            href="/instant"
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
          >
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            Instant Share 🔥
          </Link>
          <Link href="/#features" className="hover:text-ink transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
          <Link href="/#architecture" className="hover:text-ink transition-colors">Architecture</Link>
          <Link href="/#faq" className="hover:text-ink transition-colors">FAQ</Link>
          <Link href="/contact" className="hover:text-ink transition-colors">Contact</Link>
        </nav>

        {/* Desktop Auth Actions */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/instant"
            className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-400 border border-amber-500/30"
          >
            <Flame className="h-3 w-3 text-amber-400" />
            Instant
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-surface text-ink-muted hover:text-ink hover:border-border-strong transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-bg-surface px-4 py-5 shadow-2xl md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-3">
            {/* Highlighted Instant Share Callout */}
            <Link
              href="/instant"
              onClick={closeMenu}
              className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3 text-amber-400 font-medium text-[13px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/20">
                  <Flame className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold text-ink">Instant Share</div>
                  <div className="text-[11px] text-amber-400/80">No account required • Auto-expiry</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </Link>

            {/* Navigation links */}
            <div className="flex flex-col gap-1 pt-1 text-[14px]">
              <Link
                href="/#features"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-ink-muted hover:bg-bg-overlay hover:text-ink transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-ink-muted hover:bg-bg-overlay hover:text-ink transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/#architecture"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-ink-muted hover:bg-bg-overlay hover:text-ink transition-colors"
              >
                Architecture
              </Link>
              <Link
                href="/#faq"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-ink-muted hover:bg-bg-overlay hover:text-ink transition-colors"
              >
                FAQ
              </Link>
              <Link
                href="/contact"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-ink-muted hover:bg-bg-overlay hover:text-ink transition-colors"
              >
                Contact
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex flex-col gap-2 border-t border-border pt-4 mt-1">
              {isAuthenticated ? (
                <Button className="w-full justify-center" asChild onClick={closeMenu}>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="w-full justify-center" asChild onClick={closeMenu}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button className="w-full justify-center" asChild onClick={closeMenu}>
                    <Link href="/register">Get started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
