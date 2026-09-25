# IDM Inbox

IDM Inbox is a static, independent reader for Ethereum mainnet input-data messages. The home page pins the IMD dev board and any address or ENS name can be opened as an email-style inbox.

The production page supports searching, following and reading threads, plus EIP-6963 browser-wallet message/reply transactions and optional builder tips.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the URL Vite prints. To inspect the exact production export:

```sh
npm run build
npm run preview
```

`dist/` is committed and can be published directly to IPFS or any static host (for example, add the `dist/` directory to IPFS and publish its CID). Vite uses `base: './'`, hash routes, and relative built assets, so an HTTP rewrite is unnecessary.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run ci
```

Tests are fully offline. `npm run ci` runs lint, Vitest, the TypeScript production build and the compressed asset-size report.

## Refresh the fixture

```sh
npm run fixture
```

This command fetches up to four current Blockscout v2 pages for the dev board and writes `fixtures/dev-board.json`. It is a development command only; builds and tests never fetch it. The committed fixture was fetched live on 2026-09-25 and has `live: true`.

## Data sources and limits

- Blockscout v2 is primary: 50 transactions per page, four pages initially and four more per “Load older” action.
- After two qualifying Blockscout failures, the Routescan Etherscan-compatible `txlist` endpoint is used in descending pages of 1,000.
- History is capped at 10,000 transactions. Refresh checks at most four Blockscout pages and marks a response partial if none meets the cache.
- Public Ethereum RPCs from publicnode, drpc and 1rpc resolve ENS names. These services can see the viewer's IP and queried address.
- A connected wallet sends message data and tips directly. Message text is UTF-8 calldata, tips are plain ETH transfers, and every send requires Ethereum mainnet.
- ETH/USD comes from Chainlink and falls back to Blockscout's stats endpoint. Unavailable prices disable USD presets but not custom ETH.
- The browser keeps follows, unread baselines, opened threads and accepted requests in local storage. It disables local state on shared `/ipfs/` and `/ipns/` gateway paths or when storage fails. There is no server, analytics, cookie or external script/font.

An IDM is a successful transaction with at least one input byte that strictly decodes as UTF-8, has no disallowed control characters and contains at least two Unicode letters. Value may be non-zero. Display removes bidi and zero-width controls and labels that removal.

All endpoints, addresses, RPCs, paging limits and intervals live in `src/config.ts`; edit that one file to change them.

## Validation record

Run on 2026-09-25:

- `npm run fixture` — passed; two live pages saved. The fixed block window contains 83 transactions, 75 messages, 39 posts, 21 non-self counterparties and one contract recipient.
- `npm run typecheck` — passed (TypeScript strict, no emit).
- `npm run lint` — passed with zero warnings.
- `npm test` — passed: 9 files, 28 tests. Coverage includes fixture ordering, untrusted text, accessibility, chain switching, exact UTF-8 encoding, fee arithmetic, wallet errors and empty-data tips.
- `npm run build` — passed; Vite generated relative production assets in `dist/`.
- `npm run size` — passed; production asset gzip total: 195.33 KB.
- Static policy scan — CSP is the first `head` child; production asset paths are relative; URL/address literals under runtime `src/` occur only in `src/config.ts`.

Frontend review used the [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), retrieved 2026-09-25. Reviewed `index.html`, `src/App.tsx`, `src/Composer.tsx`, `src/Tips.tsx`, `src/styles.css`, `src/review.css` and `src/ui.css`.

- `src/App.tsx:17`: added a keyboard skip link and main landmark target.
- `src/App.tsx`: controls use semantic buttons/links, async status is announced, external links are labelled, untrusted text stays in text nodes, and identifiers wrap safely.
- `src/styles.css:1`: controls meet 44 px, visible `:focus-visible` is present, text wraps/truncates, 360 px layout is single-column, and reduced motion/dark mode are handled.
- `src/ui.css:1`: fixed two-line previews, long flex content, notices and narrow-screen message/action wrapping.
- `src/Composer.tsx:19`: wallet-empty and coarse-pointer guidance stays actionable; transaction errors are inline and typed text survives rejection.
- `src/Tips.tsx:21`: the high-value dialog traps Tab and closes on Escape without sending.
- `src/ui.css:3`: composer/tip controls retain 44 px targets, wrap identifiers, and collapse to one column at 360 px.
- `src/review.css:1`: added touch behavior, hover feedback, balanced headings and horizontal-overflow protection.
- `index.html:1`: added theme color while retaining the required CSP as the first head child.

Automated interaction tests cover the pinned board, tabs, message safety, state banners, follow cap, search, routes and transaction primitives. No browser automation or screenshot tooling was available, so injected-wallet confirmation UI in a real extension, console/resource inspection, and visual comparison at mobile/desktop widths remain unperformed. The interface review found no remaining applicable serious issue; transient composer/tip state is intentionally not URL-backed.

## License

MIT
