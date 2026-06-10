# P2.7 Live Demo Wallet Flow

## Goal

Prepare a Mantle Sepolia wallet that can be scanned with real read-only data and then optionally record an assessment hash on Mantle through explicit wallet confirmation.

This flow is designed for the live hackathon demo path. It does not require or accept wallet secrets or a backend signer.

## Safety Constraints

- Chain: Mantle Sepolia, chainId `5003`.
- Wallet input: public `0x` address only.
- The setup helper never connects on page load.
- Every setup transaction uses browser wallet confirmation through `eth_sendTransaction`.
- Scan/page load never sends transactions.
- Assessment record proof is manual only.
- Verification is read-only and uses RPC receipt/log inspection.
- No revoke, swap, transfer, or signing is triggered by the main scan page.

## Files

- Setup helper: `frontend/app/public/p2_7_live_wallet_setup.html`
- Public artifact bundle: `frontend/app/public/p2_7_demo_contracts.json`
- Demo contracts: `contracts/MantleLensDemoToken.sol`
- Artifact builder: `scripts/build_p2_7_demo_contracts.py`
- Wallet-confirmed calldata API: `POST /api/assessment/commit/calldata`

## Demo Contract Design

`MantleLensDemoToken` is an ERC20-style testnet token:

- Symbol: `MLDT`
- Decimals: `18`
- Initial supply minted to the deploying demo wallet
- Supports `balanceOf`, `allowance`, `transfer`, `approve`, and `transferFrom`

`MantleLensDemoSpender` is the approval target and dust-transfer sender:

- Receives a normal MLDT transfer from the demo wallet
- Can send `0.000001 MLDT` back to the demo wallet as a tiny transfer
- Acts as the unknown/high-allowance spender for the active approval check

## Step-by-step Live Demo

1. Start backend and frontend.

   ```bash
   ./scripts/run_app.sh
   cd frontend/app && npm run dev
   ```

2. Open:

   ```text
   http://127.0.0.1:5173/p2_7_live_wallet_setup.html
   ```

3. Connect a fresh Mantle Sepolia wallet with testnet MNT.

4. Click each setup action and confirm in the wallet popup:

   - Deploy `MLDT` token
   - Deploy demo spender
   - Approve unlimited MLDT to spender
   - Normal transfer from demo wallet to spender
   - Tiny dust transfer from spender back to demo wallet

5. Copy the generated public allowlist snippet and restart the backend:

   ```bash
   MANTLE_CHAIN_ID=5003
   MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
   MANTLE_EXPLORER_BASE_URL=https://sepolia.mantlescan.xyz
   MANTLE_KNOWN_TOKENS_JSON='[{"symbol":"MLDT","tokenAddress":"0xDEPLOYED_TOKEN","decimals":18,"priceUsd":1}]'
   ```

6. Run the read-only live scan from the helper or main app.

7. Click `Prepare record calldata`.

8. Click `Record assessment hash` and confirm in the wallet popup.

9. Click `Verify assessment`.

Expected verified result:

- Transaction exists on Mantle Sepolia.
- Transaction target matches configured `ASSESSMENT_CONTRACT_ADDRESS`.
- Event `AssessmentRecorded` is present.
- Local assessment hash matches the on-chain event.

## API Contract

### `POST /api/assessment/commit/calldata`

Request:

```json
{
  "assessment": {
    "dataMode": "live",
    "chainId": 5003,
    "assessmentHash": "0x...",
    "wallet": { "walletHash": "0x..." },
    "evidenceBundleHash": "0x...",
    "recommendationHash": "0x...",
    "walletRiskScore": 60,
    "riskLevel": "High",
    "decisionType": "REVIEW_APPROVAL",
    "actionType": "SIMULATE_REVOKE_APPROVAL"
  }
}
```

Response:

```json
{
  "status": "ready",
  "method": "recordAssessment",
  "to": "0xAssessmentLogger",
  "contractAddress": "0xAssessmentLogger",
  "chainId": 5003,
  "networkName": "Mantle Sepolia",
  "value": "0x0",
  "data": "0x...",
  "walletConfirmationRequired": true,
  "privateKeyRequired": false,
  "onchainWriteAttempted": false
}
```

The endpoint returns calldata only. It does not sign, broadcast, or read signer secrets.

## Result Template

Fill these after wallet-confirmed setup:

- Demo wallet public address:
- Demo token contract address:
- Spender contract address:
- Approval tx hash:
- Normal transfer tx hash:
- Tiny transfer tx hash:
- Assessment tx hash:
- Token explorer link:
- Spender explorer link:
- Sample transfer explorer link:
- Assessment explorer link:
- Verification status:

## Verification Commands

```bash
python3 scripts/build_p2_7_demo_contracts.py
python3 -m unittest tests.test_p2_7_live_demo_wallet_setup -v
cd frontend/app && npm run build
```

## Known Caveats

- Explorer/indexed transfer data may lag after fresh Mantle Sepolia transactions.
- If indexed APIs lag, MantleLens can still confirm known-token balance and active allowance through RPC read calls once `MANTLE_KNOWN_TOKENS_JSON` is configured.
- Backend must be restarted after adding a newly deployed demo token to the known-token allowlist.
- The helper prepares demo testnet state; production wallets should not approve unlimited allowances to unknown spenders.
