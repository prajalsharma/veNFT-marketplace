# 🔐 Security Review — vezo

---

## Scope

|  |  |
| --- | --- |
| **Mode** | filename |
| **Files reviewed** | `contracts/backers/VezoBackerStreams.sol` |
| **Confidence threshold (1-100)** | 75 |
| **Passes** | 3 |
| **Memory** | 9 records before this scan · 19 after · `1391209` |

---

## Findings

[75] **1. Create and cancel cycles still crowd the board reader**

`VezoBackerStreams.cancel` · Confidence: 75 · seen in 3/3 runs · KNOWN (2 scans)

**Description**
An attacker who reuses one deposit for create-then-cancel cycles fills the capped cancel log scan, so empty streams take the board's read slots.

**Fix**

```diff
-  created.sort((a, b) => (a.id < b.id ? 1 : -1));
+  // Read real streamed amounts before the cap; a stream that paid less
+  // than MIN_LISTED never takes a slot, whatever the logs say.
+  const live = (await readAll(created)).filter((r) => BigInt(r.streamed) >= MIN_LISTED[r.token]);
```

---

[75] **2. One-wei streams fill the board's capped log scan**

`VezoBackerStreams.create` · Confidence: 75 · seen in 3/3 runs · NEW

**Description**
Any caller can open 20,000 one-wei streams, so the reader, which fetches the oldest 20,000 StreamCreated logs, never sees a later real stream.

**Fix**

```diff
-    const url = `${LOGS_API}?module=logs&action=getLogs&address=${M.backerStreams}&topic0=${topic0}&fromBlock=0&toBlock=latest&page=${page}&offset=${PAGE}`;
+    // Explorer v2 logs come newest first and filter by topic.
+    const url = `${EXPLORER_V2}/addresses/${M.backerStreams}/logs?topic=${topic0}${cursor}`;
```

---

[75] **3. A minimum plan can fall below the reader's fixed token floor**

`VezoBackerStreams.create` · Confidence: 75 · seen in 3/3 runs · NEW

**Description**
The form accepts a $5 plan at the live price, but the reader drops deposits below a fixed token amount, so a price move hides a plan and its cancel button.

**Fix**

```diff
-      if (!token || ev.args.deposit < MIN_INDEXED[token]) continue;
+      // A wallet's own streams are read by backer address with no floor.
+      if (!token || (!mine && ev.args.deposit < MIN_INDEXED[token])) continue;
```

---

[75] **4. A finished stream shows its backer as paying right now**

`VezoBackerStreams.endsAt` · Confidence: 75 · seen in 3/3 runs · KNOWN (2 scans)

**Description**
The status stays Active after a stream ends, so the board sets the backer's last activity to now on every request, forever.

**Fix**

```diff
-      if (st.status === "Active") donor.lastAt = new Date().toISOString();
+      if (st.status === "Active" && st.endsAt && st.endsAt * 1000 > Date.now()) donor.lastAt = new Date().toISOString();
```

---

[75] **5. Paused minimum streams fill every board read slot**

`VezoBackerStreams.pause` · Confidence: 75 · seen in 3/3 runs · NEW

**Description**
An attacker opens 300 minimum-deposit streams and pauses them, so the reader reads only those streams and real backers lose their rows and cancel buttons.

**Fix**

```diff
-  return Promise.all(created.slice(0, MAX_READ).map(async (c) => {
+  // Drop unpaid streams before any cap, and read a wallet's own streams by
+  // backer address so they can never be crowded out.
+  const live = (await readAll(created)).filter((r) => BigInt(r.streamed) >= MIN_LISTED[r.token]);
+  return live.slice(0, MAX_READ);
```

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [75] | Create and cancel cycles still crowd the board reader |
| 2 | [75] | One-wei streams fill the board's capped log scan |
| 3 | [75] | A minimum plan can fall below the reader's fixed token floor |
| 4 | [75] | A finished stream shows its backer as paying right now |
| 5 | [75] | Paused minimum streams fill every board read slot |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **A backer can take early perks and then cancel** — `VezoBackerStreams.cancel` · seen in 3/3 runs · KNOWN (2 scans) — Code smells: cancel refunds the rest at once. — Depends on when Vezo delivers perks.
- **A completed plan shows as Canceled after a late cancel** — `VezoBackerStreams.cancel` · seen in 1/3 runs · NEW — Code smells: the page marks a Canceled stream as not done. — Display only.
- **The refund rounds up by under one wei** — `VezoBackerStreams.cancel` · seen in 2/3 runs · NEW — Code smells: `_streamed` floors. — Dust.
- **A stream from Vezo's own wallets counts as outside support** — `VezoBackerStreams.create` · seen in 2/3 runs · NEW — Code smells: the stream loop skips the RECIPIENT and SUPPORT_IGNORE_SENDERS checks. — A Vezo wallet that streams to itself inflates the total.
- **The contract does not tie a deposit to a plan length** — `VezoBackerStreams.create` · seen in 2/3 runs · KNOWN (2 scans) — Code smells: any duration from 1 to 730 days. — A direct caller can stretch a deposit over two years.
- **Any caller can list any project name for about one dollar** — `VezoBackerStreams.create` · seen in 3/3 runs · KNOWN (2 scans) — Code smells: no link between `name` and the caller. — A product choice: the cost now goes to Vezo.
- **Cancelling a finished stream makes isFinished false** — `VezoBackerStreams.isFinished` · seen in 1/3 runs · NEW — Code smells: `cancel` accepts a fully streamed stream. — A paid-in-full plan then looks canceled to readers of `isFinished`.
- **A paused or resumed finished stream reports odd end data** — `VezoBackerStreams.isFinished` · seen in 3/3 runs · NEW — Code smells: `pause` and `resume` accept a finished stream. — Display only.
- **A backer can pause after the minimum and stay listed** — `VezoBackerStreams.pause` · seen in 3/3 runs · KNOWN (2 scans) — Code smells: no limit on pause length. — A backer pays about one dollar and keeps a monthly listing.
- **Streams of one token share one balance** — `VezoBackerStreams.withdraw` · seen in 2/3 runs · KNOWN (2 scans) — Code smells: no per-token liability check. — Solvent for plain ERC-20s; only a fee or rebasing token breaks it.
- **Streamed tokens can only ever go to RECIPIENT** — `VezoBackerStreams.withdraw` · seen in 1/3 runs · NEW — Code smells: RECIPIENT is immutable and is the only payout target. — If a token ever blocked RECIPIENT, streamed tokens would stay in the contract. Backer refunds are not affected. No blocklist found in BTC, MEZO or MUSD.
- **Anyone can flood the donations scan with stream payouts** — `VezoBackerStreams.withdraw` · seen in 1/3 runs · NEW — Code smells: `withdraw` has no caller check, the one-off board reads only the newest 300 token transfers before it drops stream payouts. — About 300 `withdraw` calls push older one-off donations out of the read window.

---

## Known from earlier scans

_Recorded by earlier scans of this repo, not raised again by this one. Not re-checked — a record here may be fixed, or may still be live and missed. `.solidity-auditor/memory.tsv`._

| Scans | Kind | Location | Title |
|---|---|---|---|
| 1 | FINDING | `VezoBackerStreams.cancel` | Cancel refund fails when the transfer to RECIPIENT fails |
| 1 | FINDING | `VezoBackerStreams.pause` | Pause and resume logs push real plans out of the board log scan |

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
