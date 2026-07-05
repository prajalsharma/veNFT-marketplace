# Vezo — Dune Dashboard (Mezo mainnet)

Ready-to-paste Dune SQL. Chain: **Mezo mainnet** (Dune indexes Mezo mainnet, not testnet — so
all queries target the mainnet contracts).

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

All token amounts have **18 decimals** (divide by 1e18).

---

## Step 1 — Submit contracts for decoding (namespace `vezo`)

Submit each contract for decoding at **https://dune.com/contracts/new** (one at a time), namespace
**`vezo`**. The decoded tables resolve to `vezo_mezo.<ContractName>_evt_<Event>`.

> **The marketplace was decoded under the contract name `Marketplace`**, so its tables are
> `vezo_mezo.Marketplace_evt_<Event>` — that is what the queries below use. If you decode the bidding
> and swap contracts under different names than shown, adjust those table prefixes to match.

| Address | Namespace | Contract name | ABI source |
|---|---|---|---|
| `0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570` | `vezo` | `Marketplace` | compile `contracts/core/VeNFTMarketplace.sol` |
| `0xef35dc538b50549e95687a51e8aa542D485ea384` | `vezo` | `VeNFTBidding` | `contracts/core/VeNFTBidding.sol` |
| `0x638Bab65738bA7BcD47D3c1d6Cb4eaf6CC872617` | `vezo` | `SwapPaymentRouter` | `contracts/core/SwapPaymentRouter.sol` |

Decoding takes up to ~24h after approval, and tables can appear empty during backfill. Until then, use
the **raw** query in Step 2.

---

## Step 2 — Immediate raw query (works NOW, before decoding)

Verifies data exists and gives a live activity feed labelled by event type.

```sql
-- Vezo · Raw marketplace activity (no decoding needed)
select
  block_time,
  tx_hash,
  case topic0
    when 0xc34eca5bc6c01e6aa4dff622e2dffa03644e52a66ff85131b3753573aadc2889 then 'Listed'
    when 0xc41d93b8bfbf9fd7cf5bfe271fd649ab6a6fec0ea101c23b82a2a28eca2533a9 then 'Cancelled'
    when 0x3fb02bfbf01f7dc3a4c6903acc6b06ca1d9af7647282593f46cbacefc288b602 then 'Purchased'
    when 0x9975ccf0baed2e5d36764f8fc5e89a919501b5e43caaed798c2a7fc2a5c7f630 then 'PurchasedWithAnalytics'
    when 0x0795db3173719c9ab9b624b79bab872386e26d032ed703dde5faf103e23cc6d2 then 'ListedWithSnapshot'
    else '0x' || to_hex(topic0)
  end as event
from mezo.logs
where contract_address = 0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570
order by block_time desc
limit 200
```

If this returns rows → data is there and decoding will work. If it returns nothing, the marketplace
simply has no on-chain events yet on mainnet (check with a wider `mezo.transactions` scan).

---

## Step 3 — The dashboard queries (decoded)

Create each as a **New query**, run it, then **Add to dashboard** with the suggested visualization.

### 1. Headline KPIs (Counter visualizations)

```sql
-- Vezo · KPIs
select
  (select count(*) from vezo_mezo.Marketplace_evt_Listed)                as listings_created,
  (select count(*) from vezo_mezo.Marketplace_evt_Purchased)             as total_sales,
  (select count(*) from vezo_mezo.Marketplace_evt_Cancelled)             as cancellations,
  (select count(distinct seller) from vezo_mezo.Marketplace_evt_Listed)    as unique_sellers,
  (select count(distinct buyer)  from vezo_mezo.Marketplace_evt_Purchased) as unique_buyers
```

### 2. Volume & protocol revenue by token (Table / Bar)

```sql
-- Vezo · Volume + protocol revenue by payment token
select
  case paymentToken
    when 0x7b7c000000000000000000000000000000000000 then 'BTC'
    when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
    when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD'
    else '0x' || to_hex(paymentToken)
  end as token,
  count(*)                              as sales,
  sum(cast(price as double))/1e18       as volume,
  sum(cast(protocolFee as double))/1e18 as protocol_revenue
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
order by sales desc
```

### 3. Sales & volume over time (Bar + line, X = day)

```sql
-- Vezo · Daily sales & volume
select
  date_trunc('day', evt_block_time)  as day,
  count(*)                           as sales,
  sum(cast(price as double))/1e18    as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
order by 1
```

### 4. New listings over time (Bar, X = day)

```sql
-- Vezo · Daily new listings
select date_trunc('day', evt_block_time) as day, count(*) as listings
from vezo_mezo.Marketplace_evt_Listed
group by 1
order by 1
```

### 5. Breakdown by collection (Pie / Bar)

```sql
-- Vezo · Sales by collection
select
  case collection
    when 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279 then 'veBTC'
    when 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122 then 'veMEZO'
    else '0x' || to_hex(collection)
  end as collection,
  count(*)                        as sales,
  sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
```

### 6. Average discount at sale (Counter)

```sql
-- Vezo · Avg discount % at sale (negative = sold at a premium)
select avg(cast(discountBpsAtSale as double))/100 as avg_discount_pct
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
```

### 7. Full activity feed (Table)

```sql
-- Vezo · Unified activity feed
select evt_block_time as time, 'Listed'    as action, seller as actor,
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

### 8. Top sellers (Table)

```sql
-- Vezo · Top sellers by volume
select seller,
       count(*)                        as sales,
       sum(cast(price as double))/1e18 as volume
