---
active: true
iteration: 1
max_iterations: 15
completion_promise: "CODE GENERATED"
started_at: "2026-02-11T16:04:33Z"
---

ROLE:
You are a senior DeFi full-stack engineer and DevOps operator.

Your job is NOT to write plans or proposals.

Your job is to START BUILDING the Mezo veNFT marketplace DApp immediately.

You must:
- Scaffold a real repository.
- Fork OpenXSwap marketplace contracts.
- Write Solidity adapters.
- Write PaymentRouter.
- Write Admin/Pause contract.
- Write Hardhat config.
- Write deploy scripts.
- Write tests.
- Write React/Next.js frontend.
- Add wallet connect.
- Add Mezo network config.
- Add environment files.
- Add CI pipeline.
- Produce runnable code blocks.

NO architecture-only answers.
NO high-level summaries.
NO PDFs.
NO diagrams unless accompanied by code.

Every section must include ACTUAL code.

OBJECTIVE:
Start coding a production-ready veNFT marketplace DApp for Mezo supporting veBTC and veMEZO.

End state of this run:
✔ contracts compiling
✔ deploy script present
✔ frontend bootstrapped
✔ marketplace UI renders
✔ wallet connects
✔ listings page stubbed
✔ testnet config wired
✔ fork workflow shown
✔ README with run instructions

MANDATORY:
- Fork audited OpenXSwap marketplace contracts.
- Keep upstream diff minimal.
- Add adapters instead of editing core.
- Support veBTC + veMEZO ERC-721.
- Accept BTC, MEZO, MUSD.
- Include emergency pause.
- Include protocol fee.
- Include admin role.
- Include testnet/mainnet network toggle.
- Use Mezo RPC + chain IDs.
- Use these contract addresses in config:

BTC:
0x7b7c000000000000000000000000000000000000

veBTC:
Mainnet 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279
Testnet 0x38E35d92E6Bfc6787272A62345856B13eA12130a

MEZO:
0x7b7c000000000000000000000000000000000001

veMEZO:
Mainnet 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122
Testnet 0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b

REQUIRED LINKS (wire into README/config):
https://mezo.org/docs/users/mezo-earn/lock/vebtc
https://mezo.org/docs/users/mezo-earn/lock/vemezo
https://matchbox.mallard.sh/docs
https://www.npmjs.com/package/@mezo-org/passport
https://mezo.org/docs/developers/getting-started/
https://mezo.org/docs/users/resources/contracts-reference/
https://explorer.mezo.org
https://docs.openxswap.exchange/the-open-x-project/nft-market-multichain
https://github.com/velodrome-finance/contracts
https://github.com/mezo-org

REFERENCE UI:
Mirror OpenXSwap layout: veNFT cards, discount badges, lock timers, floor stats, filters.

OUTPUT REQUIREMENTS (STRICT):
Start by generating:

SECTION 1 — Repo Scaffold
- folder tree
- package.json
- pnpm/yarn config
- hardhat.config.ts
- foundry.toml

SECTION 2 — Fork Workflow
- exact git commands
- upstream remote
- branch strategy

SECTION 3 — Solidity Code
- MezoVeNFTAdapter.sol
- PaymentRouter.sol
- MarketplaceAdmin.sol
- interface files

SECTION 4 — Deploy Scripts
- scripts/deploy-testnet.ts
- scripts/deploy-mainnet.ts

SECTION 5 — Tests
- unit tests for router + adapter
- one integration test

SECTION 6 — Frontend Bootstrap
- Next.js app
- wagmi/rainbowkit config
- Mezo network config
- wallet modal
- marketplace page
- listing card component

SECTION 7 — README
- install steps
- run frontend
- deploy contracts
- testnet faucet
- env vars

RULE:
Do NOT stop at prose.
Every section must contain code blocks that could be pasted into a repo.

START CODING NOW.


