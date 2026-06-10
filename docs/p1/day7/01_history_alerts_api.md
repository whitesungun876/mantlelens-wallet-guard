# P1 Day 7 History And Alerts API

## Status

P1 Day 7 is implemented.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/wallet/history?walletHash=...` | GET | Returns trend history, benchmark records, and all local alerts for a wallet |
| `/api/alerts?walletHash=...&status=open` | GET | Returns local alerts filtered by wallet and status |
| `/api/alerts/resolve` | POST | Resolves one local alert by `alertId` |

## Safety Boundary

Alert resolution changes local process state only. It does not revoke approvals, submit transactions, transfer assets, or broadcast anything to Mantle.

## Acceptance

HTTP smoke passed:

```text
trend available 2
alerts 3 ['new_active_approval', 'source_unavailable', 'suspicious_transfer_detected']
resolved resolved alert_a395f5ef11ddf3ef
```
