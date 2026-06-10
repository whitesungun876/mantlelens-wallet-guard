// Day 3 frontend mock hooks. These mirror the Day 1 API contract shape while
// the real FastAPI service is not connected yet.

export const demoFixtureIds = [
  "low_risk_wallet",
  "moderate_partial_wallet",
  "high_risk_wallet",
];

export async function useMockWalletScan(fixtureId = "high_risk_wallet") {
  const response = await fetch(`../fixtures/demo_wallets/${fixtureId}.json`);
  if (!response.ok) {
    throw new Error(`Missing demo fixture: ${fixtureId}`);
  }
  const fixture = await response.json();
  return {
    schemaVersion: "mantlelens.wallet_assessment.v1",
    assessmentId: fixture.expectedAssessment.assessmentId,
    chainId: fixture.chainId,
    wallet: fixture.wallet,
    walletRiskScore: fixture.expectedAssessment.walletRiskScore,
    riskLevel: fixture.expectedAssessment.riskLevel,
    dataConfidence: fixture.expectedAssessment.dataConfidence,
    topRisks: fixture.expectedAssessment.topRisks,
    subScores: fixture.expectedAssessment.subScores,
    dataCompleteness: fixture.dataCompleteness,
    suggestedActions: fixture.expectedAssessment.suggestedActions,
    dataMode: fixture.dataMode,
    dataCoverage: fixture.expectedAssessment.dataCoverage,
    evidence: fixture.evidence,
    balances: fixture.balances,
    approvals: fixture.approvals,
    transfers: fixture.transfers,
    onChainRecord: fixture.expectedAssessment.onChainRecord || {
      assessmentHash: fixture.expectedAssessment.assessmentHash,
      assessmentTx: null,
      status: "pending_unavailable",
    },
  };
}

export function assertSimulationOnly(assessment) {
  const unsafe = (assessment.suggestedActions || []).filter(
    (action) =>
      !["view_only", "simulation_only"].includes(action.executionMode),
  );
  if (unsafe.length > 0) {
    throw new Error("P0 mock exposed a non-simulation action");
  }
  return true;
}
