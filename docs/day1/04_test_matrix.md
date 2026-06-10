# Day 1 QA Test Matrix

## Harness Coverage

| Harness | Owner | Day Started | Purpose | P0 Acceptance |
|---|---|---:|---|---|
| Tool Harness | QA + BE | Day 3 | Validate tool output schema, fallback, source marking, idempotency | All P0 tools return structured output or source unavailable |
| Risk Harness | QA + BE | Day 4 | Validate thresholds, weights, hard red flags, UNKNOWN circuit breaker | Fixed bucket and red flag tests pass |
| Evidence Harness | QA + BE | Day 4 | Validate evidence binding | Every claim has at least one evidence id |
| LLM Harness | QA + AI | Day 6 | Validate claim guard and fallback | LLM does not add unsupported claims |
| Simulation Harness | QA + BE | Day 7 | Validate before/after risk diff | Simulation does not create real transactions |
| On-chain Harness | QA + BE | Day 8 | Validate hash consistency and pending retry | Hashes are deterministic; retry is idempotent |
| UI Harness | QA + FE | Day 8 | Validate partial, replay, error, and pending states | User can see why result is partial or pending |

## P0 Test Cases

| Test ID | Area | Scenario | Input | Expected Result | Acceptance |
|---|---|---|---|---|---|
| TC-001 | Input | Valid Mantle address | `0x` + 40 hex chars | Enters `DATA_GATHERING` | No validation error |
| TC-002 | Input | Invalid wallet address | Empty, short, non-hex | Stays out of scan workflow | API and UI show clear error |
| TC-003 | Data | Indexed APIs unavailable | No Moralis or Mantlescan key | `dataCoverage = partial` or `known-token-only` | Not marked safe |
| TC-004 | Approval | Approval event exists but allowance is zero | Fixture with revoked approval | Item excluded from active approval risk | `allowance(owner, spender)` is authoritative |
| TC-005 | Approval | Unlimited unknown approval | High-risk fixture | ApprovalRisk floor >= 80 | Evidence includes approval event and allowance call |
| TC-006 | Transfer | Address poisoning candidate | Lookalike incoming dust transfer | TransferRisk floor >= 75 | Transfer has txHash evidence |
| TC-007 | Concentration | Single non-stable asset > 85% | High mETH fixture | ConcentrationRisk floor >= 60 | Top risk includes concentration evidence |
| TC-008 | RWA/Yield | USDY oracle stale | RWA fixture with stale oracle | RWAYieldRisk >= 60 | Evidence source is RWA module, not CoinGecko APY |
| TC-009 | DeFi Stub | Known LP > $5,000 | LP fixture | DeFiExposureStub = 50 | Labeled as P0 stub |
| TC-010 | Evidence | Risk without evidence | Mutated fixture | Claim is blocked | No orphan claim in response |
| TC-011 | LLM | Unsupported claim in explanation | Prompt injection or model drift | Claim guard rejects output | Rule fallback returned |
| TC-012 | Simulation | Approval revoke impact | Active unknown approval | Before/after scores returned | No transaction request is created |
| TC-013 | Commit | Missing idempotency key | Commit request without key | Request rejected | No hash record created |
| TC-014 | Commit | Ledger failure | Simulated adapter failure | Status `pending_retry` | No infinite retry |
| TC-015 | Benchmark | Recorded assessment | Assessment hash exists | History shows record | Wallet address is hashed in record |
| TC-016 | Replay | Replay fixture | `dataMode = replay` | Same assessment hash generated | Deterministic output |
| TC-017 | UI | Partial source | Missing indexed history | Coverage banner visible | User sees limitation copy |
| TC-018 | UI | Pending commit | Async commit queued | On-chain card shows pending | No false recorded state |

## Day 1 Acceptance

- Test areas cover core path, input error, source error, LLM error, permission, instrumentation, regression, and demo.
- Every high-risk product rule has at least one test case.
- Test IDs are stable and can be referenced by Day 3 harness scripts.
