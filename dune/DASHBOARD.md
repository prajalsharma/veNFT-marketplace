# Vezo — Dune Analytics Dashboard (Mezo mainnet)

A professional, growth-style dashboard for the Vezo veNFT marketplace — counters, cumulative growth
areas, stacked daily bars, donut breakdowns, leaderboards, and interactive parameters.

Chain: **Mezo mainnet** (Dune indexes Mezo mainnet, not testnet).

## Contracts (Mezo mainnet)

| What | Address |
|---|---|
| VeNFTMarketplace | `0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570` |
| VeNFTBidding | `0xef35dc538b50549e95687a51e8aa542D485ea384` |
| SwapPaymentRouter | `0x638Bab65738bA7BcD47D3c1d6Cb4eaf6CC872617` |
| veBTC | `0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279` |
| veMEZO | `0xb90fdAd3DFD180458D62Cc6acedc983D78E20122` |
| BTC (native) | `0x7b7c000000000000000000000000000000000000` |
| MEZO | `0x7b7c000000000000000000000000000000000001` |
| MUSD | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |

Token amounts have **18 decimals** (divide by 1e18). Decoded tables use the names chosen at decode time:
the marketplace was decoded as **`Marketplace`** → `vezo_mezo.Marketplace_evt_<Event>`.

> Submit contracts for decoding at **https://dune.com/contracts/new**, namespace `vezo`, one at a time.

---

## Decoded tables you have

- `vezo_mezo.Marketplace_evt_Listed(listingId, seller, collection, tokenId, price, paymentToken, …)`
- `vezo_mezo.Marketplace_evt_Purchased(listingId, buyer, seller, price, …)`
- `vezo_mezo.Marketplace_evt_Cancelled(listingId, …)`
- `vezo_mezo.Marketplace_evt_ListedWithSnapshot(… intrinsicValueAtListing, discountBpsAtListing …)`
- `vezo_mezo.Marketplace_evt_CancelledWithContext(… originalPrice …)`
- `vezo_mezo.Marketplace_evt_PurchasedWithAnalytics(… collection, tokenId, price, paymentToken, protocolFee, discountBpsAtSale …)`

Every decoded table also has `evt_block_time`, `evt_block_number`, `evt_tx_hash`, `evt_index`, `contract_address`.

---

## Reusable label expressions

Paste these `case` blocks wherever a token or collection column is used:

```sql
-- token label (from a paymentToken column)
case paymentToken
  when 0x7b7c000000000000000000000000000000000000 then 'BTC'
  when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
  when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD'
  else 'OTHER' end
-- collection label (from a collection column)
case collection
  when 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279 then 'veBTC'
  when 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122 then 'veMEZO'
  else 'OTHER' end
```

---

## Interactive parameters (optional but recommended)

Dune auto-detects `{{name}}` in SQL and turns it into a control. When two queries share a param name,
one dashboard control drives both. Add these to any query:

- **Start date** — a `Text`/`Date` param named `start_date` (default `2026-01-01`):
  `where evt_block_time >= timestamp '{{start_date}}'`
- **Collection filter** — a `List` param named `collection` with values `All, veBTC, veMEZO`:
  `and ('{{collection}}' = 'All' or <collection label> = '{{collection}}')`

Example, parameterized daily volume:
```sql
select date_trunc('day', evt_block_time) as day,
       case paymentToken
         when 0x7b7c000000000000000000000000000000000000 then 'BTC'
         when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
         when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD' else 'OTHER' end as token,
       sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
where evt_block_time >= timestamp '{{start_date}}'
group by 1, 2
order by 1
```

---

## The query set

Create each as a **New query** (Dune SQL), Run, Save with a `vezo · …` name, then add a visualization.

### Section 1 — Headline counters

**Q1 · Core KPIs** → 4× **Counter**
```sql
select
  (select count(*) from vezo_mezo.Marketplace_evt_Purchased) as total_sales,
  (select count(*) from vezo_mezo.Marketplace_evt_Listed)    as total_listings,
  (select count(*) from vezo_mezo.Marketplace_evt_Cancelled) as total_cancels,
  (select count(distinct actor) from (
     select seller as actor from vezo_mezo.Marketplace_evt_Listed
     union
     select buyer  as actor from vezo_mezo.Marketplace_evt_Purchased
  ) t) as unique_traders
```

**Q2 · Volume & revenue by token** → **Table** + **Bar** (X=token, Y=volume) + **Donut** (label=token, value=volume)
```sql
select
  case paymentToken
    when 0x7b7c000000000000000000000000000000000000 then 'BTC'
    when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
    when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD' else 'OTHER' end as token,
  count(*)                              as sales,
  sum(cast(price as double))/1e18       as volume,
  sum(cast(protocolFee as double))/1e18 as protocol_revenue
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
order by volume desc
```

### Section 2 — Growth over time (the centerpiece)

**Q3 · Daily volume, stacked by token** → **Bar chart**, X=`day`, Y=`volume`, series/“group by”=`token`, **enable stacking**
```sql
select date_trunc('day', evt_block_time) as day,
       case paymentToken
         when 0x7b7c000000000000000000000000000000000000 then 'BTC'
         when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
         when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD' else 'OTHER' end as token,
       sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1, 2
order by 1
```

