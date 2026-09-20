# PushPostVault UI redesign - final (cumulative)

Drop-in overwrite on your original project. It replaces all earlier zips.
No `.env`, no dependencies, no backend or API code touched. `tsc --noEmit` passes.
Only markup, classes and copy changed; request/response logic is untouched.

## Theme (whole app)
- `tailwind.config.js`, `app/globals.css`: indigo accent -> logo orange (#FF6A00), warm near-black
  surfaces, yellow `live` state, `bg-brand-gradient`, `bg-brand-glow`, `shadow-glow`.
- Native checkboxes / radios / range inputs use the brand colour instead of browser blue.
- `components/ui/button.tsx`: primary button = logo gradient with dark text
  (white on orange fails WCAG at 2.87:1; dark text is 6.89:1).
- Hard-coded chart and file-kind colours mapped to the new tokens.

## Public pages
- Landing (`app/page.tsx` + `features/landing/*`): "Send large files. Collect them from anyone."
  Send is live; Collect is labelled "Coming soon". Placeholder testimonials replaced by use cases.
- `app/instant` (sender) and `app/s/instant/[token]` (recipient): plain language, brand styling,
  keyboard-accessible drop zone, expiry shown as "1 hour".
- `app/contact`: product-facing copy (no more "chunking architectures" / "support ticket");
  "Get notified" links from the landing page open it with the subject pre-filled
  (`/contact?topic=collect`).
- `app/pricing`, `app/terms`, `app/subscription-policy`: old names (ByteVault / cloud storage)
  replaced with PushPostVault so the legal pages match the site.
- `app/layout.tsx`: send-and-collect metadata + `metadataBase`
  (set `NEXT_PUBLIC_SITE_URL=https://www.pushpostvault.com` in Vercel).

## Signed-in app and admin
- Sidebar, auth screens (real logo icon), admin pages: brand names and colours updated.
- `lib/razorpay.ts`: checkout description is now "PushPostVault subscription"
  (was "Cloud Storage Subscription"). Change this only if your new gateway needs a different text.
- `app/s/[id]/page.tsx`: removed the "10GB with zero-knowledge encryption" line (not accurate).

## Checked, no changes needed
Dashboard, Files, Transfers, Shared links, Settings, Profile, and all admin pages render correctly
with the new theme. No horizontal overflow at 390px on any main page.

## Intentionally left alone
- localStorage key `PushPort-transfers` (renaming it would drop users' saved transfer history).
- `lib/mock/*` sample data and one code comment that still say PushPort.
- Cloudflare R2 / AWS S3 tag colours (vendor brand colours).

## Safe to delete (no longer imported)
- `features/landing/components/testimonials.tsx`
- `features/landing/components/architecture-overview.tsx`

## Before you deploy
- Collect is a placeholder. Remove the "Coming soon" labels only when the feature ships.
- Free-plan numbers in the FAQ (2 GB per file, 5 GB total) come from your old FAQ; confirm they
  match your live plan settings.
- Success screen after an Instant Share upload and the payment flow were not exercised (they need
  the real backend). Test both once.
