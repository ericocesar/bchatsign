# @bchatsign/docs

The Bchatsign documentation site, built with [Next.js](https://nextjs.org/) and [Fumadocs](https://fumadocs.dev/). Published at [docs.bchatsign.com](https://docs.bchatsign.com).

Content lives under `content/docs/` as MDX. See [WRITING_STYLE.md](../../WRITING_STYLE.md) for the documentation writing conventions.

```bash
# From the monorepo root
npm run dev --filter=@bchatsign/docs
```

## Structure

- `content/docs/`: Documentation pages (MDX).
- `lib/source.ts`: Content source adapter.
- `lib/layout.shared.tsx`: Shared layout options.
