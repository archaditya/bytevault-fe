"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Do I need an account to send a file?",
    a: "No. Instant Share lets you upload a file of up to 2 GB and share a link without signing up. Create an account if you want to keep, organise and manage files over time.",
  },
  {
    q: "What happens to a file after it is shared?",
    a: "Instant Share links expire automatically and can be limited to a single download, after which the file is deleted. Signed-in users can also set passwords, cap downloads and revoke a link at any time.",
  },
  {
    q: "What happens if my connection drops mid-upload?",
    a: "Uploads are tracked chunk by chunk. When you reconnect, the transfer resumes from the last completed chunk and nothing already uploaded is sent again.",
  },
  {
    q: "Is there a limit on file size?",
    a: "Yes. Free accounts can upload files of up to 2 GB each and use up to 5 GB in total. See the pricing page for paid plans.",
  },
  {
    q: "How do I collect files from a client?",
    a: "Sign in, open Collect and create a request link. Send it to your client and they can upload without an account. Their files arrive in a Received folder in your Files. You set the size limit, file limit and expiry, and can revoke the link at any time.",
  },
  {
    q: "Does PushPostVault rate limit requests?",
    a: "Yes. To prevent abuse and keep things fair, API endpoints are rate limited. If you exceed the limit, requests temporarily return a 429 status code.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-b border-border py-20">
      <div className="container">
        <div className="mb-10 max-w-xl">
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Frequently asked
          </h2>
        </div>

        <div className="max-w-2xl divide-y divide-border rounded-md border border-border bg-bg-surface">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q} className="px-5">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-[14px] font-medium text-ink focus-visible:outline-none"
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <Plus
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200",
                      isOpen && "rotate-45"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-56 pb-4 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="text-[13px] leading-relaxed text-ink-muted">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