from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
group by 1
order by volume desc
limit 20
```

### 9. Bidding activity (Counters)

```sql
-- Vezo · Bidding
select
  (select count(*) from vezo_mezo.VeNFTBidding_evt_BidCreated)              as bids_created,
  (select count(*) from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics) as bids_accepted,
  (select sum(cast(amount as double))/1e18
     from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics)              as bid_volume,
  (select sum(cast(protocolFee as double))/1e18
     from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics)              as bid_fees
```

### 10. Pay-with-any-token swaps (Bar)

```sql
-- Vezo · Swap-and-buy volume
select date_trunc('day', evt_block_time) as day,
       count(*)                          as swaps,
       sum(cast(amountIn as double))/1e18 as volume_in
from vezo_mezo.SwapPaymentRouter_evt_SwapAndPurchase
group by 1
order by 1
```

### 11. Total protocol revenue (Counter — marketplace + bidding fees, per token)

```sql
-- Vezo · Total protocol revenue by token (sales + accepted bids)
with fees as (
  select paymentToken, protocolFee from vezo_mezo.Marketplace_evt_PurchasedWithAnalytics
  union all
  select paymentToken, protocolFee from vezo_mezo.VeNFTBidding_evt_BidAcceptedWithAnalytics
)
select
  case paymentToken
    when 0x7b7c000000000000000000000000000000000000 then 'BTC'
    when 0x7b7c000000000000000000000000000000000001 then 'MEZO'
    when 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 then 'MUSD'
    else '0x' || to_hex(paymentToken)
  end as token,
  sum(cast(protocolFee as double))/1e18 as protocol_revenue
from fees
group by 1
order by protocol_revenue desc
```

---

## Step 4 — Assemble & publish the dashboard

Decoding creates *tables*. A dashboard is built separately from *queries + their visualizations*.
Order of operations: **save each query → give it a visualization → add that visualization to a dashboard.**

### 4a. Turn each query into a visualization
For every query in Step 3:
1. Paste it into a **New query** (top-left `+ Create → Query`, or `dune.com/queries` → New).
2. Click **Run** (⌘/Ctrl+Enter). Confirm rows come back.
3. Click **Save** (top right) and give it a clear name, e.g. `vezo · kpis`, `vezo · daily sales`.
4. Below the results grid, open the **New visualization** button and pick a type:
   - KPIs (query #1, #6, #9, #11) → **Counter** (pick the column to display).
   - By-token / by-collection / top-sellers (#2, #5, #8) → **Bar chart** or **Table**.
   - Over-time (#3, #4, #10) → **Bar chart** (X = `day`, Y = `sales`/`volume`/`listings`).
   - Activity feed (#7) → **Table**.
5. Configure the axes/columns in the viz settings, then **Save** the query again.
   A query can hold several visualizations — add more with **New visualization** if you want both a
   counter and a chart from the same query.

### 4b. Create the dashboard (name = permanent URL slug!)
1. Top-left **`+ Create → Dashboard`** (or `dune.com` → New Dashboard).
2. **Name it deliberately** — the name becomes the URL slug and **cannot be changed later**.
   e.g. naming it `Vezo Marketplace` → `dune.com/vezo/vezo-marketplace`.
3. **Save and open**.

### 4c. Add your visualizations as widgets
Two ways:
- **From the query:** open a saved query → select the visualization tab → **Add to dashboard** →
  choose your dashboard. The widget lands at the bottom.
- **From the dashboard:** click **Edit** (top right) → **Add widget** → **Visualization** →
  search your saved query → pick the visualization.

Repeat for all 11. Also add a **Text widget** (Edit → Add widget → Text) at the top for a title/intro —
it supports Markdown, e.g.:
```markdown
# Vezo — veNFT Marketplace on Mezo
Escrowless secondary market for veBTC & veMEZO. Live on-chain metrics.
```

### 4d. Lay it out & publish
1. In **Edit** mode, drag widgets to arrange; resize from the bottom-right corner. Put KPI counters in
   a row across the top, charts below, the activity table full-width at the bottom.
2. Click **Done / Save** to exit edit mode.
3. Click **Publish** (or toggle the dashboard from *private* to *public*) so anyone can view it.
4. Share the URL: `dune.com/vezo/<your-slug>`.

### Suggested layout
```
┌───────────── Text: title / intro ─────────────┐
│  [Sales] [Volume] [Revenue] [Unique buyers]    │  ← counters (queries 1, 2, 11)
├───────────────────────┬────────────────────────┤
│  Daily sales & volume │  New listings / day     │  ← bar charts (queries 3, 4)
├───────────────────────┼────────────────────────┤
│  Volume by token      │  Sales by collection    │  ← bar/pie (queries 2, 5)
├───────────────────────┴────────────────────────┤
│  Activity feed (full width table)               │  ← query 7
└─────────────────────────────────────────────────┘
```

---

## Notes

- **USD values:** amounts above are in native token units. MUSD ≈ $1 (stablecoin), so MUSD figures
  are ~USD directly. BTC/MEZO would need a price feed to convert; Dune's `prices.usd` may not cover
  Mezo-native tokens, so keep headline numbers per-token unless you wire in a price source.
- **`discountBpsAtSale`** can be negative when an item sold above intrinsic value (a premium).
- Column names come straight from the Solidity event params, so casing matters
  (`paymentToken`, `protocolFee`, `tokenId`, `evt_block_time`, `evt_tx_hash`).
- If you named the decoding namespace something other than `vezo`, find/replace `vezo_mezo.` in every query.