**Q4 · Cumulative volume by token** → **Area chart**, X=`day`, Y=`cumulative_volume`, series=`token`, **stacked area**
```sql
select day, token,
       sum(volume) over (partition by token order by day) as cumulative_volume
from (
  select date_trunc('day', evt_block_time) as day,
         case paymentToken
           when 0x7b7c000000000000000000000000000000000000 then 'BTC'
           when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
           when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD' else 'OTHER' end as token,
         sum(cast(price as double))/1e18 as volume
  from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
  group by 1, 2
) t
order by day
```

**Q5 · Cumulative listings vs sales** → **Area/Line**, X=`day`, series=`cumulative_listed`,`cumulative_sold`
```sql
with daily as (
  select day, sum(listed) as listed, sum(sold) as sold
  from (
    select date_trunc('day', evt_block_time) as day, 1 as listed, 0 as sold from vezo_mezo.Marketplace_evt_Listed
    union all
    select date_trunc('day', evt_block_time) as day, 0 as listed, 1 as sold from vezo_mezo.Marketplace_evt_Purchased
  ) u
  group by 1
)
select day,
       sum(listed) over (order by day) as cumulative_listed,
       sum(sold)   over (order by day) as cumulative_sold
from daily
order by day
```

**Q6 · Daily sales & new listings** → **Bar** (listings) + **Line** (sales), X=`day`
```sql
with s as (select date_trunc('day', evt_block_time) d, count(*) sales    from vezo_mezo.Marketplace_evt_Purchased group by 1),
     l as (select date_trunc('day', evt_block_time) d, count(*) listings from vezo_mezo.Marketplace_evt_Listed    group by 1)
select coalesce(s.d, l.d) as day, coalesce(sales,0) as sales, coalesce(listings,0) as listings
from s full outer join l on s.d = l.d
order by 1
```

### Section 3 — Users / adoption

**Q7 · Cumulative unique traders** → **Area** (`cumulative_traders`) + **Bar** (`new_traders`), X=`day`
```sql
with first_seen as (
  select actor, min(day) as d
  from (
    select seller as actor, date_trunc('day', evt_block_time) as day from vezo_mezo.Marketplace_evt_Listed
    union
    select buyer  as actor, date_trunc('day', evt_block_time) as day from vezo_mezo.Marketplace_evt_Purchased
  ) u
  group by 1
)
select d as day,
       count(*)                     as new_traders,
       sum(count(*)) over (order by d) as cumulative_traders
from first_seen
group by d
order by d
```

**Q8 · Daily active traders** → **Line/Bar**, X=`day`, Y=`active_traders`
```sql
select day, count(distinct actor) as active_traders
from (
  select date_trunc('day', evt_block_time) as day, seller as actor from vezo_mezo.Marketplace_evt_Listed
  union
  select date_trunc('day', evt_block_time) as day, buyer  as actor from vezo_mezo.Marketplace_evt_Purchased
) u
group by 1
order by 1
```

### Section 4 — Breakdowns

**Q9 · Sales & volume by collection** → **Donut** (label=collection, value=sales) + **Table**
```sql
select
  case collection
    when 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279 then 'veBTC'
    when 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122 then 'veMEZO' else 'OTHER' end as collection,
  count(*)                        as sales,
  sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
order by sales desc
```

**Q10 · Listing outcome funnel** → **Bar**, X=`stage`, Y=`n`
```sql
select stage, n from (
  select 'Listed'    as stage, 1 as ord, count(*) as n from vezo_mezo.Marketplace_evt_Listed
  union all select 'Sold',      2, count(*) from vezo_mezo.Marketplace_evt_Purchased
  union all select 'Cancelled', 3, count(*) from vezo_mezo.Marketplace_evt_Cancelled
) t
order by ord
```

**Q11 · Discount distribution at sale** → **Bar** (histogram), X=`bucket`, Y=`sales`
```sql
select bucket, sales from (
  select
    case
      when d < 0     then '01 · premium (<0%)'
      when d < 1000  then '02 · 0–10%'
      when d < 2500  then '03 · 10–25%'
      when d < 5000  then '04 · 25–50%'
      else                '05 · 50%+'
    end as bucket,
    count(*) as sales
  from (select cast(discountBpsAtSale as double) as d from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics)
  group by 1
) t
order by bucket
```

### Section 5 — Leaderboards & feed

**Q12 · Top sellers** → **Table**
```sql
select seller,
       count(*)                        as sales,
       sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1 order by volume desc limit 15
```

**Q13 · Top buyers** → **Table**
```sql
select buyer,
       count(*)                        as purchases,
       sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1 order by volume desc limit 15
```

