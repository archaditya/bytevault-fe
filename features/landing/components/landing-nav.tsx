"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

const links = [
  { label: "Send", href: "/#send" },
  { label: "Collect", href: "/#collect" },
  // { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

export function LandingNav() {
  const { isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md font-sans">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <Image
            src="/PushPostVault-logo.svg"
            alt="PushPostVault"
            width={140}
            height={28}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-6 text-[13px] text-ink-muted md:flex">
          <Link
            href="/instant"
            className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-medium text-accent-bright transition-colors hover:bg-accent/20"
          >
            <Zap className="h-3.5 w-3.5" />
            Instant Share
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
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

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/instant"
            className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent-bright"
          >
            <Zap className="h-3 w-3" />
            Instant
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="animate-in slide-in-from-top-2 border-b border-border bg-bg-surface px-4 py-5 shadow-2xl duration-200 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/instant"
              onClick={closeMenu}
              className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 p-3 text-[13px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/20">
                  <Zap className="h-4 w-4 text-accent-bright" />
                </div>
                <div>
                  <div className="font-semibold text-ink">Instant Share</div>
                  <div className="text-[11px] text-ink-muted">No account needed. Links expire automatically.</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-accent-bright" />
            </Link>

            <div className="flex flex-col gap-1 pt-1 text-[14px]">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2 text-ink-muted transition-colors hover:bg-bg-overlay hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="mt-1 flex flex-col gap-2 border-t border-border pt-4">
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
