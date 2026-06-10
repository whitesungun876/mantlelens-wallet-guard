# Day 2 Agent Workspace Wireframe

## Layout

```text
+--------------------------------------------------------------------------------+
| MantleLens Wallet Guard                         Agent: registered / demo mode  |
+---------------------------+----------------------------------------------------+
| Wallet Input              | Wallet Risk Summary                                |
| [ paste address        ]  | Score 68 / 100   Risk High   Confidence 0.85       |
| [ Connect Wallet ]        | Data coverage: Partial live scan                   |
| [ Scan Wallet ]           | On-chain record: Pending                           |
|                           +----------------------------------------------------+
| Agent Feed                | Top Risks                                          |
| 1 DATA_GATHERING          | 1 Unlimited approval to unknown spender            |
| 2 RISK_EVALUATING         | 2 Suspicious dust transfer                         |
| 3 EVIDENCE_BINDING        | 3 High mETH/cmETH exposure                         |
| 4 EXPLAINING              +----------------------------------------------------+
|                           | Tabs: Approvals | Transfers | Portfolio | RWA      |
| Quick Actions             |                                                    |
| [ Simulate Approval ]     | Approval Risk Table                                |
| [ Simulate Portfolio ]    | Token | Spender | Amount | USD at Risk | Evidence |
| [ Record Assessment ]     |                                                    |
+---------------------------+----------------------------------------------------+
| Drawer: Evidence Detail / Trace Inspector / Benchmark History                  |
+--------------------------------------------------------------------------------+
```

## Components

| Component | Purpose | Day 2 State |
|---|---|---|
| `WalletInputCard` | Paste or connect wallet | Static mock accepts fixture wallet |
| `AgentStatusFeed` | Show state transitions and tool steps | Static timeline |
| `RiskScoreCard` | Show score, risk level, confidence, coverage | Bound to fixture |
| `DataCoverageBanner` | Explain partial or known-token-only limitations | Bound to fixture |
| `TopRisksList` | Show top 3 risks | Bound to fixture |
| `SuggestedActionsCard` | Show simulation-only actions | Bound to fixture |
| `ApprovalRiskTable` | Show active approvals | Bound to fixture |
| `SuspiciousTransferTable` | Show suspicious transfers | Bound to fixture |
| `PortfolioExposurePanel` | Show top asset and concentration | Bound to fixture |
| `RwaYieldRiskPanel` | Show USDY/mUSD/mETH/cmETH exposure | Bound to fixture |
| `EvidenceDrawer` | Show evidence details for selected risk | Static drawer panel |
| `SimulationDiffCard` | Show before/after score diff | Placeholder until Day 7 |
| `OnChainRecordCard` | Show queued/recorded assessment hash | Bound to fixture |
| `BenchmarkHistoryTable` | Show assessment history | Static history row |
| `AgentIdentityPanel` | Show ERC-8004/A2A readiness | Static metadata |
| `TraceInspectorDrawer` | Show run trace | Static timeline |

## Required UI States

| State | UI Behavior |
|---|---|
| `idle` | Wallet input is enabled; workspace shows empty state |
| `scanning` | Agent feed highlights data gathering |
| `evaluating` | Risk score card shows skeleton or in-progress state |
| `explaining` | Explanation panel shows pending state |
| `simulation_ready` | Simulation buttons enabled |
| `simulation_running` | Simulation diff card shows pending |
| `commit_pending` | On-chain record shows queued or pending retry |
| `committed` | Assessment tx or mock record visible |
| `partial_data` | Data coverage banner is visible and sticky |
| `failed_retryable` | Retry button and source limitation visible |

## Copy Rules

- Do not say "complete scan" in P0.
- Do not say "wallet is safe" when indexed data is unavailable.
- Do not say "revoke executed" or "trade executed".
- Use "Review approval" and "Simulate revoke impact".
- mETH and cmETH are Mantle yield / liquid staking assets, not RWA.

## Day 2 Acceptance

- Every P0 dashboard module has a defined screen position.
- Partial, replay, error, pending, and committed states have visible UI treatments.
- Static mock workspace can render a fixture without a backend.
