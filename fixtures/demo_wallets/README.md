# Demo Wallet Fixtures

These fixtures are Day 2 mock inputs for frontend display, API contract checks, and later harness scripts.

| Fixture | Purpose | Expected Risk |
|---|---|---|
| `low_risk_wallet.json` | Healthy known-token wallet with no active risky approvals | Low |
| `moderate_partial_wallet.json` | Partial scan with concentration and missing indexed data | Moderate |
| `high_risk_wallet.json` | Main demo case: unlimited approval, suspicious transfer, high mETH/cmETH exposure | High |

Rules:

- Fixtures use demo data and fake addresses.
- They must not be interpreted as live scan results.
- Every expected top risk includes at least one `evidenceId`.
- `dataMode` is `demo`.
- Real execution is disabled.