**Q14 · Live activity feed** → **Table**
```sql
select evt_block_time as time, 'Listed' as action, seller as actor,
       cast(tokenId as varchar) as token, cast(price as double)/1e18 as amount, evt_tx_hash
from vezo_mezo.Marketplace_evt_ListedWithSnapshot
union all
select evt_block_time, 'Purchased', buyer,
       cast(tokenId as varchar), cast(price as double)/1e18, evt_tx_hash
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
union all
select evt_block_time, 'Cancelled', seller,
       cast(tokenId as varchar), cast(originalPrice as double)/1e18, evt_tx_hash
from vezo_mezo.Marketplace_evt_CancelledWithContext
order by time desc
limit 200
```

### Section 6 — Bidding & swaps (add once those contracts are decoded)

**Q15 · Bids created vs accepted (daily)** → **Bar**, X=`day`, series=`created`,`accepted`
```sql
with c as (select date_trunc('day', evt_block_time) d, count(*) created  from vezo_mezo.VeNFTBidding_evt_BidCreated              group by 1),
     a as (select date_trunc('day', evt_block_time) d, count(*) accepted from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics group by 1)
select coalesce(c.d,a.d) as day, coalesce(created,0) as created, coalesce(accepted,0) as accepted
from c full outer join a on c.d = a.d
order by 1
```

**Q16 · Total protocol revenue by token (sales + accepted bids)** → **Counter/Bar**
```sql
with fees as (
  select paymentToken, protocolFee from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
  union all
  select paymentToken, protocolFee from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics
)
select
  case paymentToken
    when 0x7b7c000000000000000000000000000000000000 then 'BTC'
    when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
    when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD' else 'OTHER' end as token,
  sum(cast(protocolFee as double))/1e18 as protocol_revenue
from fees
group by 1 order by protocol_revenue desc
```

---

## Build & publish (current Dune UI)

**A. Each query → visualization**
1. `+ Create → Query`, engine **Dune SQL**, paste, **Run** (⌘/Ctrl+Enter).
2. **Save** with a `vezo · …` name.
3. Below results → **New visualization** → pick type (see each Q above) → configure axes → **Save**.
   A query can hold multiple visualizations (e.g. Q2 → table + bar + donut).

**B. Create the dashboard — name = permanent URL slug**
1. `+ Create → Dashboard`.
2. Name it deliberately (slug is **not editable later**): `Vezo Marketplace` → `dune.com/vezo/vezo-marketplace`.
3. **Save and open**.

**C. Add widgets**
- From a query: open it → select the visualization → **Add to dashboard** → pick the dashboard; **or**
- From the dashboard: **Edit** (top-right) → **Add widget** → **Visualization** → search `vezo` → pick.
- Add a **Text** widget at the top for the title (Markdown supported).
- Add **Parameter** widgets (the `start_date` / `collection` controls) so viewers can filter.

**D. Layout → publish**
1. In **Edit** mode, drag/resize widgets.
2. **Done/Save**, then **Publish** (set visibility **Public**).
3. Share `dune.com/vezo/<slug>`.

### Suggested layout
```
┌──────────────── Text: title + one-liner ────────────────┐
│  params:  [ start_date ▸ ]     [ collection ▾ ]          │
├──────────┬──────────┬──────────┬──────────────────────────┤
│  Sales   │  Volume  │ Revenue  │  Unique traders          │  Q1 / Q2 / Q16 counters
├──────────┴──────────┴──────────┴──────────────────────────┤
│  Cumulative volume by token (stacked area) — Q4           │  hero chart, full width
├───────────────────────────┬───────────────────────────────┤
│  Daily volume (stacked)-Q3│  Cumulative traders (area)-Q7  │
├───────────────────────────┼───────────────────────────────┤
│  Listings vs sales (Q5)   │  Daily active traders (Q8)     │
├───────────────────────────┼───────────────────────────────┤
│  Volume by token (donut)Q2│  Sales by collection (donut)Q9 │
├───────────────────────────┼───────────────────────────────┤
│  Outcome funnel (Q10)     │  Discount distribution (Q11)   │
├───────────────────────────┴───────────────────────────────┤
│  Top sellers (Q12)   │   Top buyers (Q13)                  │
├────────────────────────────────────────────────────────────┤
│  Live activity feed (Q14) — full width table               │
└────────────────────────────────────────────────────────────┘
```

---

## Notes

- **Mixing tokens:** never `sum(price)` across BTC+MEZO+MUSD into one number — they're different units.
  Always split by token (stacked bars / per-series area), as the queries above do. For a single blended
  figure you'd need USD conversion (see below).
- **USD (optional):** Dune's `prices.usd` may not cover Mezo-native tokens. MUSD ≈ $1, so MUSD figures
  are ~USD directly. For BTC/MEZO, join a price source by symbol/minute if available; otherwise keep
  native. Don't ship a USD widget that renders empty.
- **`discountBpsAtSale`** can be negative → sold above intrinsic value (a premium).
- Column names come straight from the Solidity event params — casing matters (`paymentToken`,
  `protocolFee`, `tokenId`, `evt_block_time`, `evt_tx_hash`).
- If you decoded a contract under a different name than `Marketplace`/`VeNFTBidding`/`SwapPaymentRouter`,
  find/replace the table prefix accordingly.
