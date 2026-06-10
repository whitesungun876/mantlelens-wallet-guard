# Day 6 API Integration

## Goal

Expose the Day 5 workflow through a local API and provide a frontend page that renders the real API response.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/server.py` | Standard-library HTTP server and local API |
| `frontend/api-workspace.html` | API-connected Agent Workspace |
| `tests/test_day5_day6_workflows.py` | Workflow, policy, and HTTP API tests |

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Local server health |
| `/api/wallet/scan` | POST | Returns assessment, evidence bundle, fallback explanation, coverage, trace |
| `/api/agent/explain` | POST | Returns rule fallback explanation for a supplied assessment/evidence bundle |
| `/api/policy/commit-check` | POST | Validates Day 6 commit guard |
| `/` | GET | Serves `frontend/api-workspace.html` |

## Run

```bash
python3 -m backend.mantlelens.server --host 127.0.0.1 --port 8765
```

Then open:

```text
http://127.0.0.1:8765
```

## Day 6 Acceptance

- The page calls `/api/wallet/scan`.
- The page renders score, risk level, data status, top risks, evidence, explanation, and trace from the API response.
- API response includes `assessment`, `evidenceBundle`, `coverage`, `trace`, and `explanation`.
- HTTP harness test passes.
