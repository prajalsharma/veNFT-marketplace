---
title: Ask AI About Vezo
description: Point ChatGPT, Claude, or any AI assistant at the Vezo documentation and get accurate, grounded answers about the protocol, contracts, and integration.
---

These docs are published in a machine-readable form, so any AI assistant can answer
questions about Vezo using the real documentation instead of guessing. No sign-up,
no API key, no cost: the files are public and free to use.

## The two files

| File | What it holds | Best for |
|---|---|---|
| [llms.txt](https://docs.vezo.exchange/llms.txt) | An index of every page with short descriptions | Letting an assistant pick the right page to read |
| [llms-full.txt](https://docs.vezo.exchange/llms-full.txt) | The complete documentation as one plain-text file | Answering detailed questions in a single paste |

Both follow the [llms.txt convention](https://llmstxt.org/), the emerging standard
for making a site legible to language models. They are regenerated on every docs
deploy, so they never drift from the pages you are reading.

## Using it

### With a chat assistant

Paste this into ChatGPT, Claude, Gemini, or anything else that can read a URL:

```text
Read https://docs.vezo.exchange/llms-full.txt and answer using only what it says.
Cite the section you used. My question: <your question>
```

Assistants without web access will ask for the content instead: open
[llms-full.txt](https://docs.vezo.exchange/llms-full.txt), copy it, and paste it
into the conversation before your question. The whole documentation is roughly
90 KB of text, which fits comfortably in any modern context window.

### With a coding agent

Claude Code, Cursor, Codex, and similar tools can fetch the file directly while
they write your integration:

```text
Fetch https://docs.vezo.exchange/llms-full.txt for the Vezo contract ABIs and
flow, then write a script that lists a veNFT priced in MUSD on Mezo mainnet.
```

Because the file carries the deployed addresses, the approval flow, and the exact
function signatures, the agent writes against the live deployment rather than a
plausible-looking invention.

### Questions it answers well

- How does a purchase settle atomically without escrow?
- What does the marketplace charge, and who pays it?
- Which swap routes exist, and why do BTC-quoted listings reject swaps?
- How is the discount percentage calculated?
- What does the Grant badge on a listing mean for a buyer?
- Which addresses are live on mainnet right now?

## Why grounded answers matter here

An ungrounded model will happily invent a contract address, a fee number, or a
function that does not exist. Every one of those mistakes costs real money on a
live network. Grounding the assistant in `llms-full.txt` means its answers come
from the same source of truth as this site, and you can check any claim against
the page it names.

Two habits worth keeping regardless of which assistant you use:

1. **Verify addresses on the explorer.** Cross-check anything an AI gives you
   against [Links & Addresses](/resources/links/) and
   [explorer.mezo.org](https://explorer.mezo.org).
2. **Never paste a private key or seed phrase into a chat.** No legitimate
   integration needs one, and no page in these docs will ever ask for one.

## Keeping an assistant current

The files are served fresh on every deploy. If an assistant seems to be working
from stale information, ask it to re-fetch the URL rather than relying on what it
remembers from earlier in the conversation. For the numbers that change by the
minute (prices, listings, volume), point it at the live sources instead: the
[Dune dashboard](https://dune.com/vezo/vezo) and the app itself.
