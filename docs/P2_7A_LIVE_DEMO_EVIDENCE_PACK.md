# P2.7A Live Demo Evidence Pack

Freeze date: 2026-06-10

This pack records the public, read-only evidence for the MantleLens P2.7A live demo wallet. It contains only public addresses, public transaction hashes, public block data, and local QA results. It does not contain private keys, seed phrases, raw `.env` values, or API secrets.

## Freeze Summary

Status: evidence frozen with on-chain readback verification.

Network:

- Chain: Mantle Sepolia
- Chain ID: `5003`
- Explorer: `https://sepolia.mantlescan.xyz`

Live demo wallet:

- Public wallet address: `0xc70e1953e3473666182a875e660be7bc911ae459`
- Explorer: `https://sepolia.mantlescan.xyz/address/0xc70e1953e3473666182a875e660be7bc911ae459`

Demo token:

- Symbol: `MLDT`
- Contract: `0xb5600dccf7f95ff7e52f67fee192921d0eeb3a56`
- Explorer: `https://sepolia.mantlescan.xyz/address/0xb5600dccf7f95ff7e52f67fee192921d0eeb3a56`

Spender:

- Address: `0x0e8a5d375a9ff5c3121230f57f9a5a80b3dadda3`
- Explorer: `https://sepolia.mantlescan.xyz/address/0x0e8a5d375a9ff5c3121230f57f9a5a80b3dadda3`

AssessmentLogger:

- Contract: `0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c`
- Explorer: `https://sepolia.mantlescan.xyz/address/0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c`

## Live Wallet Evidence

### Token Balance

Read-only RPC call:

- Method: `ERC20.balanceOf(wallet)`
- Token: `MLDT`
- Balance raw: `999990000001000000000000`
- Balance display: `999990.000001 MLDT`
- This is a read call. It has no tx hash.

### Active Approval

Approval event:

- Tx hash: `0xd5ad2b5e33192b027106af13ee816a28aa5c4b5e780eefc0af2907ad13594641`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0xd5ad2b5e33192b027106af13ee816a28aa5c4b5e780eefc0af2907ad13594641`
- Block: `39758372`
- Owner: `0xc70e1953e3473666182a875e660be7bc911ae459`
- Spender: `0x0e8a5d375a9ff5c3121230f57f9a5a80b3dadda3`
- Allowance raw: `115792089237316195423570985008687907853269984665640564039457584007913129639935`
- Allowance: unlimited / max uint256

Active allowance confirmation:

- Method: `ERC20.allowance(owner, spender)`
- Confirmed active: yes
- Read call only; no tx hash.

### Normal Transfer

- Tx hash: `0xe1c66d4de673efaa55ecef0edbe8643fea2f8fa02c30762d81f7099cdfd87803`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0xe1c66d4de673efaa55ecef0edbe8643fea2f8fa02c30762d81f7099cdfd87803`
- Block: `39758378`
- From: `0xc70e1953e3473666182a875e660be7bc911ae459`
- To: `0x0e8a5d375a9ff5c3121230f57f9a5a80b3dadda3`
- Amount: `10 MLDT`

### Tiny Dust Transfer

- Tx hash: `0x8395f346f8884f79f8a0e20e745ee11afe4e4918b06b77557cd98efe38685659`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0x8395f346f8884f79f8a0e20e745ee11afe4e4918b06b77557cd98efe38685659`
- Block: `39758385`
- From: `0x0e8a5d375a9ff5c3121230f57f9a5a80b3dadda3`
- To: `0xc70e1953e3473666182a875e660be7bc911ae459`
- Amount: `0.000001 MLDT`
- Pattern: tiny incoming transfer / address-poisoning candidate

### Mint / Initial Balance Context

- Tx hash: `0x2cebe299658376fa85822043bcdeee3472e4debf202decc8ac542b4ac0952fe4`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0x2cebe299658376fa85822043bcdeee3472e4debf202decc8ac542b4ac0952fe4`
- Block: `39758351`
- From: zero address
- To: demo wallet
- Amount: `1,000,000 MLDT`

## Live Scan Record

Latest locally stored live scan record used for freeze reference:

- Wallet: `0xc70e1953e3473666182a875e660be7bc911ae459`
- Chain: Mantle Sepolia `5003`
- Scan timestamp: `2026-06-10T03:45:22.230004+00:00`
- Data status: `PARTIAL_OR_UNKNOWN`
- Risk score: `22.25`
- Risk level: `High`
- Assessment hash: `0xbca30db3a6348665908834af5c9f31a066fee6dfaac0eaa6cfd8bd4a252a5bec`
- Evidence bundle hash: `0xbd09bab59dbbaa451d2692e06f09d7521ff15d3ad7737732c050531c9df3c1a6`
- Evidence count: `9`
- Detail counts: `1 approval`, `2 inventory tokens`, `3 transfers`
- Source status caveat: Moralis indexed data was partial; missing indexed data remains unknown, not safe.

