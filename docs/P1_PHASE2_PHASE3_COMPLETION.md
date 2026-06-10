# P1 Phase 2/3 Completion Notes

## Phase 2 replay cases

PRD 20 replay fixtures are now explicit files under `fixtures/demo_wallets/`:

| Fixture | Expected riskLevel | Expected decisionType | Expected actionType |
| --- | --- | --- | --- |
| `stable_wallet` | `Low` | `SAFE` | `NO_ACTION` |
| `elevated_wallet` | `High` | `REVIEW_APPROVAL` | `SIMULATE_REVOKE_APPROVAL` |
| `critical_wallet` | `Critical` | `PAUSE` | `REVIEW_APPROVAL` |

Acceptance is locked by `tests/test_phase2_phase3_acceptance.py`.

## Phase 3 on-chain record

`/api/assessment/commit` no longer fabricates `mock_tx_*` values.

When `ASSESSMENT_CONTRACT_ADDRESS` and `PRIVATE_KEY` or `WALLET_PRIVATE_KEY` are missing, the record returns:

- `status = pending_unavailable`
- `commitMode = onchain_unavailable`
- `assessmentTx = null`
- `explorerUrl = null`
- `onchainRecordAvailable = false`

When a configured recorder submits a transaction, the record returns:

- `status = recorded`
- `commitMode = onchain`
- `assessmentTx = 0x...`
- `explorerUrl = https://mantlescan.xyz/tx/0x...`

`contracts/AssessmentLogger.sol` defines the target ABI for real assessment logging. The Python sender uses optional packages listed in `requirements.onchain.txt`; without those packages the API reports unavailable instead of creating a fake transaction.
