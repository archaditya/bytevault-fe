import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Instant Share", href: "/instant" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="py-16 font-sans">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/PushPostVault-logo.svg"
                alt="PushPostVault"
                width={136}
                height={27}
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="mt-3 max-w-[220px] text-[12px] text-ink-muted">
              Send large files and collect files from anyone.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="label-eyebrow">{col.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] text-ink-muted hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[12px] text-ink-faint sm:flex-row">
          <span>&copy; {new Date().getFullYear()} PushPostVault. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-ink">Terms &amp; Conditions</Link>
            <Link href="/subscription-policy" className="hover:text-ink">Subscription Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
