# Roasthouse Daneh (رُست‌خانهٔ دانه)

A production-oriented storefront and admin panel for a Persian specialty coffee
roastery. Coffee and powders are sold **by weight** (per gram, priced per kilo),
gear is sold **by unit**, and customers can build their own blend with a slider —
the price per kilo is recalculated live from the weighted average of the beans
they picked.

The whole interface is Persian and right-to-left. There is no UI kit, no CSS
framework, no state library, no charting library, no Jalali-calendar package and
no TypeScript. The Jalali calendar, the reporting buckets, the product artwork
and the RTL stylesheet are all written from scratch, on purpose — see
[Engineering decisions](#engineering-decisions).

## Screenshots

### Storefront

**Home.** The hero is the whole buying model in miniature: choose a coffee, drag
the weight anywhere from 100 g to 2 kg, and the price is recalculated from the
per-kilo rate as you drag. The interface is Persian and right-to-left
throughout, from one stylesheet with no mirroring pass.

![Storefront home page: an illustrated cafe scene behind a price-scale widget with a coffee selector, a 100 g to 2 kg weight slider and a live total](screenshots/home.png)

**Catalogue.** Roast-level filter chips carry their own counts, and with no
filter applied the list stays grouped by roast. Weight and grind are chosen per
card, so one coffee goes into the cart ground for espresso and the next as whole
bean. Every bean illustration is SVG generated from the product's own data — a
new shop has no photographs, and placeholder boxes were the alternative.

![Coffee catalogue: roast-level filter chips with counts, search and sort, and product cards showing generated bean artwork, tasting-note tags, a roast meter, weight buttons and a grind dropdown](screenshots/catalog.png)

**Blend builder.** Both modes are visible in one shot: the two cards on the left
are in slider mode, and the card on the right is mid-pour in the visual mode,
where sacks tip into the hopper one stage at a time. The visual mode is not a
parallel implementation — it holds no blend state of its own, receives the same
`mix` array, calls the same `applyPercent`, and finishes through the same
`addWeighed`. A blend dragged together with sliders and the same blend poured in
the visual mode produce a byte-identical cart line, which is why `mixSignature`
and `buildLine` live in `web/src/lib/cartLine.js` rather than inside the React
context: a test can hold both paths to it. Switching modes mid-blend therefore
loses nothing, and under `prefers-reduced-motion` no timers run at all — one
click goes straight to the finished bag. See
[Two ways to build a blend, one set of logic](#two-ways-to-build-a-blend-one-set-of-logic).

![House blends: two cards showing per-bean percentage sliders with live per-kilo prices and a running total of 100%, and a third card running the visual mode with stage markers and an illustration of sacks pouring into a hopper](screenshots/mix.png)

### Admin panel

**Products.** The same filter, search and sort vocabulary as the storefront,
plus stock and a per-item on/off switch. Switching an item off pulls it from the
catalogue, from `sitemap.xml`, and from its own URL, which then returns a real
404 with `noindex` rather than a redirect.

![Admin product list: kind tabs for coffee, gear and powder, group filter chips with counts, and a table of items with thumbnail, slug, group, price per kilo, stock, an on-site toggle and edit/delete actions](screenshots/admin.png)

**New product.** The pane on the left is not a mockup of the card — it is the
storefront's own `ItemCard` component, mounted live against the form state. That
is the reason the admin panel loads the catalogue in the browser rather than on
the server. Typing the English slug is also what seeds the generated artwork,
so the drawing appears before anything is saved.

![New-product form: a live card preview on the left rendered by the real storefront component, and fields on the right for kind, group, name, English slug, origin, process and tasting notes](screenshots/admin%20add%20items.png)

**Reports.** Buckets by day, week, month and year in the Jalali calendar the
shop owner actually uses — Saturday week starts, and Tehran's offset resolved at
each specific instant rather than assumed constant, because Iran abolished DST
in 2022 and older orders were recorded at `+04:30`. The date maths, the share
bars and the streamed CSV/JSON exports are all hand-written: no calendar
package, no charting library.

![Admin reports: Jalali date range controls, KPI tiles for revenue, order count, average order and kilograms sold, and a daily table with inline share bars](screenshots/admin%20reports.png)

## Tech stack

| Layer         | Choice                                       |
| ------------- | -------------------------------------------- |
| Database      | MongoDB 8 + Mongoose 8                       |
| API           | Express 4, ESM throughout                    |
| Auth          | JSON Web Tokens + bcrypt, admin-only         |
| Uploads       | multer, random filenames, 4 MB cap           |
| Compression   | compression (gzip on every API response)      |
| Hardening     | helmet on the API, nonce CSP on pages, cors, express-rate-limit |
| UI            | Next.js 16 (App Router) + React 19           |
| Fonts         | next/font — self-hosted, fetched at build time |
| Tests         | Vitest (333 tests, no database required)     |
| Lint / format | ESLint 9 (flat config) + Prettier            |
| CI            | GitHub Actions — install, lint, format, test, build |

Node 22+. No TypeScript, no state library, no UI kit, no CSS framework, no
Jalali-date library, no charting library, no SEO library — all hand-written.

## Architecture

```
shared/           npm workspace — the code both sides must agree on
  pricing.js        tiers, shipping, rounding, blend maths
  taxonomy.js       the allowed keys (kinds, groups, shapes, tastes, grinds)

  seo.js            product URLs, page titles, JSON-LD, sitemap, robots

server/           Express + Mongoose, port 4000 — API only, serves no HTML
  src/index.js      app assembly, compression, security headers, error mapping
  src/models/       Item · Order · Admin · ClubMember · Content
  src/routes/       auth · items · orders · content · club · stats · reports · seo
  src/lib/          jalali.js · stock.js · track.js · cors.js · siteUrl.js · upload.js
  src/middleware/   auth.js (JWT guard) · rateLimit.js (login · order · track)

web/              Next.js App Router, port 3000 (proxies /api and /uploads to :4000)
  src/proxy.js      per-request nonce CSP and the other security headers
  src/app/          the route table *is* the folder tree
                      layout.jsx        rtl shell, self-hosted fonts, modal slot
                      page.jsx          home — reads the catalogue on the server
                      coffee|gear|powder/[slug]/   product pages, one implementation
                      @modal/           intercepting routes: the product modal
                      track/            public order lookup
                      admin/            login outside the gate, eight screens inside
  src/context/      ShopContext (catalogue + cart) · AuthContext (admin session)
  src/lib/          data.js (server reads) · metadata.js · cartStorage.js
                    art.js (generated SVG) · blend.js · blendVisual.js
                    cartLine.js · groups.js · format.js · seo.js
  src/components/   storefront, both blend-builder modes, and admin/

tests/            Vitest, run from the repo root against all three workspaces
docs/             design notes, data model, algorithms, known weaknesses (Persian)
```

**One model for three product types.** Coffee, gear and powder all live in a
single `Item` document discriminated by `kind`. The type-dependent rules
(which groups are valid, which artwork keys apply, whether it is grindable)
are concentrated in one `pre('validate')` hook rather than spread across three
models — so the admin panel, the API routes and the product card are also one
of each.

**The client never decides anything that matters.** It computes prices for
display, but every price is recomputed server-side at checkout, and every write
from the admin panel passes through an explicit whitelist.

## Engineering decisions

### Server-side price recalculation

`POST /api/orders` ignores every number the browser sends. It re-reads each
item — and each bean inside each custom blend — from the database, revalidates
the grind, the blend percentages and the weights, and recomputes the totals
from scratch. The request body supplies intent (which slug, how many grams,
what mix), never money.

The tier discounts (5% from 1kg, 10% from 3kg, 15% from 5kg, weighed goods
only) and the free-shipping threshold live in `shared/pricing.js`, which both
sides import. That module used to be duplicated on both sides,
kept in sync by hand; the two copies could drift and the customer would be
quoted one number while a different one was recorded, with no error anywhere.
It is now a single npm workspace package, so divergence is not something we
detect — it is something that cannot happen.

### Orders are snapshots, not references

An order line stores `name`, `unitPrice`, `lineTotal`, the grind label and the
full blend composition with bean names — not just a slug pointing at the
current `Item`. Raising a coffee's price next week must not silently rewrite
last week's invoice, and deleting a discontinued bean must not turn an old
order into `undefined`. The receipt returned to the customer is read back out
of the saved order for the same reason.

### Atomic stock reservation

`Item.stock` is `null` for unlimited (the default, so nothing needed
migrating), a number otherwise. Reserving is a single conditional update per
line:

```js
Item.findOneAndUpdate(
  { slug, stock: { $gte: need } },
  { $inc: { stock: -need } },
  { new: true }
);
```

The condition and the decrement happen inside one document lock, so two
customers racing for the last 500g cannot both win — one gets the coffee, the
other gets a 409 and a Persian explanation. No transactions are involved,
which matters because a single-node MongoDB does not offer them.

Because each line reserves separately, a multi-line order can fail on its third
line after two have already been decremented. Every successful reservation is
therefore recorded and released if any later line fails, or if `Order.create`
itself throws. An order is placed in full or not at all.

### Order tracking without accounts

Customers have no login, so after closing the receipt they had no way to see
where their order was. `GET /api/orders/track` takes the pair the customer
already holds — order code plus the phone number they gave — and returns the
order only when both match.

Three rules keep that endpoint from becoming an oracle:

- **One answer for two failures.** A valid code with the wrong phone returns
  exactly what a nonexistent code returns. Otherwise the page becomes a way to
  enumerate orders: try codes, learn which ones exist, and from that the shop's
  volume and growth rate.
- **Constant-time comparison.** Returning faster for a missing code would leak
  through timing what the identical message hides, so the lookup always runs a
  comparison, and the comparison hashes both sides first — `timingSafeEqual`
  throws on unequal lengths, and that throw is itself a leak.
- **An explicit output whitelist.** `publicOrderView` rebuilds the response
  field by field rather than deleting unwanted ones, so any field added to the
  model later stays out by default. The delivery address, phone and customer
  note are deliberately excluded: seeing an order's status does not require the
  address, and a lucky guess should not hand over where someone lives.

A third rate limiter guards it — more generous than the order limiter, since a
real customer may mistype, but tight enough that scanning the code space is
not worth it.

### Two ways to build a blend, one set of logic

The blend builder has a plain slider mode and an optional visual mode where
sacks tip into a hopper stage by stage. The visual mode holds no blend state of
its own: it receives the same `mix` array, calls the same `applyPercent`, and
finishes by calling the same `addWeighed`. Switching between modes therefore
loses nothing, and a blend built either way produces a byte-identical cart
line — `mixSignature` and `buildLine` were lifted out of the React context into
`web/src/lib/cartLine.js` precisely so that claim could be tested.

What is specific to the visual mode is only presentation maths, kept pure in
`blendVisual.js`: a fixed time budget split between sacks by share (so a
seven-bean blend does not take three times as long as a two-bean one), the
hopper fill level as a cumulative percentage, and the geometry that keeps each
sack's mouth over the hopper regardless of how large the sack is drawn.
JavaScript only marks the stage boundaries; the motion between them is CSS.
With `prefers-reduced-motion`, no timers run at all and one click goes straight
to the finished bag.

### A hand-rolled Jalali calendar

Reports bucket by day, week, month and year in the calendar the shop owner
actually uses: مرداد means Mordad, not August, and the week starts on Saturday.
That alone would justify a library. The reason there isn't one is the time
zone: Iran abolished DST in 2022, so the offset is `+03:30` today — but orders
placed before that were at `+04:30`, and a fixed offset puts some of them in
the wrong day. `server/src/lib/jalali.js` asks `Intl` for the real offset at
each specific instant instead of assuming a constant, then converts. It is
~280 lines, dependency-free, and tested against the boundaries that actually
break: Nowruz, leap years, week starts, and DST-era timestamps.

### Generated product artwork

A new shop has no photographs. Rather than ship placeholder boxes,
`web/src/lib/art.js` draws every product as an SVG derived from its own
data: the bean colour comes from the roast level (1–5), the background palette
from the category, and the scatter of beans from a seeded PRNG keyed on the
slug — so a product's artwork is stable forever, and no two products look
alike. Gear and powders get their own shape vocabulary (36 gear shapes, 14
powder shapes, 16 tones), picked from dropdowns in the admin panel that are
generated from the same key lists the server validates against. Uploading a
real photo replaces the drawing.

### Details worth a second look

- **CSV injection guard** — exported cells starting with `= + - @` are prefixed
  with an apostrophe, since customer-written addresses land in a file that
  Excel will happily treat as formulas. Exports are UTF-8 with a BOM so Persian
  opens correctly.
- **Streamed exports** — CSV and JSON backups stream from a Mongo cursor rather
  than building the array in memory.
- **Token invalidation** — the JWT carries a `tokenVersion`; changing the admin
  password bumps it and every existing session dies.
- **Rate limiting that actually works behind a proxy** — `trust proxy` is
  enabled only in production or behind an explicit flag, because enabling it
  unconditionally lets any client forge `X-Forwarded-For` and walk around the
  limit, while omitting it behind nginx gives every visitor one shared bucket.
- **CORS fails loudly** — an unset `CLIENT_ORIGIN` in production exits the
  process instead of defaulting to "allow every origin".
- **Uploads are locked down twice** — SVG is not in the accepted MIME list (it
  is an XML document that can carry `<script>`, and it would be served from the
  shop's own origin), and `/uploads` responses carry `nosniff`, a
  `default-src 'none'; sandbox` CSP and forced download for document-like
  extensions, so files uploaded before that rule cannot execute either.
- **Generated SVG is escaped at the source** — `art.js` returns a string that
  React injects verbatim, so every admin-supplied name passes through `esc()`
  before it reaches an `aria-label`. A test suite checks all four generators
  with hostile names, and one test checks the checker.
- **Logical CSS properties** — `inset-inline-start`, `margin-block-end`,
  `padding-inline`. One stylesheet, no RTL mirroring pass.
- **Persian error messages at every layer**, from Mongoose validators to the UI.
  Console output stays English, because the Windows terminal renders Persian as
  `?`.

## Running locally

Requires Node 22+ and a running MongoDB on `localhost:27017`.

```bash
git clone <repo> && cd Ghahve
cp server/.env.example server/.env    # then edit JWT_SECRET
cp web/.env.example web/.env.local    # optional in development
npm run setup                         # installs all workspaces, then seeds
npm run dev                           # API on :4000, Next on :3000
```

| URL                            | What                                  |
| ------------------------------ | ------------------------------------- |
| `http://localhost:3000`        | storefront                            |
| `http://localhost:3000/admin`  | admin panel                           |
| `http://localhost:3000/track`  | public order tracking                 |
| `http://localhost:4000/api`    | API                                   |

The browser only ever talks to Next; Next forwards `/api`, `/uploads`,
`/sitemap.xml` and `/robots.txt` to Express, so there is one origin and no CORS
problem in development.

The seed creates 106 products, the default site content and the initial admin
account from `server/.env`.

| Script                | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | API and Next together                                   |
| `npm run build`       | production build into `web/.next` (needs network for fonts) |
| `npm start`           | both processes in production mode                       |
| `npm run seed`        | add anything missing, touch nothing existing            |
| `npm run seed:reset`  | drop and rebuild the database                           |
| `npm run lint`        | ESLint                                                  |
| `npm run format`      | Prettier, writing                                       |
| `npm test`            | Vitest, single run                                      |

This is an npm workspace: one `npm install` at the root covers `shared`,
`server` and `web`, and there is a single `package-lock.json`.

## Environment variables

All server-side, in `server/.env` (see `server/.env.example`):

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/ghahve` | swap for an Atlas URI unchanged |
| `JWT_SECRET` | — | **required**; change it before deploying |
| `TOKEN_HOURS` | `12` | admin session lifetime |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / — | used once, at first seed |
| `CLIENT_ORIGIN` | — | comma-separated allowed origins. **Required in production** — the server refuses to start without it rather than allowing every origin |
| `RATE_LIMIT_LOGIN_MAX` / `_WINDOW_MIN` | `5` / `15` | login attempts per IP |
| `RATE_LIMIT_ORDER_MAX` / `_WINDOW_MIN` | `5` / `60` | orders per IP |
| `RATE_LIMIT_TRACK_MAX` / `_WINDOW_MIN` | `20` / `15` | order-tracking lookups per IP |
| `RATE_LIMIT_DISABLED` | unset | manual testing only; always off in `NODE_ENV=test` |
| `TRUST_PROXY` | unset | set to `1` behind nginx/Cloudflare; implied by `NODE_ENV=production` |

`server/.env` is gitignored.

## Tests

```bash
npm test          # single run
npm run test:watch
```

333 tests, no database and no real browser — everything under test is a pure
function, a module with its dependency injected, or (in two files) a component
rendered into jsdom. Coverage is deliberately aimed at the logic where a silent
wrong answer costs money:

| File | What it pins down |
| --- | --- |
| `tests/pricing.test.js` | tier boundaries (999g vs 1000g), discounts on weighed goods only, rounding, blend weighted averages, shipping thresholds |
| `tests/blend.test.js` | the slider invariant: whatever the customer does, the percentages still sum to exactly 100 |
| `tests/jalali.test.js` | Gregorian↔Jalali conversion, Saturday week starts, Nowruz and leap years, bucket series |
| `tests/stock.test.js` | the reservation contract, including full rollback when a later line fails — against a fake model that mimics Mongo's atomic filter-and-update |
| `tests/taxonomy.test.js` | every shared key has exactly one Persian label, and the UI orderings are the shared arrays rather than copies of them |
| `tests/cors.test.js` | production without `CLIENT_ORIGIN` throws instead of opening up |
| `tests/rate-limit.test.js` | limiters are disabled under `NODE_ENV=test`, so they can never make an unrelated suite flaky |
| `tests/track.test.js` | a wrong phone is indistinguishable from a missing code, phone/code normalisation, and that the public view never leaks a field the model gains later |
| `tests/upload.test.js` | SVG is not accepted, the `/uploads` headers are set, and ordinary images are still not forced to download |
| `tests/card-art.test.js` | hostile product names cannot add an attribute to the `<svg>` tag or close it — plus a meta-test that the checker itself has teeth |
| `tests/blend-visual.test.js` | the pour budget is spent exactly, the hopper level tracks cumulative share, and every sack's mouth lands on the hopper |
| `tests/cart-hydration.test.jsx` | a saved cart survives a full server-render → hydrate cycle: the server HTML claims no cart, storage is never overwritten with `[]`, and a partially-seeded catalogue cannot silently drop lines from an order |
| `tests/cart-storage.test.js` | the stored cart is re-validated rather than trusted, and a hostile or absent storage cannot break the shop |
| `tests/next-metadata.test.js` | every tag `headTags` defines still reaches Next's metadata object — the successor to the old server/browser head-parity test |
| `tests/next-routes.test.js` | every product kind has a real route folder, in both directions, since the App Router cannot generate them from taxonomy |
| `tests/item-card.test.jsx` | every kind of product renders a real `<a href>` to its own page, with and without prose |

CI runs install → lint → format check → test → build on every push and pull
request.

## Known limitations

Honest and deliberate, with the reasoning and proposed fixes written up in
[`docs/11-weaknesses.md`](docs/11-weaknesses.md): there is no payment gateway
(orders are confirmed by phone), no customer accounts (only the code-plus-phone
tracking page) and no SMS verification. The rate limiters count in process memory,
so a multi-process deployment would need a shared store. Blend stock is tracked
on the blend item itself rather than drawn down from its component beans, so
blends are best left unlimited.

That document also records what has been fixed and what has not, each item
annotated with what actually shipped and how it differed from the original
proposal — including item 26, where the original decision *not* to server-render
is kept on the record next to the reasoning that later reversed it.

## Further reading

The `docs/` directory is a full Persian write-up of the project — architecture,
data model, algorithms, design system, the reasoning behind each decision, and
a candid list of weaknesses. [`docs/README-fa.md`](docs/README-fa.md) is the
Persian operator guide for whoever actually runs the shop.
