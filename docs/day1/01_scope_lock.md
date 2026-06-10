# Day 1 Scope Lock

## Project

MantleLens Wallet Guard is a 10-day Hackathon MVP for Mantle users. It is an evidence-grounded wallet and portfolio risk agent, not a production-grade security rating system and not a general portfolio dashboard.

## P0 Goal

Deliver one demoable wallet safety loop:

`Wallet input -> Known-token scan -> Risk assessment -> Evidence bundle -> Plain-language explanation -> Simulation-only action -> Assessment hash commit -> Benchmark history`

The MVP must support:

- Paste wallet address or connect wallet.
- Mantle chain only, `chainId = 5000`.
- Known-token balance scan through Mantle RPC and allowlist.
- Approval event discovery with active allowance confirmation.
- Suspicious transfer detection over bounded known-token logs.
- Asset concentration scoring.
- RWA/yield risk module for USDY, mUSD, mETH, and cmETH.
- DeFi exposure stub for known LP or protocol tokens.
- Data completeness banner with `full`, `partial`, `known-token-only`, and `replay`.
- Evidence bundle where every claim has an `evidenceId`.
- Natural-language explanation for the top risks.
- Simulation-only safe actions.
- Async assessment hash record and benchmark history.
- ERC-8004 ready registration files and read-only MCP tools list.

## P0 Non-Goals

P0 explicitly does not include:

- Real revoke execution.
- Real swap or trade execution.
- Real mETH to mUSD swap.
- Custody of user assets.
- Buy/sell or yield advice.
- Cross-chain wallet risk.
- Full token inventory without an indexer.
- Full historical wallet scan.
- Full DeFi position parsing.
- NFT approvals.
- ML-calibrated Wallet Risk Score.
- Claims of guaranteed wallet safety or production-grade security.
- Treating GoPlus clean results as a guarantee.
- Treating unavailable data as normal or safe.

## P1 / P2 Parking Lot

P1 candidates:

- Moralis balances, approvals, and history if API key exists.
- Mantlescan or Etherscan V2 indexed account history.
- Real user-signed revoke flow.
- GoPlus full security API enrichment.
- Transaction simulation API.
- NFT approval detection.
- Risk trend history.
- ERC-8004 reputation feedback.

P2 candidates:

- Autonomous guard mode.
- Real-time alert bot.
- Graph-based scam detection.
- Cross-chain wallet risk.
- Validation registry.
- Full DeFi risk model.
- ML-calibrated Wallet Risk Score.
- Paid agent API.

## Demo Case

The standard demo wallet should show:

1. Unlimited approval to an unknown spender.
2. Suspicious dust or lookalike transfer.
3. High mETH or cmETH exposure with yield/liquidity warning.
4. High wallet risk score.
5. Evidence drawer for each top risk.
6. Simulation-only safer action.
7. Assessment hash recorded or queued.
8. Benchmark history updated.

## Hard Product Rules

- Data before reasoning.
- Evidence before claims.
- Rules before LLM.
- Simulation before execution.
- Benchmark before reputation.
- Missing data triggers partial or unknown state.
- Active approval risk must be confirmed through `allowance(owner, spender)`.
- LLM explains structured assessment only; it does not score, invent evidence, or override red flags.
- P0 real execution is disabled everywhere, including UI, API, MCP, and benchmark records.

## Day 1 Acceptance

- P0/P1/P2 are separated with no ambiguous real-execution scope.
- Demo path is fixed and checkable.
- All hard product rules are written as development constraints.
- Open assumptions are visible before implementation begins.

## Open Assumptions To Confirm

| Assumption | Current Decision | Impact |
|---|---|---|
| Commit target | Async hash commit; no key returns `pending_unavailable` without a tx hash | Affects ledger adapter and demo reliability |
| RWA/yield data | Reuse existing RWA module; fallback allowed | Affects coverage and claims |
| Moralis / Mantlescan keys | Not required for P0 | Forces known-token-only and partial scan handling |
| LLM provider | Provider-agnostic contract first | Enables rule fallback before model integration |
| Frontend app stack | Static mock shell for Day 2, Next.js later | Avoids premature scaffold without package baseline |
