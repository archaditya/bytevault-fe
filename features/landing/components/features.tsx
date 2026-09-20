const points = [
  {
    title: "No account to send",
    desc: "Upload up to 2 GB and share the link. Neither you nor the recipient signs up for anything.",
  },
  {
    title: "Expires on its own",
    desc: "Links expire automatically and can be limited to a single download, after which the file is deleted.",
  },
  {
    title: "Password when you need it",
    desc: "Add a password before you share. Signed-in users can also cap downloads and revoke a link at any time.",
  },
  {
    title: "Survives a bad connection",
    desc: "Uploads are split into chunks and checksummed. If the connection drops, only the unfinished chunk is sent again.",
  },
];

export function Features() {
  return (
    <section className="border-b border-border py-20">
      <div className="container grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Sending a big file shouldn&rsquo;t need a signup.
          </h2>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            Instant Share is live today. Drop a file, copy the link, done.
          </p>
        </div>

        <dl className="divide-y divide-border border-y border-border">
          {points.map((p) => (
            <div key={p.title} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
              <dt className="text-[15px] font-medium text-ink">{p.title}</dt>
              <dd className="text-[14px] leading-relaxed text-ink-muted">{p.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
