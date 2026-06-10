# P2.7B-2 Mantle-native Signals

## Goal

P2.7B-2 keeps MantleLens as a generic EVM wallet risk engine while making the hackathon demo clearly Mantle-first. This pass does not add a new top-level page, does not change the risk engine, and does not add signing, revoke, swap, transfer, or automatic on-chain transactions.

## What Changed

- Added a Mantle-native signals panel to Overview.
- Added Mantle-aware token labels in inventory and evidence surfaces.
- Added Mantle Sepolia proof source labels for AssessmentLogger.
- Added explicit MLDT limitation copy:
  `Demo yield-like token used for Mantle Sepolia testing; not official mETH/cmETH.`
- Added proof copy for:
  - Mantle Sepolia
  - chainId 5003
  - Mantle Sepolia AssessmentLogger
  - AssessmentRecorded event
  - Mantle explorer links
- Added tests that guard against overstating MLDT, mETH, cmETH, or unknown protocols.

## Generic EVM Engine Preserved

The existing engine still owns:

- approval risk
- active allowance confirmation
- suspicious transfers
- address poisoning candidates
- asset concentration
- source coverage
- evidence bundle
- simulation
- assessment history

## Mantle-specific Presentation

Mantle-specific copy now appears in existing product surfaces:

- Overview: Mantle-native signals panel.
- Inventory: MLDT is labeled as a demo Mantle yield-like token.
- Evidence: MLDT evidence carries the Sepolia testing limitation.
- Proof: AssessmentLogger is labeled as the Mantle Sepolia proof source.

## Safety Boundaries

- No private key or seed phrase is displayed or requested.
- No scan sends a transaction.
- No revoke, swap, transfer, or signing action was added.
- Assessment hash recording remains explicit and manual.
- The assessment hash proves the assessment record, not wallet safety.
- Unknown protocol labels remain unknown, not safe.

## Known Caveats

- MLDT is a demo token for Mantle Sepolia testing. It is not official mETH/cmETH and is not real RWA exposure.
- Mantle Mainnet is shown as the production target only where the configured adapter supports it, otherwise it remains coming soon.
- This pass intentionally avoids turning MantleLens into a broad multi-chain dashboard.

## Verification

Commands for this pass:

```bash
python3 -m unittest tests.test_p2_7b_mantle_native_signals -v
python3 -m unittest tests.test_presentation_state_semantics -v
python3 -m unittest tests.test_p2_7_live_demo_wallet_setup -v
cd frontend/app && npm run typecheck
cd frontend/app && npm run build
./scripts/qa_all.sh
```

Snapshot created before this pass:

```text
snapshots/p2_7a_live_demo_proof_p2_7b1_unknown_safe_20260610_135147.tar.gz
```
