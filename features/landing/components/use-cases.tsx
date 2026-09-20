const cases = [
  {
    who: "Freelancers",
    what: "Deliver final files to a client without making them sign up for anything.",
  },
  {
    who: "Video editors",
    what: "Send multi-gigabyte cuts that finish even when the connection is unreliable.",
  },
  {
    who: "Agencies",
    what: "Gather logos, contracts and briefs in one place instead of across email threads.",
  },
  {
    who: "Photographers",
    what: "Hand over a gallery as a link that expires when the job is done.",
  },
];

export function UseCases() {
  return (
    <section className="border-b border-border py-20">
      <div className="container">
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Built for handing files over.
        </h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {cases.map((c) => (
            <div key={c.who} className="border-t border-border-strong pt-4">
              <h3 className="text-[15px] font-medium text-ink">{c.who}</h3>
              <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-ink-muted">{c.what}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
