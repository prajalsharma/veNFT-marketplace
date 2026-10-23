# 🔐 Security Review — vezo

---

## Scope

|  |  |
| --- | --- |
| **Mode** | filename |
| **Files reviewed** | `contracts/backers/VezoBackerStreams.sol` |
| **Confidence threshold (1-100)** | 75 |
| **Passes** | 3 |
| **Memory** | 0 records before this scan · 9 after · `8b3c4bd` |

---

## Findings

[75] **1. Cancel refund fails when the transfer to RECIPIENT fails**

`VezoBackerStreams.cancel` · Confidence: 75 · seen in 3/3 runs · NEW

**Description**
The `cancel` function pays RECIPIENT before it refunds the backer, so a token that rejects RECIPIENT keeps the backer's unstreamed deposit in the contract.

**Fix**

```diff
-        s.deposit = uint128(streamed);
-        s.withdrawn = uint128(streamed);
-        s.status = Status.Canceled;
-
-        emit StreamCanceled(id, streamed, refund);
-        if (owed > 0) {
-            emit Withdrawn(id, owed);
-            IERC20(s.token).safeTransfer(RECIPIENT, owed);
-        }
-        if (refund > 0) IERC20(s.token).safeTransfer(s.backer, refund);
+        s.deposit = uint128(streamed);
+        s.status = Status.Canceled;
+
+        emit StreamCanceled(id, streamed, refund);
+        if (refund > 0) IERC20(s.token).safeTransfer(s.backer, refund);
```

---

[75] **2. Create and cancel cycles fill every board read slot**

`VezoBackerStreams.cancel` · Confidence: 75 · seen in 1/3 runs · NEW

**Description**
An attacker can create and cancel 300 plans with the same 4 MUSD for gas alone, because `cancel` refunds everything at zero elapsed time, so the board reads only the attacker's plans.

**Fix**

```diff
-      .filter((c) => c.deposit >= MIN_INDEXED[c.token])
+      // A plan canceled before it paid MIN_LISTED never reaches the read budget.
+      .filter((c) => c.deposit >= MIN_INDEXED[c.token] && !(canceled.has(c.id) && canceled.get(c.id)! < MIN_LISTED[c.token]))
```

---

[75] **3. Any caller can show any project name on the backers board for 1 wei**

`VezoBackerStreams.create` · Confidence: 75 · seen in 3/3 runs · NEW

**Description**
The `create` function accepts any amount above zero and any name, so any caller who streams 1 wei and cancels keeps that name on a board that lists any streamed amount.

**Fix**

```diff
-  const board = (streams ?? []).filter((s) => streamedNow(s, now) > 0n)
+  // A real payment, not 1 wei, before a name shows.
+  const board = (streams ?? []).filter((s) => streamedNow(s, now) >= MIN_LISTED[s.token])
```

---

[75] **4. Pause and resume logs push real plans out of the board's log scan**

`VezoBackerStreams.pause` · Confidence: 75 · seen in 1/3 runs · NEW

**Description**
A backer can call `pause` and `resume` in a loop for gas alone, so the board's capped scan of all contract logs finds no `StreamCreated` log of a real plan.

**Fix**

```diff
-    const res = await fetch(`${EXPLORER_API}/addresses/${M.backerStreams}/logs${q}`)
+    // Ask only for StreamCreated and StreamCanceled, so other events cannot crowd them out.
+    const res = await fetch(`${EXPLORER}/api?module=logs&action=getLogs&address=${M.backerStreams}&topic0=${STREAM_CREATED}&fromBlock=0&toBlock=latest`)
```

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [75] | Cancel refund fails when the transfer to RECIPIENT fails |
| 2 | [75] | Create and cancel cycles fill every board read slot |
| 3 | [75] | Any caller can show any project name on the backers board for 1 wei |
| 4 | [75] | Pause and resume logs push real plans out of the board's log scan |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **A backer can collect early perks and then cancel** — `VezoBackerStreams.cancel` · seen in 1/3 runs · NEW — Code smells: payment accrues linearly, `cancel` refunds the rest at any time, tier perks such as threads and an AMA are delivered early and off-chain. — A backer who takes the AMA on day 3 and cancels pays about 2.50 of 100. Vezo controls when perks go out, so this depends on the delivery policy.
- **The contract does not tie a deposit to a tier duration** — `VezoBackerStreams.create` · seen in 1/3 runs · NEW — Code smells: any duration from 1 to 730 days for any amount, tiers exist only in the frontend. — A backer can stream the $100 deposit over 730 days and pay about 4 MUSD a month. The effect depends on how Vezo maps plans to perks.
- **A finished stream still reports Active with an end time of now** — `VezoBackerStreams.endsAt` · seen in 2/3 runs · NEW — Code smells: status never changes to a finished state, `endsAt` returns `block.timestamp` once all time has accrued. — A reader that trusts the status shows a finished plan as live. No tokens are at risk.
- **A backer can pause after one second and keep a full plan listed** — `VezoBackerStreams.pause` · seen in 2/3 runs · NEW — Code smells: no limit on pause length, `deposit` stays at the full amount while Paused, perks are delivered off-chain. — A backer who pauses at once pays almost nothing while the plan stays open. The board shows only the streamed amount, so the open question is how perks follow the status.
- **Streams of one token share one balance with no later check** — `VezoBackerStreams.withdraw` · seen in 3/3 runs · NEW — Code smells: the balance change is measured only on deposit, outbound transfers assume an exact `amount`, all streams of a token pay from one balance. — A token that rebases down or charges the sender a fee makes the last payout of that token fail. No agent found this behaviour in BTC, MEZO or MUSD on Mezo.

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
