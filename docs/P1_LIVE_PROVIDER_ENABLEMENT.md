# P1 Live Provider Enablement

Date: 2026-06-08

## Enabled Locally

The local `.env` file has been created with restricted file permissions and is ignored by git.

Configured provider status:

| Provider / Capability | Status | Notes |
| --- | --- | --- |
| Mantle RPC | Configured | Uses Mantle Sepolia Alchemy RPC, chain id `5003`. |
| Moralis | Configured | Balances/history switches enabled; current live smoke reports `partial`, so missing Moralis indexed data remains unknown, not safe. |
| Etherscan V2 / MantleScan path | Configured | Used for paginated approvals, transfers, and NFT ApprovalForAll logs. |
| GoPlus | Configured | Used for token/address/approval security signals; advisory only. |
| Alchemy tx simulation | Configured | Uses Mantle Sepolia Alchemy RPC with standard `eth_call`; this is execution/revert simulation, not decoded Tenderly or Alchemy trace simulation. |
| AssessmentLogger on-chain record | Configured | Deployed on Mantle Sepolia and configured through `ASSESSMENT_CONTRACT_ADDRESS` / `ASSESSMENT_LOGGER_ADDRESS`; signer key is local `.env` only. |

AssessmentLogger deployment:

- Deployment tx: `0x2f41370b264e6822012576ed38ae7589c2ae8ec0f117e3c5ef79411aaa282228`
- Contract address: `0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c`
- Explorer base: `https://sepolia.mantlescan.xyz`

## Smoke Results

Command:

```bash
./scripts/qa_provider_config_smoke.sh
```

Result:

```text
mantleRpc: configured
moralis: configured
etherscanV2_or_mantlescan: configured
goPlus: configured
assessmentLogger: missing_or_disabled
txSimulation: configured
conditional provider config ok
```

Command:

```bash
./scripts/qa_live_provider_smoke.sh
```

Result summary:

```json
{
  "dataMode": "live",
  "dataStatus": "PARTIAL_OR_UNKNOWN",
  "durationSec": 4.01,
  "evidenceCount": 2,
  "riskLevel": "Moderate",
  "sourceAvailability": {
    "etherscanV2": "available",
    "goPlus": "available",
    "mantleRpc": "available",
    "moralis": "partial"
  }
}
```

Full production gate:

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
```

Current full gate result:

```text
provider config smoke:
- mantleRpc: configured
- moralis: configured
- etherscanV2_or_mantlescan: configured
- goPlus: configured
- assessmentLogger: configured
- txSimulation: configured
full P1 provider config ok
```

## Next Inputs Needed

The remaining live-data caveat is Moralis indexed wallet data on Mantle Sepolia, which still reports `partial` in live smoke. Missing indexed data remains unknown, not safe.

Do not commit `.env`; it is intentionally git-ignored.

## Deploy AssessmentLogger

This repo does not include a Hardhat or Foundry project. Use the standalone deploy script:

```bash
python3 -m pip install -r requirements.onchain.txt
python3 scripts/deploy_assessment_logger.py
```

The script reads `.env`, compiles `contracts/AssessmentLogger.sol` with `npx solc@0.8.20`, signs a deployment transaction, and prints:

```text
AssessmentLogger deployed to: 0x...
ASSESSMENT_CONTRACT_ADDRESS=0x...
ASSESSMENT_LOGGER_ADDRESS=0x...
```

Copy one of those address variables into `.env`, keep the signer key private, then run:

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
```

## Changelog

### 2026-06-09 P2.1/P2.2 Start

- Added explicit commit `recordMode`: `local_only` by default, `onchain` only when requested.
- `/api/assessment/commit` now requires `confirmationReceived: true` and a non-empty `idempotencyKey`.
- On-chain commits are accepted only for live assessments.
- Tests and QA scripts now clear private-key commit env vars or use unavailable/mock recorders by default.
- Live scan responses now include `integrity.evidenceBinding` and `integrity.sourceIntegrity`; missing data remains partial/source_failed and never safe.