Top risk summaries in the stored record:

- Dust transfer / address poisoning
- Suspicious or unverified token
- Partial source coverage

Current freeze caveat:

- During this freeze pass, `/api/wallet/scan` returned an empty HTTP `502` for the live wallet, while `/api/provider/status` and direct read-only Mantle Sepolia RPC verification worked. This is recorded as a live-provider smoke caveat, not a secret or chain-write issue.

## Simulation Record

Simulation remains simulation-only.

The product flow is designed to show before/after risk impact without broadcasting a transaction. For this live wallet, the actionable evidence is the active unlimited MLDT allowance and the tiny transfer signal.

Expected demo explanation:

- Before: live assessment risk index based on evidence-backed signals and partial source coverage.
- Simulated action: review / simulate revoke impact for the active MLDT allowance.
- After: approval-related risk contribution is reduced in the simulated state only.
- Transaction created: `false`
- Broadcast: `false`
- Safety note: no revoke, swap, transfer, or wallet signing is performed by scan or simulation.

## On-chain Assessment Proof

Assessment transaction:

- Tx hash: `0x00caf7c1017fd8a692cd166f6d69c12c530a415f375f9cd0c66010b270e1d369`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0x00caf7c1017fd8a692cd166f6d69c12c530a415f375f9cd0c66010b270e1d369`
- Block: `39759253`
- Block timestamp: `2026-06-10T03:46:19+00:00`
- Contract: `0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c`
- Event: `AssessmentRecorded`
- Assessment hash: `0xbca30db3a6348665908834af5c9f31a066fee6dfaac0eaa6cfd8bd4a252a5bec`
- Wallet hash: `0xfff6c2386694b60fbac921b570cd0fc454e76742f744566519b62a85003e9a14`
- Record ID: `0x8c5b7ea05a07676161e1b501ce09f3c29f6d19dfeceaab79c00ff70ed5c5f370`
- Verification status: `verified`
- Match result: `matched assessment hash`

Important proof boundary:

- This proves the assessment hash was recorded on Mantle Sepolia.
- It does not prove the wallet is safe.
- Missing indexed data remains unknown, not safe.

## Screenshots / Records

UI screenshots already present:

- Live overview: `artifacts/current_overview_live.png`
- Live semantics overview: `artifacts/presentation_semantics_live_overview.png`
- Source coverage refactor: `artifacts/source_coverage_refactor.png`
- Judge smoke screenshot: `artifacts/p2_6_judge_browser_smoke.png`

Read-only records captured during this freeze:

- `eth_getLogs` returned the `AssessmentRecorded` event for the assessment transaction.
- `eth_getLogs` returned the MLDT approval, normal transfer, and tiny transfer events.
- `eth_call` confirmed MLDT balance and max uint256 active allowance.
- `AssessmentReadbackVerifier` returned `verificationStatus: verified`.

## Secret Exposure Check

Freeze checks:

- No private key was printed.
- No seed phrase was printed.
- No raw `.env` content was copied into this document.
- No raw API key was copied into this document.
- Only public wallet, contract, transaction, block, and hash values are recorded.

## Verification Commands Run

Targeted checks:

```bash
python3 -m unittest tests.test_presentation_state_semantics -v
python3 -m unittest tests.test_p2_6_demo_ux.P26DemoUxSimplificationTest.test_primary_copy_hides_debug_labels -v
cd frontend/app && npm run lint
cd frontend/app && npm run typecheck
cd frontend/app && npm run build
```

Full QA:

```bash
./scripts/qa_all.sh
```

Result:

- `lint ok`
- frontend typecheck passed
- frontend build passed
- unit / integration tests passed
- replay smoke passed
- live smoke remained `PARTIAL_OR_UNKNOWN`
- browser smoke passed
- final output: `mantlelens qa all ok`

## Commit / Tag Status

Requested tag: `p2-7a-live-demo-proof-pass`

Current workspace status:

- `/Users/lola/Desktop/mantle` is not inside an existing Git repository.
- Because there is no git root, no commit or tag was created during this freeze pass.
- A git init / first commit can be done only as an explicit repository setup step to avoid accidentally versioning unrelated local files.
