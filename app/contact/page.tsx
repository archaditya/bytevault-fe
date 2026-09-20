"use client";

import { useEffect, useState } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitContactQueryMutation } from "@/services/admin.service";
import { Mail, MessageSquare, ExternalLink, Github, Sparkles } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [success, setSuccess] = useState(false);
  const submitMutation = useSubmitContactQueryMutation();

  // "Get notified" links from the landing page arrive with ?topic=collect
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (topic === "collect") {
      setFormData((prev) => ({ ...prev, subject: "Notify me when Collect is available" }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData, {
      onSuccess: () => {
        setSuccess(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
      },
    });
  };

  // WhatsApp Prepopulated message redirect
  const whatsappUrl = `https://wa.me/919334106744?text=${encodeURIComponent(
    "Hi Archaditya, I'm reaching out about PushPostVault!"
  )}`;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink font-sans">
      <LandingNav />

      <main className="flex-1 container py-16 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_40%,transparent_100%)] pointer-events-none" />

        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">

          {/* Left Column: Creator Portfolio & Links */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">Contact us</h1>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                Questions about sending files, plans or billing? Write to us and we will reply by email.
              </p>
            </div>

            {/* WhatsApp Link */}
            <Card className="bg-bg-surface border-border-strong p-4 hover:border-accent/40 transition-colors flex items-start gap-3">
              <div className="h-9 w-9 bg-success/15 text-success rounded-md flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">WhatsApp</p>
                <p className="text-[11px] text-ink-muted mt-0.5">For quick questions.</p>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent mt-2 hover:underline">
                  Message us on WhatsApp <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>

            {/* Email Address Link */}
            <Card className="bg-bg-surface border-border-strong p-4 hover:border-accent/40 transition-colors flex items-start gap-3">
              <div className="h-9 w-9 bg-accent/15 text-accent rounded-md flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">Email</p>
                <p className="text-[11px] text-ink-muted mt-0.5">For billing and account help.</p>
                <a href="mailto:akkpk933@gmail.com" className="inline-flex items-center gap-1 text-[11px] text-accent mt-2 hover:underline">
                  akkpk933@gmail.com <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>

            {/* Creator Links Card */}
            <Card className="bg-bg-surface border-border-strong p-4 flex flex-col gap-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">Built by</p>
              <div className="flex flex-col gap-2.5 pt-1 text-[12px]">
                <a href="http://archadi.dev" target="_blank" rel="noreferrer" className="flex items-center justify-between text-ink hover:text-accent transition-colors">
                  <span>Creator Portfolio</span>
                  <span className="text-[11px] font-mono text-ink-muted">archadi.dev</span>
                </a>
                <a href="https://github.com/archaditya" target="_blank" rel="noreferrer" className="flex items-center justify-between text-ink hover:text-accent transition-colors">
                  <span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> Creator GitHub</span>
                  <span className="text-[11px] font-mono text-ink-muted">@archaditya</span>
                </a>
                <a href="https://github.com/archaditya/bytevault" target="_blank" rel="noreferrer" className="flex items-center justify-between text-ink hover:text-accent transition-colors">
                  <span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> PushPostVault Codebase</span>
                  <span className="text-[11px] font-mono text-ink-muted">repository</span>
                </a>
              </div>
            </Card>
          </div>

          {/* Right Column: Contact Form */}
          <div className="md:col-span-7">
            <Card className="bg-bg-surface border-border-strong p-6">
              {success ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-success/15 flex items-center justify-center text-success mb-4 animate-bounce">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-ink">Message sent</h3>
                  <p className="text-xs text-ink-muted mt-2 max-w-xs">
                    Thanks. We will reply to the email address you provided.
                  </p>
                  <Button size="sm" variant="secondary" className="mt-5" onClick={() => setSuccess(false)}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold text-ink">Send us a message</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-ink-muted">Your name</label>
                      <Input
                        required
                        name="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="h-9 text-[12px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-ink-muted">Email Address</label>
                      <Input
                        required
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="h-9 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-ink-muted">Subject</label>
                    <Input
                      required
                      name="subject"
                      placeholder="e.g. Question about my plan"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="h-9 text-[12px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-ink-muted">Message</label>
                    <Textarea
                      required
                      rows={5}
                      name="message"
                      placeholder="How can we help?"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="text-[12px]"
                    />
                  </div>

                  <Button type="submit" className="mt-2 w-full h-9" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? "Sending…" : "Send message"}
                  </Button>

                  {submitMutation.isError && (
                    <p className="text-[11px] text-danger font-medium mt-1">
                      {submitMutation.error.message}
                    </p>
                  )}
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
