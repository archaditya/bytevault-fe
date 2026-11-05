"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCw, Home } from "lucide-react";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PushPostVault Global Root Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0b0f17] text-[#f1f5f9] min-h-screen flex items-center justify-center p-6 font-sans antialiased">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertOctagon className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              CRITICAL ROOT ERROR
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Application Error
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              A critical failure occurred while loading the application shell.
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-medium h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" /> Reload Application
            </button>
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-medium h-10 px-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-200 transition-colors"
            >
              <Home className="h-3.5 w-3.5" /> Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
