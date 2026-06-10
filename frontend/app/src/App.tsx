import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Eye,
  ExternalLink,
  FileWarning,
  History,
  ListChecks,
  Network,
  Play,
  RefreshCw,
  ScanSearch,
  Share2,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  commitAssessment,
  getAgentIdentity,
  getHealth,
  getProviderStatus,
  getWalletHistory,
  prepareAssessmentCommitCalldata,
  resolveAlert,
  runEnhancements,
  scanWallet,
  simulateApproval,
  simulatePortfolio,
  verifyAssessmentCommit
} from "./api";
import {
  getCoverageLabel as copyCoverageLabel,
  getCoverageWarningCopy,
  getDecisionAudit,
  getOutcomeLabel as copyOutcomeLabel,
  getPrimaryNextStep,
  getProofLabel,
  getRecordStatusLabel as copyRecordStatusLabel,
  getReviewWorkflow,
  getScoreDisplay,
  getSimulationAvailability,
  getSourceStatusGroups,
  getSourceStatusLabel as copySourceStatusLabel,
  getMantleProofNetworkLabel,
  getMantleProofSourceLabel,
  getMantleTokenLabel,
  getMantleTokenLimitation,
  getRiskHeadline,
  getRiskSubtitle,
  isDemoMantleYieldLikeToken,
  isCoverageOnlyAssessment,
  isPartialOrUnknown as copyIsPartialOrUnknown,
  normalizeUserFacingLabel
} from "./presentation/assessmentCopy";
import {
  buildAssessmentViewModel,
  filterHistoryRecordsForViewModel,
  getKnownSepoliaProofCommitRecord,
  getKnownSepoliaProofVerification,
  getRecordability,
  getProofState,
  getRecordStatus,
  SEPOLIA_JUDGE_DEMO_WALLET
} from "./presentation/assessmentViewModel";
import type { AssessmentViewModel } from "./presentation/assessmentViewModel";
import type {
  AgentIdentity,
  AlertItem,
  ChainTarget,
  CommitRecord,
  CommitVerification,
  DecisionAudit,
  EnhancementModule,
  EnhancementsResponse,
  EvidenceItem,
  ProviderStatus,
  RiskItem,
  ScanResponse,
  SimulationResponse,
  TokenItem,
  ApprovalItem,
  TransferItem,
  TraceEvent,
  Trend,
  TrendPoint,
  WalletHistoryResponse
} from "./types";

type TabId = "overview" | "evidence" | "history";
type SecondaryPanelId = "proof" | "advanced" | null;
type BrowserWalletProvider = {
  request: (payload: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};
type WalletActionState = {
  status: "idle" | "connecting" | "connected" | "sending" | "sent" | "error";
  connectedAddress?: string;
  lastTxHash?: string;
  error?: string;
};
type BenchmarkCase = {
  id: string;
  label: string;
  fixtureId: string;
  expectedScore: number;
  expectedRiskLevel: string;
  expectedDecision: string;
  signalFocus: string;
  coveragePreview: string;
  evidenceTypes: string[];
  proofAvailability: string;
  description: string;
};
type BenchmarkCaseResult = {
  caseId: string;
  caseLabel: string;
  fixtureId: string;
  score: number;
  riskLevel: string;
  decision: string;
  coverage: string;
  proofStatus: string;
  proofUrl?: string;
  assessmentHash: string;
  scanTimestamp?: string;
};

const THREE_SIGNAL_HERO_TITLE = "3 suspicious on-chain signals detected";

const benchmarkCases: BenchmarkCase[] = [
  {
    id: "multi_signal",
    label: "Multi-signal wallet",
    fixtureId: "high_risk_wallet",
    expectedScore: 60,
    expectedRiskLevel: "High",
    expectedDecision: "Review approval and simulate response",
    signalFocus: "Multiple signals, no hard red flag",
    coveragePreview: "Partial scan",
    evidenceTypes: ["active allowance confirmed", "transfer log with tx hash", "yield exposure evidence"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Multiple high-risk signals in one wallet task, but no hard red-flag block."
  },
  {
    id: "approval_anomaly",
    label: "Approval anomaly",
    fixtureId: "elevated_wallet",
    expectedScore: 41,
    expectedRiskLevel: "High",
    expectedDecision: "Review approval",
    signalFocus: "Unlimited approval",
    coveragePreview: "Partial scan",
    evidenceTypes: ["active allowance confirmed", "unknown spender"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Unlimited approval to an unknown spender with allowance confirmation."
  },
  {
    id: "address_poisoning",
    label: "Address poisoning signal",
    fixtureId: "address_poisoning_wallet",
    expectedScore: 27,
    expectedRiskLevel: "High",
    expectedDecision: "Review transfer evidence",
    signalFocus: "Dust transfer",
    coveragePreview: "Partial scan",
    evidenceTypes: ["transfer log with tx hash", "lookalike address", "partial coverage warning"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Tiny incoming transfer from a lookalike address with bounded wallet history coverage."
  },
  {
    id: "yield_concentration",
    label: "Yield concentration signal",
    fixtureId: "yield_concentration_wallet",
    expectedScore: 17,
    expectedRiskLevel: "High",
    expectedDecision: "Simulate lower exposure",
    signalFocus: "Portfolio exposure",
    coveragePreview: "Partial scan",
    evidenceTypes: ["known-token balance evidence", "yield exposure evidence", "source coverage warning"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Portfolio exposure signal for mETH/cmETH concentration, not a scam or attack signal."
  },
  {
    id: "partial_coverage",
    label: "Partial source coverage",
    fixtureId: "moderate_partial_wallet",
    expectedScore: 27,
    expectedRiskLevel: "Moderate",
    expectedDecision: "Check source coverage",
    signalFocus: "Data source gap",
    coveragePreview: "Partial scan",
    evidenceTypes: ["source coverage warning", "bounded logs", "unknown spender"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Indexed data sources are incomplete, so missing signals stay unknown instead of safe."
  },
  {
    id: "quiet_wallet",
    label: "Quiet wallet",
    fixtureId: "quiet_wallet",
    expectedScore: 0,
    expectedRiskLevel: "Moderate",
    expectedDecision: "Treat insufficient activity as unknown",
    signalFocus: "Low wallet activity",
    coveragePreview: "Unknown coverage",
    evidenceTypes: ["native balance", "source coverage warning", "insufficient activity"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "The wallet itself has little activity, so the scan cannot infer enough behavior to call it safe."
  },
  {
    id: "critical_risk",
    label: "Critical red-flag wallet",
    fixtureId: "critical_wallet",
    expectedScore: 85,
    expectedRiskLevel: "Critical",
    expectedDecision: "PAUSE and review approval",
    signalFocus: "Hard red flag",
    coveragePreview: "Partial scan",
    evidenceTypes: ["malicious spender signal", "active allowance confirmed", "transfer log with tx hash"],
    proofAvailability: "Replay benchmark only; use live Sepolia for a Mantlescan tx proof.",
    description: "Hard red-flag case that should immediately pause wallet interaction until evidence is reviewed."
  }
];

const demoScanTarget: ChainTarget = {
  id: "demo-data",
  name: "Demo data",
  chainId: null,
  environment: "custom",
  nativeSymbol: "MNT",
  enabled: true,
  supportsReadOnlyScan: true,
  supportsAssessmentCommit: false,
  knownTokenAllowlistKey: "mantle-demo",
  label: "Demo data · Mantle risk profile",
  description: "Stable walkthrough data for approval, address poisoning, and Mantle yield exposure signals."
};

const fallbackChainTargets: ChainTarget[] = [
  {
    id: "mantle-sepolia",
    name: "Mantle Sepolia",
    chainId: 5003,
    environment: "testnet",
    nativeSymbol: "MNT",
    enabled: true,
    supportsReadOnlyScan: true,
    supportsAssessmentCommit: true,
    knownTokenAllowlistKey: "mantle-sepolia",
    label: "Mantle Sepolia · Testnet · 5003",
    description: "Recommended for live smoke testing."
  },
  {
    id: "mantle-mainnet",
    name: "Mantle Mainnet",
    chainId: 5000,
    environment: "mainnet",
    nativeSymbol: "MNT",
    enabled: false,
    comingSoon: true,
    supportsReadOnlyScan: false,
    supportsAssessmentCommit: false,
    knownTokenAllowlistKey: "mantle-mainnet",
    label: "Mantle Mainnet · 5000",
    description: "Production Mantle target. Backend read-only adapter can enable this when configured."
  },
  {
    id: "custom-evm",
    name: "Custom EVM network",
    chainId: null,
    environment: "custom",
    nativeSymbol: "ETH",
    enabled: false,
    comingSoon: true,
    supportsReadOnlyScan: false,
    supportsAssessmentCommit: false,
    knownTokenAllowlistKey: "custom-evm",
    label: "Custom EVM network · Adapter-ready / Coming soon",
    description: "Adapter-ready extension point; not enabled in this build."
  }
];

export function App() {
  const [health, setHealth] = useState("checking API");
  const [selectedTargetId, setSelectedTargetId] = useState("demo-data");
  const [selectedBenchmarkCaseId, setSelectedBenchmarkCaseId] = useState("multi_signal");
  const [walletAddress, setWalletAddress] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [maxPages, setMaxPages] = useState(2);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanelId>(null);
  const [advancedFocus, setAdvancedFocus] = useState<"trace" | null>(null);
  const [currentData, setCurrentData] = useState<ScanResponse | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletHistoryResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse["simulation"] | null>(null);
  const [commitRecord, setCommitRecord] = useState<CommitRecord | null>(null);
  const [commitVerification, setCommitVerification] = useState<CommitVerification | null>(null);
  const [commitVerifyLoading, setCommitVerifyLoading] = useState(false);
  const [enhancements, setEnhancements] = useState<EnhancementsResponse | null>(null);
  const [manualRevokeTx, setManualRevokeTx] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletActionState>({ status: "idle" });
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkCaseResult>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready");

  useEffect(() => {
    getHealth()
      .then((data) => setHealth(`${data.status} · ${data.mode} · day ${data.day}`))
      .catch(() => setHealth("API unavailable"));
    getAgentIdentity()
      .then(setAgentIdentity)
      .catch(() => setAgentIdentity(null));
    getProviderStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  useEffect(() => {
    if (!secondaryPanel || (secondaryPanel === "advanced" && advancedFocus === "trace")) return;
    const timer = window.setTimeout(() => {
      document.getElementById("secondary-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [secondaryPanel, advancedFocus]);

  useEffect(() => {
    if (secondaryPanel !== "advanced" || advancedFocus !== "trace") return;
    const timer = window.setTimeout(() => {
      document.getElementById("agent-trace-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [secondaryPanel, advancedFocus, currentData]);

  const chainTargets = [demoScanTarget, ...(providerStatus?.chainTargets?.length ? providerStatus.chainTargets : fallbackChainTargets)];
  const selectedTarget = chainTargets.find((target) => target.id === selectedTargetId) || demoScanTarget;
  const liveScanTargets = chainTargets.filter((target) => target.id !== demoScanTarget.id);
  const defaultLiveTarget =
    liveScanTargets.find((target) => target.id === "mantle-sepolia") ||
    liveScanTargets.find((target) => target.enabled && target.supportsReadOnlyScan) ||
    liveScanTargets[0];
  const selectedBenchmarkCase = benchmarkCases.find((item) => item.id === selectedBenchmarkCaseId) || benchmarkCases[0];
  const isDemoTarget = selectedTarget.id === demoScanTarget.id;
  const scanTargetDisabled = !isDemoTarget && (!selectedTarget.enabled || !selectedTarget.supportsReadOnlyScan);
  const walletAddressTrimmed = walletAddress.trim();
  const liveAddressValid = isDemoTarget || isEvmAddress(walletAddressTrimmed);
  const liveAddressError =
    !isDemoTarget && !walletAddressTrimmed
      ? "Enter a valid 0x address to run a Mantle Sepolia read-only scan."
      : !isDemoTarget && !isEvmAddress(walletAddressTrimmed)
      ? "Enter a valid 0x address to run a Mantle Sepolia read-only scan."
      : "";
  const scanDisabled = loading || scanTargetDisabled || !liveAddressValid || (!isDemoTarget && !walletAddressTrimmed);
  const activeTrend = walletHistory?.trend || currentData?.monitoringTrend || currentData?.trend || null;
  const activeAlerts = walletHistory?.alerts || currentData?.alerts || [];
  const reconciledCommitRecord = currentData ? commitRecord || getKnownSepoliaProofCommitRecord(currentData.assessment) : commitRecord;
  const reconciledCommitVerification = currentData
    ? commitVerification || getKnownSepoliaProofVerification(currentData.assessment)
    : commitVerification;

  const evidence = currentData?.evidenceBundle.evidence || [];
  const prioritizedEvidence = useMemo(() => {
    const selected = new Set(selectedEvidenceIds);
    return [...evidence].sort((left, right) => {
      return Number(selected.has(right.evidenceId)) - Number(selected.has(left.evidenceId));
    });
  }, [evidence, selectedEvidenceIds]);

  async function performScan({
    demo,
    fixtureId,
    benchmarkCase,
    target,
    address,
    successMessage = "Scan complete",
  }: {
    demo: boolean;
    fixtureId: string;
    benchmarkCase?: BenchmarkCase;
    target?: ChainTarget;
    address?: string;
    successMessage?: string;
  }) {
    if (!demo && !isEvmAddress(address || "")) {
      setMessage("Enter a valid 0x address to run a Mantle Sepolia read-only scan.");
      return false;
    }
    setLoading(true);
    setMessage(demo ? "Running demo scenario" : "Running live Mantle Sepolia scan");
    try {
      const response = await scanWallet({
        dataMode: demo ? "demo" : "live",
        scanMode: demo ? "demo" : "live",
        fixtureId,
        benchmarkCaseId: demo ? benchmarkCase?.id : undefined,
        benchmarkCaseLabel: demo ? benchmarkCase?.label : undefined,
        walletAddress: demo ? undefined : address,
        targetId: demo ? undefined : target?.id,
        chainId: demo ? undefined : target?.chainId,
        historyOptions: demo
          ? undefined
          : {
              pageSize,
              maxPages,
              fromBlock: 1,
              toBlock: "latest",
              sort: "desc"
            },
        includeExplanation: true
      });
      setCurrentData(response);
      setSimulation(null);
      setCommitRecord(null);
      setCommitVerification(null);
      setCommitVerifyLoading(false);
      setEnhancements(null);
      setManualRevokeTx(null);
      setWalletAction((previous) => ({
        status: previous.connectedAddress ? "connected" : "idle",
        connectedAddress: previous.connectedAddress
      }));
      setSelectedEvidenceIds(response.assessment.topRisks[0]?.evidenceIds || []);
      if (demo && benchmarkCase) {
        setBenchmarkResults((previous) => ({
          ...previous,
          [benchmarkCase.id]: benchmarkResultFromScan(benchmarkCase, response, "Replay proof only"),
        }));
      }
      setMessage(successMessage);
      setLoading(false);
      void loadWalletHistory(response);
      void loadEnhancements(response);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scan failed");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    await performScan({
      demo: isDemoTarget,
      fixtureId: isDemoTarget ? selectedBenchmarkCase.fixtureId : "live_wallet",
      benchmarkCase: isDemoTarget ? selectedBenchmarkCase : undefined,
      target: selectedTarget,
      address: walletAddressTrimmed,
    });
  }

  async function runBenchmarkSuite() {
    setLoading(true);
    setMessage("Running replay benchmark suite");
    const nextResults: Record<string, BenchmarkCaseResult> = {};
    try {
      for (const benchmarkCase of benchmarkCases) {
        setMessage(`Running replay case: ${benchmarkCase.label}`);
        const response = await scanWallet({
          dataMode: "demo",
          scanMode: "demo",
          fixtureId: benchmarkCase.fixtureId,
          benchmarkCaseId: benchmarkCase.id,
          benchmarkCaseLabel: benchmarkCase.label,
          includeExplanation: true,
        });
        nextResults[benchmarkCase.id] = benchmarkResultFromScan(benchmarkCase, response, "Replay proof only");
      }
      setBenchmarkResults((previous) => ({ ...previous, ...nextResults }));
      setMessage("Replay suite complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Replay suite failed");
    } finally {
      setLoading(false);
    }
  }

  function clearScanDerivedState(nextMessage = "Ready to scan") {
    setCurrentData(null);
    setWalletHistory(null);
    setSimulation(null);
    setCommitRecord(null);
    setCommitVerification(null);
    setCommitVerifyLoading(false);
    setEnhancements(null);
    setManualRevokeTx(null);
    setWalletAction((previous) => ({
      status: previous.connectedAddress ? "connected" : "idle",
      connectedAddress: previous.connectedAddress
    }));
    setSelectedEvidenceIds([]);
    setMessage(nextMessage);
  }

  function handleTargetChange(value: string) {
    const target = chainTargets.find((item) => item.id === value);
    if (!target || !target.enabled || !target.supportsReadOnlyScan) return;
    setSelectedTargetId(value);
    if (value === demoScanTarget.id) setWalletAddress("");
    clearScanDerivedState(value === demoScanTarget.id ? "Ready to scan demo data" : `Ready to scan ${target.name}`);
  }

  function handleScanModeChange(nextMode: "demo" | "live") {
    if (nextMode === "demo") {
      handleTargetChange(demoScanTarget.id);
      return;
    }
    if (defaultLiveTarget) handleTargetChange(defaultLiveTarget.id);
  }

  function handleBenchmarkCaseChange(value: string) {
    setSelectedBenchmarkCaseId(value);
    const nextCase = benchmarkCases.find((item) => item.id === value);
    clearScanDerivedState(nextCase ? `Ready to run demo scenario: ${nextCase.label}` : "Ready to run demo scenario");
  }

  function handleWalletAddressChange(value: string) {
    setWalletAddress(value);
    if (currentData) clearScanDerivedState("Ready to scan wallet");
  }

  async function loadEnhancements(data: ScanResponse) {
    try {
      setEnhancements(await runEnhancements(data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enhancement modules unavailable");
    }
  }

  async function loadWalletHistory(data?: ScanResponse) {
    const source = data || currentData;
    const target = source?.assessment.wallet;
    if (!target?.walletHash) return;
    try {
      setWalletHistory(
        await getWalletHistory({
          walletHash: target.walletHash,
          address: target.address,
          chainId: source?.assessment.chainId,
          mode: source?.assessment.dataMode,
          limit: 20
        })
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "History refresh failed");
    }
  }

  async function handleSimulation(kind: "approval" | "portfolio") {
    if (!currentData) return;
    if (kind === "approval" && !canSimulateApproval(currentData)) {
      setMessage("No active approval evidence was found in this scan, so revoke simulation is unavailable.");
      return;
    }
    if (kind === "portfolio" && !canSimulatePortfolio(currentData)) {
      setMessage("No yield concentration evidence was found in this scan, so exposure simulation is unavailable.");
      return;
    }
    setMessage("Running simulation");
    try {
      const response =
        kind === "approval"
          ? await simulateApproval(currentData.assessment)
          : await simulatePortfolio(currentData.assessment);
      setSimulation(response.simulation);
      setMessage("Simulation complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
    }
  }

  async function handleCommit(recordMode: "local_only" | "onchain" = "local_only") {
    if (!currentData) return;
    if (recordMode === "onchain") {
      if (currentData.assessment.dataMode !== "live") {
        setMessage("On-chain record requires a live scan");
        return;
      }
      const confirmed = window.confirm(
        "This writes an assessment hash to Mantle Sepolia and spends testnet MNT gas. It does not revoke, swap, trade, or sign any wallet action."
      );
      if (!confirmed) {
        setMessage("On-chain record cancelled");
        return;
      }
      setMessage("Preparing wallet-confirmed assessment record");
      try {
        const calldata = await prepareAssessmentCommitCalldata(currentData.assessment);
        if (calldata.safety?.serverSigned || calldata.safety?.serverBroadcast || !calldata.walletConfirmationRequired) {
          throw new Error("Assessment record must be submitted by browser wallet confirmation.");
        }
        const provider = browserWalletProvider();
        if (!provider) {
          throw new Error("Browser wallet is required to record this assessment hash.");
        }
        await ensureWalletChain(provider, calldata.chainId);
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
        if (!from || !isEvmAddress(from)) {
          throw new Error("A valid browser wallet account is required.");
        }
        setMessage("Confirm the AssessmentLogger transaction in your wallet");
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from,
              to: calldata.to,
              value: calldata.value || "0x0",
              data: calldata.data
            }
          ]
        });
        if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
          throw new Error("Wallet did not return a transaction hash.");
        }
        const record: CommitRecord = {
          assessmentId: currentData.assessment.assessmentId,
          assessmentHash: currentData.assessment.assessmentHash,
          assessmentTx: txHash,
          chainId: calldata.chainId,
          networkName: calldata.networkName,
          contractAddress: calldata.contractAddress,
          explorerUrl: `${calldata.explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}`,
          status: "recorded",
          commitMode: "wallet_confirmed_onchain",
          requestedRecordMode: "onchain",
          onchainRecordAvailable: true,
          onchainWriteAttempted: true,
          unavailableReason: null,
          retryReason: null,
          realExecutionAllowed: true
        };
        setCommitRecord(record);
        setCommitVerification(null);
        setMessage("Assessment hash submitted. Click Verify assessment to confirm matched.");
        await loadWalletHistory(currentData);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Record failed");
      }
      return;
    }
    setMessage("Saving assessment");
    try {
      const response = await commitAssessment(currentData.assessment, simulation, recordMode);
      setCommitRecord(response.record);
      setCommitVerification(null);
      setMessage(response.record.status === "recorded" || response.record.status === "recorded_local" ? "Assessment recorded" : "Assessment record unavailable");
      await loadWalletHistory(currentData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Record failed");
    }
  }

  async function handleVerifyCommit() {
    const proofRecord = currentData ? commitRecord || getKnownSepoliaProofCommitRecord(currentData.assessment) : commitRecord;
    if (!proofRecord?.assessmentTx) {
      setMessage("No on-chain record to verify yet");
      return;
    }
    setCommitVerifyLoading(true);
    setMessage("Checking proof on Mantle Sepolia");
    try {
      const verification = await verifyAssessmentCommit(
        proofRecord.assessmentTx,
        proofRecord.assessmentId,
        proofRecord.assessmentHash
      );
      setCommitVerification(verification);
      const status = verification.verificationStatus || verification.status;
      setMessage(status === "verified" ? "Proof verified on Mantle" : `On-chain record verification: ${status}`);
      await loadWalletHistory(currentData || undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setCommitVerifyLoading(false);
    }
  }

  async function handleResolve(alert: AlertItem) {
    try {
      await resolveAlert(alert.alertId);
      setMessage(`Resolved ${alert.alertType}`);
      await loadWalletHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Resolve failed");
    }
  }

  async function handleManualRevoke(txRequest: NonNullable<EnhancementModule["txRequest"]>) {
    if (!txRequest.to || !txRequest.data) {
      setMessage("Prepared revoke request is incomplete");
      return;
    }
    const reviewOnly = `review_only ${txRequest.method || "approve(address,uint256)"} · to ${shortAddress(txRequest.to)} · chain ${txRequest.chainId || currentData?.assessment.chainId || "unknown"}`;
    setManualRevokeTx(reviewOnly);
    setMessage("Prepared revoke request reviewed. Use wallet execution only if you control the scanned wallet.");
  }

  async function handleConnectWallet() {
    const error = "wallet execution disabled; MantleLens only prepares review-only revoke context in this demo.";
    setWalletAction({ status: "error", error });
    setMessage(error);
    return null;
  }

  async function handleWalletRevoke(txRequest: NonNullable<EnhancementModule["txRequest"]>) {
    const validation = validatePreparedRevokeTx(txRequest);
    if (validation) {
      setWalletAction({ status: "error", connectedAddress: walletAction.connectedAddress, error: validation });
      setMessage(validation);
      return;
    }
    const reviewOnly = `wallet execution disabled · review approve(address,uint256) revoke · token ${shortAddress(String(txRequest.to || ""))}`;
    setWalletAction({ status: "error", error: "wallet execution disabled" });
    setManualRevokeTx(reviewOnly);
    setMessage("Prepared revoke request reviewed. wallet execution disabled in this demo.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <h1>MantleLens Wallet Guard</h1>
          <p>AI on-chain risk intelligence for Mantle wallets.</p>
        </div>
        <div className="topbar-status">
          <span className={`status-pill ${health.startsWith("ok") || health.startsWith("healthy") ? "status-ok" : health === "checking API" ? "status-checking" : "status-err"}`}>
            <span className="status-dot" aria-hidden="true" />
            {healthStatusLabel(health)}
          </span>
        </div>
      </header>
      {loading && <ActivityRibbon label="Scanning Mantle wallet data and binding evidence" />}

      <div className="workspace">
        <main className="main-area">
          <div className="scan-zone">
          <section className="panel scan-console" aria-label="Wallet scan">
            <div className="scan-console-head">
              <div className="scan-copy">
                <small>Wallet risk intelligence</small>
                <strong>Review a Mantle wallet before acting.</strong>
              </div>
              <span className="scan-status-pill">{scanStatusLabel({ loading, currentData, isDemoTarget, message })}</span>
            </div>
            <div className="scan-form">
              <div className="scan-fields-grid">
                <div className="scan-mode-group">
                  <span className="field-label">Scan mode</span>
                  <div className="segmented-control" role="group" aria-label="Scan mode">
                    <button className={`segment ${isDemoTarget ? "active" : ""}`} type="button" onClick={() => handleScanModeChange("demo")}>
                      Demo scenario
                    </button>
                    <button
                      className={`segment ${!isDemoTarget ? "active" : ""}`}
                      type="button"
                      onClick={() => handleScanModeChange("live")}
                      disabled={!defaultLiveTarget?.enabled || !defaultLiveTarget?.supportsReadOnlyScan}
                    >
                      Live scan
                    </button>
                  </div>
                </div>
                {isDemoTarget ? (
                  <BenchmarkCaseSelector selectedCase={selectedBenchmarkCase} onChange={handleBenchmarkCaseChange} />
                ) : (
                  <div className="live-scan-stack">
                    <label htmlFor="scan-target" className="scan-target-field">
                      Live scan target
                      <select id="scan-target" value={selectedTarget.id} onChange={(event) => handleTargetChange(event.target.value)}>
                        {liveScanTargets.map((target) => (
                          <option key={target.id} value={target.id} disabled={!target.enabled || !target.supportsReadOnlyScan}>
                            {targetOptionLabel(target)}
                          </option>
                        ))}
                      </select>
                      <small className="field-hint">{scanTargetHint(selectedTarget)}</small>
                    </label>
                    <label htmlFor="wallet-address">
                      Wallet address
                      <input
                        id="wallet-address"
                        value={walletAddress}
                        placeholder="Enter public 0x wallet address"
                        onChange={(event) => handleWalletAddressChange(event.target.value)}
                        aria-invalid={Boolean(liveAddressError)}
                      />
                      <small className={liveAddressError ? "field-hint danger" : "field-hint"}>
                        {liveAddressError || "Read-only scan. No wallet signing, revoke, swap, transfer, or transaction broadcast."}
                      </small>
                      <div className="judge-wallet-row">
                        <span>Sepolia sample wallet: {shortAddress(SEPOLIA_JUDGE_DEMO_WALLET)} · Read-only live scan · Recording requires wallet confirmation</span>
                        <button type="button" onClick={() => handleWalletAddressChange(SEPOLIA_JUDGE_DEMO_WALLET)}>
                          Use Sepolia sample wallet
                        </button>
                      </div>
                    </label>
                  </div>
                )}
              </div>
              <div className="scan-action-row">
                <button className="primary scan-primary-action" data-testid="scan-button" disabled={scanDisabled} onClick={handleScan}>
                  <ScanSearch size={17} />
                  {loading ? "Scanning" : isDemoTarget ? "Run demo scan" : "Scan wallet"}
                </button>
              </div>
            </div>
            <details className="advanced-scan-settings">
              <summary>Scan settings</summary>
              <div className="advanced-scan-grid">
                <div className="advanced-scan-fields">
                  <label htmlFor="page-size">
                    Page size
                    <input
                      id="page-size"
                      type="number"
                      min={10}
                      max={1000}
                      step={10}
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value || 10));
                        if (currentData) clearScanDerivedState("Ready to rescan with updated settings");
                      }}
                    />
                  </label>
                  <label htmlFor="max-pages">
                    Max pages
                    <input
                      id="max-pages"
                      type="number"
                      min={1}
                      max={10}
                      value={maxPages}
                      onChange={(event) => {
                        setMaxPages(Number(event.target.value || 2));
                        if (currentData) clearScanDerivedState("Ready to rescan with updated settings");
                      }}
                    />
                  </label>
                </div>
                <button className="secondary-control compact-refresh" data-testid="refresh-history" disabled={!currentData} onClick={() => loadWalletHistory()}>
                  <RefreshCw size={16} />
                  Refresh history
                </button>
              </div>
            </details>
          </section>
          </div>{/* end scan-zone */}

          <div className="workspace-nav">
            <nav className="tabs" aria-label="Primary workflow">
              <TabButton
                tab="overview"
                activeTab={secondaryPanel ? null : activeTab}
                setActiveTab={(tab) => {
                  setSecondaryPanel(null);
                  setActiveTab(tab);
                }}
                icon={<Database size={16} />}
                label="Overview"
              />
              <TabButton
                tab="evidence"
                activeTab={secondaryPanel ? null : activeTab}
                setActiveTab={(tab) => {
                  setSecondaryPanel(null);
                  setActiveTab(tab);
                }}
                icon={<Eye size={16} />}
                label="Evidence"
              />
              <TabButton
                tab="history"
                activeTab={secondaryPanel ? null : activeTab}
                setActiveTab={(tab) => {
                  setSecondaryPanel(null);
                  setActiveTab(tab);
                }}
                icon={<History size={16} />}
                label="History"
              />
            </nav>
            <div className="secondary-controls" aria-label="Secondary controls">
              <button
                className={secondaryPanel === "advanced" ? "secondary-control active" : "secondary-control"}
                data-testid="open-advanced"
                aria-expanded={secondaryPanel === "advanced"}
                onClick={() => {
                  setAdvancedFocus(null);
                  setSecondaryPanel(secondaryPanel === "advanced" ? null : "advanced");
                }}
              >
                <Network size={15} />
                {secondaryPanel === "advanced" ? "Hide audit" : "Audit"}
              </button>
            </div>
          </div>

          {secondaryPanel === "proof" && (
            <SecondaryPanel title="On-chain proof" subtitle="Optional assessment hash recording and read-only verification." onClose={() => setSecondaryPanel(null)}>
              {currentData ? (
                <OnchainRecordPanel
                  data={currentData}
                  providerStatus={providerStatus}
                  commitRecord={reconciledCommitRecord}
                  commitVerification={reconciledCommitVerification}
                  verificationLoading={commitVerifyLoading}
                  onOnchainCommit={() => handleCommit("onchain")}
                  onVerifyCommit={handleVerifyCommit}
                />
              ) : (
                <EmptyState title="Run a scan before creating optional on-chain proof." />
              )}
            </SecondaryPanel>
          )}
          {secondaryPanel === "advanced" && (
            <SecondaryPanel title="Developer audit" subtitle="Diagnostics, raw traces, and hackathon proof details." onClose={() => setSecondaryPanel(null)}>
              <AdvancedView
                data={currentData}
                simulation={simulation}
                walletHistory={walletHistory}
                enhancements={enhancements}
                manualRevokeTx={manualRevokeTx}
                walletAction={walletAction}
                agentIdentity={agentIdentity}
                providerStatus={providerStatus}
                commitRecord={reconciledCommitRecord}
                benchmarkResults={benchmarkResults}
                onRunBenchmarkSuite={runBenchmarkSuite}
                onManualRevoke={handleManualRevoke}
                onConnectWallet={handleConnectWallet}
                onWalletRevoke={handleWalletRevoke}
              />
            </SecondaryPanel>
          )}

          {!secondaryPanel && activeTab === "overview" && (
            <SummaryView
              data={currentData}
              simulation={simulation}
              providerStatus={providerStatus}
              commitRecord={reconciledCommitRecord}
              onSimulateApproval={() => handleSimulation("approval")}
              onSimulatePortfolio={() => handleSimulation("portfolio")}
              onViewProof={() => setSecondaryPanel("proof")}
              onSelectRisk={(risk) => {
                setSelectedEvidenceIds(risk.evidenceIds || []);
                setActiveTab("evidence");
              }}
            />
          )}
          {!secondaryPanel && activeTab === "evidence" && (
            <EvidenceView
              evidence={prioritizedEvidence}
              selectedIds={selectedEvidenceIds}
              data={currentData}
              simulation={simulation}
              onBackOverview={() => setActiveTab("overview")}
              onSimulateApproval={() => handleSimulation("approval")}
              onSimulatePortfolio={() => handleSimulation("portfolio")}
              onViewProof={() => setSecondaryPanel("proof")}
              onViewDecisionDetails={() => setSecondaryPanel("advanced")}
              commitRecord={reconciledCommitRecord}
            />
          )}
          {!secondaryPanel && activeTab === "history" && (
            <MonitorView
              trend={activeTrend}
              history={walletHistory}
              alerts={activeAlerts}
              currentData={currentData}
              providerStatus={providerStatus}
              commitRecord={reconciledCommitRecord}
              benchmarkResults={benchmarkResults}
              onRunBenchmarkSuite={runBenchmarkSuite}
              onResolve={handleResolve}
              onReviewAlertEvidence={(alert) => {
                setSelectedEvidenceIds(alert.evidenceIds || alert.evidence_ids || []);
                setActiveTab("evidence");
              }}
              onViewProof={() => setSecondaryPanel("proof")}
            />
          )}

        </main>
      </div>
    </div>
  );
}

function TabButton({
  tab,
  activeTab,
  setActiveTab,
  icon,
  label
}: {
  tab: TabId;
  activeTab: TabId | null;
  setActiveTab: (tab: TabId) => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button className={activeTab === tab ? "tab active" : "tab"} data-testid={`tab-${tab}`} onClick={() => setActiveTab(tab)}>
      {icon}
      {label}
    </button>
  );
}

function SecondaryPanel({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className="secondary-panel" id="secondary-panel" aria-label={title}>
      <div className="secondary-panel-head">
        <div>
          <h2>{title}</h2>
          <small>{subtitle}</small>
        </div>
        <button className="secondary-control" onClick={onClose}>
          <XCircle size={15} />
          Close
        </button>
      </div>
      {children}
    </section>
  );
}

function ActivityRibbon({ label }: { label: string }) {
  return (
    <div className="activity-ribbon" role="status" aria-live="polite">
      <span className="activity-dot" />
      <span>{label}</span>
      <span className="activity-bar" aria-hidden="true" />
    </div>
  );
}

function BenchmarkCaseSelector({
  selectedCase,
  onChange
}: {
  selectedCase: BenchmarkCase;
  onChange: (value: string) => void;
}) {
  return (
    <div className="benchmark-case-stack">
      <label htmlFor="benchmark-case">
        Demo scenario
        <select id="benchmark-case" value={selectedCase.id} onChange={(event) => onChange(event.target.value)}>
          {benchmarkCases.map((item) => (
            <option key={item.id} value={item.id}>
              {benchmarkOptionLabel(item)}
            </option>
          ))}
        </select>
        <small className="field-hint">Choose a scenario, then run the demo scan to generate that result.</small>
      </label>
      <div
        className="benchmark-case-meta compact"
        data-testid="benchmark-case-meta"
        title={`${selectedCase.description} ${selectedCase.proofAvailability}`}
      >
        <small className="scenario-summary-label">Scenario summary</small>
        <span className="case-chip">
          <small>Risk</small>
          <strong>{selectedCase.expectedRiskLevel}</strong>
        </span>
        <span className="case-chip">
          <small>Decision</small>
          <strong>{benchmarkDecisionChip(selectedCase.expectedDecision)}</strong>
        </span>
        <span className="case-chip">
          <small>Evidence</small>
          <strong>{benchmarkEvidenceChip(selectedCase)}</strong>
        </span>
        <span className="case-chip">
          <small>Coverage</small>
          <strong>{selectedCase.coveragePreview}</strong>
        </span>
      </div>
    </div>
  );
}

function AgentRunTimeline({ data, spanAll = true, compact = false }: { data: ScanResponse | null; spanAll?: boolean; compact?: boolean }) {
  const status = data ? "complete" : "pending";
  const evidenceCount = data?.evidenceBundle.evidenceCount || data?.evidenceBundle.evidence.length || 0;
  const sourceCount = data ? sourceStatusCounts(data.coverage.sourceAvailability).available : 0;
  const signalCount = data ? buildEvidenceAuditGroups(data).length : 0;
  const steps = [
    {
      key: "DATA_GATHERING",
      label: "Collect wallet data",
      detail: data ? `${sourceCount} sources available or partially available` : "Waiting for a wallet scan"
    },
    {
      key: "RISK_EVALUATING",
      label: "Evaluate risk signals",
      detail: data ? timelineRiskEvaluationDetail(data, signalCount) : "Risk engine has not run yet"
    },
    {
      key: "EVIDENCE_BINDING",
      label: "Bind evidence",
      detail: data ? `${evidenceCount} evidence records bound to claims` : "Evidence bundle pending"
    },
    {
      key: "EXPLAINING",
      label: "Explain findings",
      detail: data?.explanation?.explanation ? "Plain-language explanation generated" : data ? "Rule explanation available from evidence" : "Explanation pending"
    },
    {
      key: "SIMULATION_READY",
      label: "Prepare safe actions",
      detail: data ? `${getSimulationAvailability(data.assessment).label}; no transaction broadcast` : "Simulation prepared after scan"
    }
  ];

  return (
    <section className={`panel agent-timeline-panel ${spanAll ? "span-all" : ""} ${compact ? "compact-agent-timeline-panel" : ""}`} data-testid="agent-run-timeline">
      <div className="panel-head">
        <div>
          <h2>Scan progress</h2>
          <small>Human-readable steps behind the latest wallet assessment.</small>
        </div>
        <Badge value={data ? "Scan complete" : "Pending"} />
      </div>
      <div className="agent-timeline">
        {steps.map((step, index) => (
          <div className={`agent-step ${status}`} key={step.key}>
            <span className="agent-step-index">{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentProtocolCard({
  identity,
  providerStatus,
  onOpenAdvanced
}: {
  identity: AgentIdentity | null;
  providerStatus: ProviderStatus | null;
  onOpenAdvanced?: () => void;
}) {
  const registration = identity?.registration;
  const card = identity?.card;
  const chainId = providerStatus?.chain.chainId || registration?.chainId || card?.chain?.chainId || 5003;
  const toolCount = Array.isArray(card?.skills) ? card.skills.length : 0;
  return (
    <section className="panel span-all agent-protocol-card">
      <div className="panel-head">
        <div>
          <h2>Agent protocol</h2>
          <small>ERC-8004-compatible · MCP read-only tools · no wallet signing</small>
        </div>
        {onOpenAdvanced ? (
          <button className="secondary-control" onClick={onOpenAdvanced}>
            <Network size={15} />
            View agent trace
          </button>
        ) : null}
      </div>
      <div className="protocol-summary">
        <div>
          <small>Identity</small>
          <strong>{registration?.agentId || card?.name || "MantleLens Wallet Guard Agent"}</strong>
        </div>
        <div>
          <small>MCP tools</small>
          <strong>{toolCount ? `${toolCount} advertised skills` : "Read-only tools exposed"}</strong>
        </div>
        <div>
          <small>ERC-8004 / reputation</small>
          <strong>Compatible registration · local feedback in demo</strong>
        </div>
      </div>
    </section>
  );
}

function AssessmentHero({
  data,
  providerStatus,
  commitRecord
}: {
  data: ScanResponse;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
}) {
  const assessment = data.assessment;
  const viewModel = buildAssessmentViewModel({ scan: data, providerStatus, commitRecord });
  const heroLevel = viewModel.severity;
  const score = viewModel.scoreDisplay;
  const decisionAudit = getDecisionAudit(assessment, data);
  const evidenceBoundCount =
    data.evidenceBundle?.evidence?.length || new Set(viewModel.topSignals.flatMap((signal) => signal.evidenceIds)).size || viewModel.topSignals.length;
  const stripDecision = overviewAgentDecisionLabel(viewModel, decisionAudit.decisionLabel);
  const stripOutcome = overviewAgentOutcomeLabel(viewModel, commitRecord);
  return (
    <section className={`panel span-all assessment-hero ${severityClass(assessment.riskLevel)}`} data-testid="assessment-hero">
      <div className="hero-main">
        <div>
          <small>{viewModel.targetLabel}</small>
          <h2>{viewModel.headline}</h2>
          <p>{viewModel.subtitle}</p>
        </div>
        <div className="hero-score" aria-label={`${score.label}: ${score.value}`}>
          <small>{score.label}</small>
          <span>{score.value}</span>
          <strong>{heroLevel}</strong>
          <small>{score.overrideExplanation || score.helper}</small>
          {score.kind === "numeric" && score.severity === "high" && (
            <small className="score-floor-note">High severity is caused by evidence floor, not raw numeric score alone.</small>
          )}
        </div>
      </div>
      <div className="hero-metrics">
        <Metric label="Confidence" value={formatPercent(assessment.dataConfidence)} />
        <Metric
          label="Data coverage"
          value={viewModel.coverage.label}
          severity={assessment.dataStatus}
          compact
          helper={isDemoMode(assessment.dataMode) ? "Replay data, not a live chain scan." : undefined}
        />
        <Metric
          label="On-chain record"
          value={viewModel.proofLabel}
          severity={viewModel.proofLabel}
          compact
          helper={viewModel.proofHelper}
        />
        <Metric label="Next step" value={viewModel.nextStep} severity={assessment.riskLevel} compact />
      </div>
      <div className="agent-decision-strip" data-testid="agent-decision-strip">
        <span>
          <small>Decision</small>
          <strong>{stripDecision}</strong>
        </span>
        <span>
          <small>Evidence bound</small>
          <strong>{evidenceBoundCount} items</strong>
        </span>
        <span>
          <small>Allowed actions</small>
          <strong>inspect evidence, simulate if available, record assessment hash</strong>
        </span>
        <span>
          <small>Blocked actions</small>
          <strong>revoke, swap, transfer, auto-sign</strong>
        </span>
        <span>
          <small>Outcome</small>
          <strong>{stripOutcome}</strong>
        </span>
      </div>
    </section>
  );
}

function overviewAgentDecisionLabel(viewModel: AssessmentViewModel, fallback: string) {
  if (viewModel.topSignals.some((signal) => signal.key === "transfer")) return "Review transfer evidence";
  if (viewModel.topSignals.some((signal) => signal.key === "approval")) return "Review approval";
  if (viewModel.topSignals.some((signal) => signal.key === "yield")) return "Inspect yield evidence";
  if (viewModel.topSignals.some((signal) => signal.key === "coverage")) return "Check source coverage";
  return fallback || "Review evidence";
}

function overviewAgentOutcomeLabel(viewModel: AssessmentViewModel, commitRecord: CommitRecord | null) {
  if (viewModel.proofStatus === "verified_matched" || viewModel.proofStatus === "recorded_on_mantle" || commitRecord?.assessmentTx) {
    return "recorded on Mantle";
  }
  return "ready to verify";
}

type CoreSignal = {
  key: "approval" | "poisoning" | "yield" | "coverage";
  title: string;
  body: string;
  impact: string;
  confidence: string;
  evidenceText: string;
  primaryCta: string;
  risk: RiskItem;
};

type EvidenceAuditGroup = {
  signal: CoreSignal;
  risk: RiskItem;
  items: EvidenceItem[];
};

type HistoryRecord = NonNullable<WalletHistoryResponse["records"]>[number];

function SignalCardGrid({
  signals,
  evidence,
  onSelectRisk
}: {
  signals: CoreSignal[];
  evidence: EvidenceItem[];
  onSelectRisk: (risk: RiskItem) => void;
}) {
  if (!signals.length) return <SmallText>No top risks returned. Missing data is still treated as unknown, not safe.</SmallText>;
  return (
    <div className={["risk-card-grid", "signal-card-grid", signals.length === 1 ? "single-signal-grid" : ""].filter(Boolean).join(" ")}>
      {signals.map((signal) => {
        return (
          <article className={`risk-card signal-card signal-${signal.key} ${severityClass(signal.impact)}`} key={signal.key}>
            <div className="risk-card-head">
              <strong>{signal.title}</strong>
              <Badge value={signal.impact} />
            </div>
            <p>{signal.body}</p>
            <div className="signal-meta">
              <span>Impact: {signal.impact}</span>
              <span>Confidence: {signal.confidence}</span>
              <span>Evidence: {signal.evidenceText}</span>
            </div>
            <EvidenceSummaryPills ids={signal.risk.evidenceIds} evidence={evidence} />
            <div className="signal-actions">
              <button onClick={() => onSelectRisk(signal.risk)}>{signal.primaryCta}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EvidenceSummaryPills({ ids, evidence }: { ids: string[]; evidence: EvidenceItem[] }) {
  if (!ids.length) return null;
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]));
  return (
    <div className="chip-row evidence-pills" aria-label="Evidence">
      {ids.slice(0, 4).map((id) => {
        const item = evidenceById.get(id);
        return (
          <span className="mini-chip" key={id} title={id}>
            {item ? humanEvidenceLabel(item) : "Bound evidence"}
          </span>
        );
      })}
      {ids.length > 4 && <span className="mini-chip muted-chip">+{ids.length - 4}</span>}
    </div>
  );
}

function MonitorPreview({ history, trend }: { history: WalletHistoryResponse | null; trend: Trend | null }) {
  if (!trend) return <SmallText>No previous assessments for this wallet. Run another scan to build trend.</SmallText>;
  return (
    <div className="simulation-box">
      <strong>{trendSummaryText(trend, history)}</strong>
      <small>
        {assessmentRecordCountLabel(history?.recordCount ?? trend.pointCount)}
      </small>
      <small>
        {isDemoMode(history?.mode || trend.mode) ? "Reference trend is based on replayed data." : "Missing or degraded source coverage prevents overclaiming improvement."}
      </small>
    </div>
  );
}

function SimulationPanel({
  simulation,
  data
}: {
  simulation: SimulationResponse["simulation"];
  data: ScanResponse;
}) {
  const action = simulationActionLabel(simulation.simulationType);
  const reason = simulationEvidenceReason(simulation.simulationType, data);
  return (
    <div className="simulation-box">
      <strong>{action}</strong>
      <div className="score-diff">
        <span>{scoreDisplay(simulation.before.walletRiskScore)}</span>
        <span>{scoreDisplay(simulation.after.walletRiskScore)}</span>
      </div>
      <small>{reason}</small>
      <small>{scoreDeltaLabel(simulation.scoreDelta)} · Approval or exposure risk removed from the simulated model.</small>
      <small>No transaction was broadcast. This is simulation-only and review-only.</small>
      <small>Next step: review the evidence before any manual wallet action.</small>
    </div>
  );
}

function BenchmarkPanel({ walletHistory }: { walletHistory: WalletHistoryResponse | null }) {
  return (
    <div className="item-list">
      {walletHistory?.benchmarkRecords?.length ? (
        walletHistory.benchmarkRecords.slice(0, 4).map((record) => (
          <div className="item-row" key={`${record.assessmentId}-${record.status}`}>
            <span>
              <strong>{commitStatusLabel(record.status)} · {record.commitMode || "local"}</strong>
              <small>real execution allowed {String(record.realExecutionAllowed)}</small>
              <small className="raw-id">{shortRecordId(record.assessmentTx || record.unavailableReason || record.assessmentHash)}</small>
            </span>
            <Badge value={record.status} />
          </div>
        ))
      ) : (
        <SmallText>No benchmark record for this wallet yet.</SmallText>
      )}
    </div>
  );
}

function TracePanel({ data }: { data: ScanResponse }) {
  const summaries = tracePhaseSummaries(data.trace.events);
  return (
    <div className="trace-panel-body">
      {summaries.length ? (
        <>
          <div className="item-list trace-summary-list">
            {summaries.map((summary) => (
              <div className="item-row" key={summary.key}>
                <span>
                  <strong>{summary.label}</strong>
                  <small>{summary.detail}</small>
                </span>
                <Badge value={summary.status} />
              </div>
            ))}
          </div>
          <details className="raw-details trace-raw-details">
            <summary>Raw developer trace ({data.trace.events.length} events)</summary>
            <div className="item-list">
              {data.trace.events.map((event, index) => (
                <div className="item-row compact-row" key={`${event.eventType}-${index}`}>
                  <span>
                    <strong>{traceEventTitle(event)}</strong>
                    <small>{userFacingCopy(humanizeIdentifier(event.eventType))} · {userFacingCopy(event.policyDecision || "allow")}</small>
                    <details className="raw-details">
                      <summary>Raw event fields</summary>
                      <code>{event.eventType} · {event.policyDecision || "allow"}</code>
                    </details>
                  </span>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <SmallText>No trace loaded.</SmallText>
      )}
    </div>
  );
}

function InventoryList({ data }: { data: ScanResponse }) {
  const assessment = data.assessment;
  return (
    <div className="item-list">
      {data.inventory?.tokens?.length ? (
        data.inventory.tokens.slice(0, 8).map((token) => (
          <div className="item-row" key={token.tokenAddress}>
            <span>
              <strong>{getMantleTokenLabel(token.symbol, token.tokenAddress)}</strong>
              <small>{formatAmount(token.balance)} · {inventorySourceLabel(token)}</small>
              {isDemoMantleYieldLikeToken(token.symbol, token.tokenAddress) && <small>{getMantleTokenLimitation(token.symbol, token.tokenAddress)}</small>}
              <small>{inventoryPriceLabel(token)}</small>
            </span>
            <Badge value={inventoryBadgeLabel(token)} />
          </div>
        ))
      ) : (
        <SmallText>
          {assessment.dataMode === "live"
            ? "No inventory returned from configured source. Unknown, not safe."
            : "No inventory returned for this reference replay mode."}
        </SmallText>
      )}
    </div>
  );
}

function SummaryView({
  data,
  simulation,
  providerStatus,
  commitRecord,
  onSimulateApproval,
  onSimulatePortfolio,
  onViewProof,
  onSelectRisk
}: {
  data: ScanResponse | null;
  simulation: SimulationResponse["simulation"] | null;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
  onSimulateApproval: () => void;
  onSimulatePortfolio: () => void;
  onViewProof: () => void;
  onSelectRisk: (risk: RiskItem) => void;
}) {
  if (!data) return <PreScanSummary />;
  const viewModel = buildAssessmentViewModel({ scan: data, providerStatus, commitRecord });
  const signalCards = buildCoreSignals(data);
  const simulationAction = canSimulateApproval(data) ? onSimulateApproval : canSimulatePortfolio(data) ? onSimulatePortfolio : null;
  const simulationAvailability = getSimulationAvailability(data.assessment);
  return (
    <div className="view-grid summary-grid">
      <AssessmentHero data={data} providerStatus={providerStatus} commitRecord={commitRecord} />

      <section className="panel span-all signal-section">
        <div className="panel-head signal-head">
          <div>
            <h2>{signalSectionTitle(data, signalCards.length)}</h2>
            <small>{signalSectionSubtitle(data, signalCards.length)}</small>
          </div>
        </div>
        <SignalCardGrid
          signals={signalCards}
          evidence={data.evidenceBundle.evidence}
          onSelectRisk={onSelectRisk}
        />
      </section>

      <section className="panel span-all demo-loop-panel">
        <div className="demo-loop-copy">
          <small>Review workflow</small>
          <strong>{reviewWorkflowTitle(data, commitRecord, viewModel)}</strong>
          <span>No revoke, swap, transfer, or wallet signing happens unless a user explicitly confirms a separate on-chain proof action.</span>
        </div>
        <div className="demo-loop-actions">
          <button onClick={() => signalCards[0]?.risk && onSelectRisk(signalCards[0].risk)}>
            <Eye size={16} />
            Inspect evidence
          </button>
          <button onClick={() => simulationAction?.()} disabled={!simulationAction}>
            <Play size={16} />
            {simulationAction ? simulationAvailability.label : "Simulation unavailable"}
          </button>
          <button data-testid="overview-view-proof" onClick={onViewProof}>
            <Eye size={16} />
            {proofViewLabel(data, commitRecord, viewModel)}
          </button>
        </div>
        {!simulationAction && (
          <SmallText>{simulationAvailability.reason}</SmallText>
        )}
      </section>

      {simulation ? (
        <section className="panel span-all subtle-result">
          <div className="panel-head">
            <h2>Simulation result</h2>
            <Play size={16} />
          </div>
          <SimulationPanel simulation={simulation} data={data} />
        </section>
      ) : null}

      <MantleNativeSignalsPanel data={data} providerStatus={providerStatus} />
      <DataCompletenessBanner data={data} />
    </div>
  );
}

function MantleNativeSignalsPanel({ data, providerStatus }: { data: ScanResponse; providerStatus: ProviderStatus | null }) {
  const target = providerStatus?.chainTargets?.find((item) => item.id === "mantle-sepolia");
  const mainnet = providerStatus?.chainTargets?.find((item) => item.id === "mantle-mainnet");
  const demoToken = findDemoMantleYieldToken(data);
  const assessmentLogger = providerStatus?.assessmentLogger?.contractAddress;
  return (
    <section className="panel span-all mantle-native-panel" data-testid="mantle-native-signals">
      <div className="panel-head">
        <div>
          <h2>Mantle-native signals</h2>
          <small>Mantle-first EVM risk engine with Mantle Sepolia proof and known-token context.</small>
        </div>
        <Badge value={getMantleProofNetworkLabel(data.assessment.chainId)} />
      </div>
      <div className="mantle-native-grid">
        <div>
          <small>Scan target</small>
          <strong>{target?.label || "Mantle Sepolia · Testnet · 5003"}</strong>
          <span>Read-only scan adapter for approval, transfer, balance, evidence bundle, and source coverage.</span>
        </div>
        <div>
          <small>Production target</small>
          <strong>{mainnet?.enabled ? "Mantle Mainnet · 5000" : "Mantle Mainnet · 5000 · Coming soon"}</strong>
          <span>Production target is visible, but not overstated as fully supported unless the adapter is enabled.</span>
        </div>
        <div>
          <small>Known-token allowlist</small>
          <strong>{demoToken ? getMantleTokenLabel(demoToken.symbol, demoToken.tokenAddress) : "Mantle known-token allowlist"}</strong>
          <span>{demoToken ? getMantleTokenLimitation(demoToken.symbol, demoToken.tokenAddress) : "Unknown protocol labels remain unknown, not safe."}</span>
        </div>
        <div>
          <small>Assessment proof</small>
          <strong>{getMantleProofSourceLabel(data.assessment.chainId)}</strong>
          <span>{assessmentLogger ? `Contract ${shortAddress(assessmentLogger)} · Mantle explorer links enabled.` : "AssessmentLogger contract unavailable for this target."}</span>
        </div>
      </div>
      <div className="mantle-native-proof-line">
        Mantle Sepolia proof + MLDT Sepolia test token + chainId 5003 + AssessmentLogger.
      </div>
    </section>
  );
}

function PreScanSummary() {
  return (
    <div className="view-grid summary-grid pre-scan-summary">
      <section className="panel span-all prescan-empty-panel" data-testid="assessment-hero">
        <div>
          <h2>No wallet scanned yet.</h2>
          <p>Run a demo scenario or live read-only scan to generate approval, transfer, yield, and source-coverage risk signals.</p>
        </div>
        <div className="prescan-empty-strip" aria-label="What the scan checks">
          <span>Approval anomalies</span>
          <span>Suspicious transfers</span>
          <span>Mantle yield exposure</span>
          <span>Evidence bundle</span>
        </div>
      </section>
    </div>
  );
}

function AdvancedView({
  data,
  simulation,
  walletHistory,
  enhancements,
  manualRevokeTx,
  walletAction,
  agentIdentity,
  providerStatus,
  commitRecord,
  benchmarkResults,
  onRunBenchmarkSuite,
  onManualRevoke,
  onConnectWallet,
  onWalletRevoke
}: {
  data: ScanResponse | null;
  simulation: SimulationResponse["simulation"] | null;
  walletHistory: WalletHistoryResponse | null;
  enhancements: EnhancementsResponse | null;
  manualRevokeTx: string | null;
  walletAction: WalletActionState;
  agentIdentity: AgentIdentity | null;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
  benchmarkResults: Record<string, BenchmarkCaseResult>;
  onRunBenchmarkSuite: () => void;
  onManualRevoke: (txRequest: NonNullable<EnhancementModule["txRequest"]>) => void;
  onConnectWallet: () => Promise<string | null>;
  onWalletRevoke: (txRequest: NonNullable<EnhancementModule["txRequest"]>) => void;
}) {
  if (!data) return <EmptyState title="Run a scan before opening advanced diagnostics." />;
  const assessment = data.assessment;
  const viewModel = buildAssessmentViewModel({ scan: data, providerStatus, commitRecord });
  return (
    <div className="view-grid">
      <section className="panel">
        <div className="panel-head">
          <h2>Advanced score internals</h2>
          <ListChecks size={16} />
        </div>
        <ScoreBreakdownPanel data={data} advanced />
      </section>

      <DecisionAuditDetails data={data} />

      <CanonicalStatePanel viewModel={viewModel} />

      <AgentRunTimeline data={data} spanAll={false} compact />

      <AgentProtocolCard identity={agentIdentity} providerStatus={providerStatus} />

      <section className="panel">
        <div className="panel-head">
          <h2>Replay proof records</h2>
          <ListChecks size={16} />
        </div>
        <BenchmarkPanel walletHistory={walletHistory} />
      </section>

      <BenchmarkCaseMatrix history={walletHistory} results={benchmarkResults} onRunSuite={onRunBenchmarkSuite} />

      <section className="panel">
        <div className="panel-head">
          <h2>Portfolio exposure</h2>
          <Activity size={16} />
        </div>
        <PortfolioPanel data={data} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>RWA / yield risk</h2>
          <FileWarning size={16} />
        </div>
        <RiskTypePanel risks={assessment.topRisks.filter((risk) => risk.type === "rwa_yield" || risk.type === "defi")} empty="No RWA/yield or DeFi risk returned." />
      </section>

      <section className="panel span-all">
        <div className="panel-head">
          <h2>P1 enhancement modules</h2>
          <Network size={16} />
        </div>
        <EnhancementPanel
          enhancements={enhancements}
          liveMode={assessment.dataMode === "live"}
          manualRevokeTx={manualRevokeTx}
          walletAction={walletAction}
          onManualRevoke={onManualRevoke}
          onConnectWallet={onConnectWallet}
          onWalletRevoke={onWalletRevoke}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Agent identity / ERC-8004 / MCP</h2>
          <Bot size={16} />
        </div>
        <AgentIdentityPanel identity={agentIdentity} providerStatus={providerStatus} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>LLM explanation</h2>
        </div>
        <pre>{advancedExplanationText(data)}</pre>
      </section>

      <section className="panel span-all" id="agent-trace-section" data-testid="agent-trace-section">
        <div className="panel-head">
          <h2>Trace</h2>
        </div>
        <TracePanel data={data} />
      </section>

      <IntegrationLayerPanel />
    </div>
  );
}

function CanonicalStatePanel({ viewModel }: { viewModel: AssessmentViewModel }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Canonical assessment state</h2>
        <ListChecks size={16} />
      </div>
      <div className="record-detail-grid">
        <MonitorField label="Evidence class" value={canonicalStateLabel(viewModel.evidenceClass)} />
        <MonitorField label="Score display" value={viewModel.scoreDisplay.value} />
        <MonitorField label="Record status" value={canonicalStateLabel(viewModel.recordStatus)} />
        <MonitorField label="Proof status" value={canonicalStateLabel(viewModel.proofStatus)} />
        <MonitorField label="History scope" value={canonicalStateLabel(viewModel.historyScope)} />
        <MonitorField label="Next step" value={viewModel.nextStep} />
      </div>
      <details className="raw-details">
        <summary>Raw developer trace</summary>
        <code>
          {viewModel.evidenceClass} · {viewModel.recordStatus} · {viewModel.proofStatus} · {viewModel.historyScope}
        </code>
      </details>
      <SmallText>{viewModel.proofHelper}</SmallText>
    </section>
  );
}

function IntegrationLayerPanel() {
  const useCases = [
    {
      title: "Wallets",
      copy:
        "Wallets can call MantleLens before a user signs or interacts, to surface approval, transfer, coverage, and Mantle-native yield exposure signals."
    },
    {
      title: "DeFi protocols",
      copy:
        "Protocols can use MantleLens as a pre-interaction wallet risk check before users enter pools, approve spenders, or interact with yield assets."
    },
    {
      title: "Agents / MCP",
      copy:
        "Other agents can call MantleLens through MCP-style tools to request an evidence-bound wallet risk assessment before taking action."
    }
  ];
  return (
    <section className="panel span-all integration-layer-panel" data-testid="integration-layer-panel">
      <div className="panel-head">
        <div>
          <h2>Integration layer</h2>
          <small>MantleLens can be used by wallets, DeFi protocols, and agents as a pre-action risk assessment layer.</small>
        </div>
        <Badge value="Mantle-first" />
      </div>
      <div className="integration-layer-grid">
        {useCases.map((useCase) => (
          <article key={useCase.title} className="integration-layer-card">
            <strong>{useCase.title}</strong>
            <p>{useCase.copy}</p>
          </article>
        ))}
      </div>
      <div className="integration-layer-note">
        <strong>Mantle-first EVM risk intelligence layer</strong>
        <span>Adapter-ready architecture, optimized for Mantle wallets, with assessment hash recorded on Mantle when manually confirmed.</span>
      </div>
    </section>
  );
}

function EvidenceView({
  evidence,
  selectedIds,
  data,
  simulation,
  commitRecord,
  onBackOverview,
  onSimulateApproval,
  onSimulatePortfolio,
  onViewProof,
  onViewDecisionDetails
}: {
  evidence: EvidenceItem[];
  selectedIds: string[];
  data: ScanResponse | null;
  simulation: SimulationResponse["simulation"] | null;
  commitRecord: CommitRecord | null;
  onBackOverview: () => void;
  onSimulateApproval: () => void;
  onSimulatePortfolio: () => void;
  onViewProof: () => void;
  onViewDecisionDetails: () => void;
}) {
  if (!data) return <EmptyState title="Run a scan to inspect evidence." />;
  const viewModel = buildAssessmentViewModel({ scan: data, commitRecord });
  const selected = new Set(selectedIds);
  const groups = buildEvidenceAuditGroups(data);
  const simulationAction = canSimulateApproval(data) ? onSimulateApproval : canSimulatePortfolio(data) ? onSimulatePortfolio : null;
  const simulationAvailability = getSimulationAvailability(data.assessment);
  return (
    <div className="view-grid evidence-audit-grid">
      <EvidenceBundleSummary data={data} viewModel={viewModel} signalCount={groups.length} commitRecord={commitRecord} onViewProof={onViewProof} />

      <section className="panel span-all">
        <div className="panel-head">
          <div>
            <h2>Risk evidence</h2>
            <small>Risk summaries stay readable first. Technical fields are available inside each detail panel.</small>
          </div>
        </div>
        <div className="evidence-risk-list">
          {groups.length ? (
            groups.map((group) => (
              <RiskEvidenceGroup
                key={group.signal.key}
                group={group}
                selectedIds={selected}
                data={data}
              />
            ))
          ) : (
            <SmallText>No evidence-bound risk signals returned for this scan.</SmallText>
          )}
        </div>
      </section>

      <DecisionAuditSummaryCard data={data} onViewDetails={onViewDecisionDetails} />

      <section className="panel span-all evidence-workflow-panel">
        <div className="demo-loop-copy">
          <small>Next actions</small>
          <strong>{evidenceNextActionTitle(data, commitRecord)}</strong>
        </div>
        <div className="demo-loop-actions">
          <button onClick={onBackOverview}>
            <Database size={16} />
            Back to overview
          </button>
          <button onClick={() => simulationAction?.()} disabled={!simulationAction}>
            <Play size={16} />
            {simulationAction ? simulationAvailability.label : "Simulation unavailable"}
          </button>
          <button data-testid="evidence-record-assessment" onClick={onViewProof}>
            <ShieldCheck size={16} />
            {recordAssessmentCtaLabel(data, commitRecord, viewModel)}
          </button>
        </div>
        {simulation ? (
          <div className="evidence-simulation-result" data-testid="evidence-simulation-result">
            <small>Simulation result</small>
            <SimulationPanel simulation={simulation} data={data} />
          </div>
        ) : !simulationAction ? (
          <SmallText>{simulationAvailability.reason}</SmallText>
        ) : null}
      </section>

      <details className="panel span-all supporting-records-panel">
        <summary className="supporting-records-summary">
          <div>
            <h2>Supporting records</h2>
            <small>{supportingRecordCount(data)} raw records behind this evidence bundle. These are supporting context, not the main decision surface.</small>
          </div>
          <span>Expand supporting records</span>
        </summary>
        <div className="wallet-activity-grid supporting-records-grid">
          <section className="panel wallet-activity-panel compact-supporting-panel">
            <div className="panel-head">
              <h2>Inventory / Portfolio</h2>
            </div>
            <InventoryList data={data} />
          </section>

          <div className="wallet-activity-stack">
            <section className="panel wallet-activity-panel compact-supporting-panel">
              <div className="panel-head">
                <h2>Approvals</h2>
              </div>
              <HistoryList items={data.history?.approvalHistory?.items || []} type="approval" dataMode={data.assessment.dataMode} />
            </section>

            <section className="panel wallet-activity-panel compact-supporting-panel">
              <div className="panel-head">
                <h2>Transfers</h2>
              </div>
              <HistoryList items={data.history?.transferHistory?.items || []} type="transfer" dataMode={data.assessment.dataMode} />
            </section>
          </div>
        </div>
      </details>
    </div>
  );
}

function DecisionAuditSummaryCard({ data, onViewDetails }: { data: ScanResponse; onViewDetails: () => void }) {
  const audit = getDecisionAudit(data.assessment, data);
  const simulation = getSimulationAvailability(data.assessment);
  return (
    <section className="panel span-all decision-audit-panel" data-testid="decision-audit-card">
      <div className="panel-head">
        <div>
          <h2>Decision Audit</h2>
          <small>Evidence and hard rules decide the safe workflow before LLM explanation.</small>
        </div>
        <Badge value={audit.decisionLabel} />
      </div>
      <div className="decision-audit-body">
        <div className="decision-audit-summary">
          <div>
            <small>Decision</small>
            <strong>{audit.decisionLabel}</strong>
          </div>
          <div>
            <small>Action</small>
            <strong>{audit.actionLabel}</strong>
          </div>
          <div>
            <small>Simulation</small>
            <strong>{simulation.available ? simulation.label : "Unavailable"}</strong>
          </div>
        </div>
        {!simulation.available && <p className="decision-audit-note">Reason: {simulation.reason}</p>}
        <div className="decision-audit-reasons">
          <small>Why this decision</small>
          <ul>
            {audit.why.slice(0, 4).map((reason) => (
              <li key={reason.label}>{reason.label}</li>
            ))}
          </ul>
        </div>
        <div className="decision-audit-boundary">
          <strong>Safety boundary</strong>
          <span>{audit.llmBoundary}</span>
        </div>
        <button className="secondary-control" data-testid="view-decision-details" onClick={onViewDetails}>
          <ListChecks size={15} />
          View decision details
        </button>
      </div>
    </section>
  );
}

function DecisionAuditDetails({ data }: { data: ScanResponse }) {
  const audit = getDecisionAudit(data.assessment, data);
  const simulation = getSimulationAvailability(data.assessment);
  const evidenceRefs = decisionAuditEvidenceRefs(data, audit);
  const triggeredRules = audit.hardRules.filter((rule) => rule.triggered);
  return (
    <section className="panel span-all decision-audit-details" data-testid="advanced-decision-audit">
      <div className="panel-head">
        <div>
          <h2>Decision audit</h2>
          <small>Full rule, evidence, and boundary detail. Review-only; no wallet execution path is exposed.</small>
        </div>
        <ListChecks size={16} />
      </div>
      <div className="decision-audit-advanced-grid">
        <div className="decision-code-row">
          <small>Decision</small>
          <strong>{audit.decisionLabel}</strong>
        </div>
        <div className="decision-code-row">
          <small>Action</small>
          <strong>{audit.actionLabel}</strong>
        </div>
        <div className="decision-code-row">
          <small>Simulation</small>
          <strong>{simulation.available ? simulation.label : "Unavailable"}</strong>
          <span>{simulation.reason}</span>
        </div>
      </div>
      <div className="decision-audit-section">
        <small>Supporting evidence</small>
        <div className="chip-row">
          {evidenceRefs.length ? (
            evidenceRefs.map((item) => (
              <span className="mini-chip" key={item.id}>
                {item.label}
              </span>
            ))
          ) : (
            <span className="mini-chip">No direct evidence reference bound</span>
          )}
        </div>
      </div>
      <div className="decision-audit-columns">
        <DecisionAuditList
          title="Triggered hard rules"
          items={triggeredRules.map((rule) => `${rule.label}: ${rule.description}`)}
        />
        <DecisionAuditList
          title="Blocked actions"
          items={audit.blockedActions.map((action) => `${action.label}: ${action.reason}`)}
        />
        <DecisionAuditList
          title="Allowed actions"
          items={audit.allowedActions.map((action) => `${action.label}: ${action.reason}`)}
        />
      </div>
      <div className="decision-audit-boundary full">
        <strong>LLM boundary</strong>
        <span>{audit.llmBoundary}</span>
      </div>
      <details className="raw-details">
        <summary>Raw developer trace</summary>
        <code>
          {audit.decisionType} · {audit.actionType} · {triggeredRules.map((rule) => rule.id).join(", ") || "no triggered rule ids"} · {evidenceRefs.map((item) => `${item.id}/${item.hash}`).join(", ") || "no evidence refs"}
        </code>
      </details>
    </section>
  );
}

function DecisionAuditList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="decision-audit-list">
      <small>{title}</small>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function decisionAuditEvidenceRefs(data: ScanResponse, audit: DecisionAudit) {
  const ids = new Set(audit.why.flatMap((reason) => reason.evidenceIds || []));
  return data.evidenceBundle.evidence
    .filter((item) => ids.has(item.evidenceId))
    .slice(0, 8)
    .map((item) => ({
      id: item.evidenceId,
      hash: shortRecordId(evidenceHash(item)),
      label: evidenceTypeLabel(item.type)
    }));
}

function EvidenceBundleSummary({
  data,
  viewModel,
  signalCount,
  commitRecord,
  onViewProof
}: {
  data: ScanResponse;
  viewModel: AssessmentViewModel;
  signalCount: number;
  commitRecord: CommitRecord | null;
  onViewProof: () => void;
}) {
  const counts = sourceStatusCounts(data.coverage.sourceAvailability);
  const evidenceCount = data.evidenceBundle.evidenceCount || data.evidenceBundle.evidence.length;
  const lastScan =
    data.assessmentHistoryRecord?.scanTimestamp ||
    data.assessment.timestamp ||
    data.trace.events.find((event) => event.message)?.message ||
    "Current scan";
  return (
    <section className="panel span-all evidence-bundle-summary">
      <div className="evidence-bundle-compact">
        <div className="evidence-bundle-copy">
          <div>
            <h2>Evidence bundle</h2>
            <p>{evidenceCount} evidence item{evidenceCount === 1 ? "" : "s"} supporting {signalCount} risk signal{signalCount === 1 ? "" : "s"}.</p>
          </div>
          <div className="evidence-bundle-meta">
            <span>Coverage: <strong>{viewModel.coverage.label}</strong></span>
            <span>Mode: <strong>{evidenceModeSummary(data)}</strong></span>
            <span>Proof: <strong>{viewModel.proofLabel}</strong></span>
            <span>Proof contract: <strong>{getMantleProofSourceLabel(data.assessment.chainId)}</strong></span>
            <span>Last scan: <strong>{formatScanTimestamp(lastScan)}</strong></span>
            <span>Source coverage: <strong>{counts.available} available · {counts.partial} partial · {counts.unavailable} unavailable</strong></span>
          </div>
        </div>
        <div className="evidence-bundle-proof">
          <small>Bundle hash</small>
          <code>{shortRecordId(data.evidenceBundle.evidenceBundleHash)}</code>
          <InlineProofAction testId="evidence-view-proof" onClick={onViewProof} label={proofViewLabel(data, commitRecord, viewModel)} />
          <small>{viewModel.proofHelper}</small>
        </div>
      </div>
    </section>
  );
}

function EvidenceStat({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="evidence-stat">
      <small>{label}</small>
      <strong>{value}</strong>
      {action}
    </div>
  );
}

function RiskEvidenceGroup({
  group,
  selectedIds,
  data
}: {
  group: EvidenceAuditGroup;
  selectedIds: Set<string>;
  data: ScanResponse;
}) {
  const { signal, risk, items } = group;
  const displaySeverity = signal.impact || risk.severity;
  return (
    <article className={`evidence-risk-card signal-${signal.key} ${severityClass(displaySeverity)}`}>
      <div className="risk-audit-head">
        <div>
          <h3>{signal.title}</h3>
          <p><strong>Claim:</strong> {risk.claimText || signal.body}</p>
        </div>
        <Badge value={displaySeverity} />
      </div>
      <div className="risk-audit-summary">
        <div>
          <small>Confidence</small>
          <strong>{confidenceText(risk, signal.confidence)}</strong>
        </div>
        <div>
          <small>Data coverage</small>
          <strong>{riskDataQuality(data, risk)}</strong>
        </div>
        <div>
          <small>Unknown fields</small>
          <strong>{unknownFieldsLabel(risk)}</strong>
        </div>
        <div>
          <small>Supported evidence</small>
          <strong>{items.length} item{items.length === 1 ? "" : "s"}</strong>
        </div>
      </div>
      <EvidenceSummaryPills ids={items.map((item) => item.evidenceId)} evidence={items} />
      <details className="evidence-group-details">
        <summary>View {items.length} evidence item{items.length === 1 ? "" : "s"}</summary>
        <div className="risk-audit-copy">
          <p>{plainRiskExplanation(risk)}</p>
          <small><strong>Limitation:</strong> {riskLimitation(risk)}</small>
        </div>
        <div className="evidence-card-list">
          {items.length ? (
            items.map((item) => (
              <EvidenceAuditCard
                key={item.evidenceId}
                item={item}
                risk={risk}
                selected={selectedIds.has(item.evidenceId)}
                data={data}
              />
            ))
          ) : (
            <SmallText>This risk has no resolved evidence item. This should fail QA before release.</SmallText>
          )}
        </div>
      </details>
    </article>
  );
}

function EvidenceAuditCard({
  item,
  risk,
  selected,
  data
}: {
  item: EvidenceItem;
  risk: RiskItem;
  selected: boolean;
  data: ScanResponse;
}) {
  const approval = findApprovalDetail(data, item.evidenceId);
  const transfer = findTransferDetail(data, item.evidenceId);
  const inventory = findInventoryDetail(data, item.evidenceId);
  const timestamp = evidenceTimestamp(item, approval || transfer);
  const transactionFact = evidenceTransactionFact(data, item, approval, transfer);
  return (
    <article className={selected ? "evidence-card selected" : "evidence-card"}>
      <div className="evidence-card-head">
        <div>
          <strong>{humanEvidenceLabel(item)}</strong>
          <small>{evidenceVerificationSummary(item, approval, transfer, inventory)}</small>
        </div>
        <Badge value={evidenceTypeLabel(item.type)} />
      </div>

      <div className="evidence-card-summary">
        <EvidenceFact label="Verification" value={evidenceVerificationLabel(item, approval, transfer, inventory)} />
        <EvidenceFact label="Data quality" value={evidenceDataQuality(data, item)} />
        <EvidenceFact label="Confidence" value={confidenceText(risk, "Evidence-bound")} />
      </div>

      <details className="evidence-item-details">
        <summary>Show technical fields</summary>
        <div className="evidence-fact-grid">
          <EvidenceFact label="Source" value={sourceDisplayName(item.source)} />
          <EvidenceFact label="Evidence mode" value={evidenceSourceMode(data, item)} />
          <EvidenceFact label="Method" value={evidenceMethod(item)} />
          <EvidenceFact label="Confidence" value={confidenceText(risk, "Evidence-bound")} />
        <EvidenceFact label="Verification" value={evidenceVerificationLabel(item, approval, transfer, inventory)} />
        <EvidenceFact label="Data quality" value={evidenceDataQuality(data, item)} />
        {transactionFact && !isTransferEvidence(item, transfer) ? <EvidenceFact label={transactionFact.label} value={transactionFact.value} /> : null}
        {timestamp ? <EvidenceFact label="Timestamp / block" value={timestamp} /> : null}
        <EvidenceFact label="Evidence hash" value={shortRecordId(evidenceHash(item))} />
        <EvidenceFact label="Limitation" value={evidenceLimitation(item, risk)} wide />
        </div>

        {isApprovalEvidence(item, approval) ? (
          <ApprovalEvidenceFacts item={item} approval={approval} inventory={inventory} data={data} />
        ) : null}
        {isTransferEvidence(item, transfer) ? <TransferEvidenceFacts item={item} transfer={transfer} data={data} /> : null}

        <details className="raw-evidence-details">
          <summary>View raw evidence</summary>
          <div className="raw-evidence-meta">
            <span>Evidence ID: {item.evidenceId}</span>
            <span>Risk ID: {risk.riskId || risk.risk_id}</span>
          </div>
          <pre>{JSON.stringify({ evidence: item, approval, transfer, inventory }, null, 2)}</pre>
        </details>
      </details>
    </article>
  );
}

function ApprovalEvidenceFacts({
  item,
  approval,
  inventory,
  data
}: {
  item: EvidenceItem;
  approval?: ApprovalItem;
  inventory?: TokenItem;
  data: ScanResponse;
}) {
  return (
    <div className="special-evidence-box">
      <strong>Approval allowance check</strong>
      <div className="evidence-fact-grid compact">
        <EvidenceFact label="Active allowance confirmed" value={approvalConfirmedLabel(item, approval)} />
        <EvidenceFact label="Method" value="ERC20.allowance(owner, spender)" />
        <EvidenceFact label="Allowance" value={approval?.isUnlimited || item.claimText.toLowerCase().includes("unlimited") ? "Unlimited" : "Limited"} />
        <EvidenceFact label="Spender label" value={approval?.spender ? "Unknown" : "Unknown"} />
        <EvidenceFact label="USD at risk" value={approvalUsdAtRisk(data, inventory)} />
        <EvidenceFact label="Limitation" value="known-token scan / bounded logs" wide />
      </div>
    </div>
  );
}

function TransferEvidenceFacts({ item, transfer, data }: { item: EvidenceItem; transfer?: TransferItem; data: ScanResponse }) {
  const isLive = data.assessment.dataMode === "live";
  const hasReference = Boolean(item.txHash || transfer?.txHash);
  return (
    <div className="special-evidence-box">
      <strong>Transfer pattern check</strong>
      <div className="evidence-fact-grid compact">
        <EvidenceFact
          label={isLive ? "Tx hash" : "Replay reference"}
          value={fixtureAwareTxLabel(data, item.txHash || transfer?.txHash)}
        />
        <EvidenceFact label="Counterparty" value={shortAddress(String(transfer?.counterparty || "Not available"))} />
        <EvidenceFact label="Amount" value={String(transfer?.amount || "Dust amount")} />
        <EvidenceFact label="Pattern" value={transferPatternLabel(transfer)} />
        <EvidenceFact label="Timestamp / block" value={evidenceTimestamp(item, transfer) || "Not available"} />
        <EvidenceFact label="Verification" value={hasReference ? (isLive ? "Transaction hash present" : "Replay transfer reference present") : "Transfer reference unavailable"} />
        <EvidenceFact label="Data quality" value={isLive ? evidenceDataQuality(data, item) : `Replay fixture / ${coverageDisplayLabel(data.assessment.dataStatus, data.assessment.dataMode)}`} />
      </div>
    </div>
  );
}

function EvidenceFact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "evidence-fact wide" : "evidence-fact"}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreBreakdownPanel({ data, advanced = false }: { data: ScanResponse; advanced?: boolean }) {
  const breakdown = data.assessment.scoreBreakdown;
  const displayRiskLevel = assessmentDisplayRiskLevel(data);
  const scoreCopy = getScoreDisplay(data.assessment);
  const rawMetrics = (breakdown?.metricContributions || data.assessment.metricResults || []).map((metric) => ({
    metricId: String(metric.metricId),
    label: String("label" in metric ? metric.label : metric.metricId),
    score: metric.score,
    weight: metric.weight,
    weightedContribution: metric.weightedContribution,
    severity: String("severity" in metric ? metric.severity : metric.score >= 60 ? "High" : metric.score >= 25 ? "Moderate" : "Low")
  }));
  const metrics = scoreBreakdownDisplayMetrics(rawMetrics);
  if (!breakdown && !metrics.length) {
    return <SmallText>No score breakdown returned.</SmallText>;
  }
  return (
    <div className="item-list">
      <div className="item-row">
        <span>
          <strong>{scoreCopy.value} · {displayRiskLevel}</strong>
          <small>Score weighted by risk evidence · confidence {formatPercent(breakdown?.dataConfidence ?? data.assessment.dataConfidence)}</small>
          <small>Formula: weighted score = sum(metric score x weight). Evidence confidence and red-flag overrides shape the final level.</small>
          <small>{scoreCopy.showNumeric ? `Metric sum: ${scoreDisplay(breakdown?.weightedMetricSum ?? data.assessment.walletRiskScore)}.` : scoreCopy.helper}</small>
          {advanced && (
            <details className="raw-details">
              <summary>Raw developer trace</summary>
              <code>{breakdown?.method || "metric result sum"}</code>
            </details>
          )}
        </span>
        <Badge value={monitorStatusLabel(data.assessment.dataStatus)} />
      </div>
      {metrics.slice(0, 6).map((metric) => (
        <div className="item-row" key={metric.metricId}>
          <span>
            <strong>{metric.displayLabel}</strong>
            <small>
              Contribution {formatSigned(metric.weightedContribution)} · score {roundedScore(metric.score)} · weight {Number(metric.weight.toFixed(2))}
            </small>
            {metric.metricIds.length > 1 && <small>Merged metrics: {metric.metricIds.map((id) => scoreMetricDetailLabel(id)).join(" + ")}</small>}
            <details className="raw-details">
              <summary>Scoring detail</summary>
              <code>
                {metric.metricIds.join(", ")} · score {metric.score} · combined weight {Number(metric.weight.toFixed(2))}
              </code>
            </details>
          </span>
          <Badge value={metric.severity} />
        </div>
      ))}
      {breakdown?.redFlagOverrides?.length ? (
        <SmallText>Red flag override applied: {breakdown.redFlagOverrides.map((item) => userFacingCopy(humanizeIdentifier(String(item.rule)))).join(", ")}.</SmallText>
      ) : (
        <SmallText>No red-flag override applied for this scan.</SmallText>
      )}
    </div>
  );
}

function DataCompletenessBanner({ data }: { data: ScanResponse }) {
  const groups = getSourceStatusGroups(data.coverage.sourceAvailability || {}, data);
  const copy = getCoverageWarningCopy(data);
  return (
    <section className="panel span-all data-banner" data-testid="data-completeness-banner">
      <div className="coverage-warning-copy">
        <strong>{copy.title}</strong>
        <small><b>{copy.statusHeadline}:</b> {copy.body}</small>
        <small><b>What happened:</b> {copy.whatHappened}</small>
        <small><b>Why coverage matters:</b> {copy.hiddenRisk}</small>
        <small><b>Unknown fields:</b> {copy.unknownFields.join(", ")}</small>
        <small><b>Why it matters:</b> {copy.whyItMatters}</small>
        <small><b>Recommended action:</b> {copy.recommendedAction}</small>
      </div>
      <SourceStatusGroupsView groups={groups} />
    </section>
  );
}

type SourceGroupItem = ReturnType<typeof getSourceStatusGroups>[keyof ReturnType<typeof getSourceStatusGroups>][number];

function SourceStatusGroupsView({ groups }: { groups: ReturnType<typeof getSourceStatusGroups> }) {
  return (
    <div className="source-status-groups" aria-label="Grouped source availability">
      <SourceStatusGroup label="Available" items={groups.available} tone="ok" />
      <SourceStatusGroup label="Partial" items={groups.partial} tone="warn" />
      <SourceStatusGroup label="Unavailable" items={groups.unavailable} tone="danger" />
    </div>
  );
}

function SourceStatusGroup({ label, items, tone }: { label: string; items: SourceGroupItem[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div className={`source-status-group ${tone}`}>
      <small>{label}</small>
      <div className="source-capability-list">
        {items.map((item) => (
          <span className={`source-chip ${tone}`} key={`${label}-${item.label}`} title={item.reason || undefined}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OnchainRecordPanel({
  data,
  providerStatus,
  commitRecord,
  commitVerification,
  verificationLoading,
  onOnchainCommit,
  onVerifyCommit
}: {
  data: ScanResponse;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
  commitVerification: CommitVerification | null;
  verificationLoading: boolean;
  onOnchainCommit: () => void;
  onVerifyCommit: () => void;
}) {
  const logger = providerStatus?.assessmentLogger;
  const chain = providerStatus?.chain;
  const recorderStatus = logger?.status || "unavailable";
  const contract = logger?.contractAddress || null;
  const contractUrl = contract && logger?.explorerBaseUrl ? `${logger.explorerBaseUrl}/address/${contract}` : null;
  const viewModel = buildAssessmentViewModel({ scan: data, providerStatus, commitRecord, commitVerification });
  const recordability = getRecordability(viewModel);
  const chainLabel = getMantleProofNetworkLabel(chain?.chainId || data.assessment.chainId);
  const walletLabel = data.assessment.wallet.address || data.assessment.wallet.walletHash;
  const assessmentHash = data.assessment.assessmentHash;
  const canRecord = recordability.canRecord;
  const proofRecorded = viewModel.recordStatus === "recorded_on_mantle";
  const verificationStatus = commitVerification?.verificationStatus || commitVerification?.status || null;
  const verificationAssessmentHash = commitVerification?.assessmentHash || "";
  const comparedLocalAssessmentHash = commitVerification?.localAssessmentHash || data.assessment.assessmentHash;
  const onchainAssessmentHash = commitVerification?.assessmentHash || commitRecord?.assessmentHash || "";
  const verifiedProofChainId = Number(commitVerification?.chainId || chain?.chainId || data.assessment.chainId);
  const verificationMatched =
    viewModel.proofStatus === "verified_matched" ||
    (verificationStatus === "verified" &&
      Boolean(verificationAssessmentHash) &&
      verificationAssessmentHash.toLowerCase() === comparedLocalAssessmentHash.toLowerCase());
  const verifiedProofState =
    verificationMatched && commitRecord?.assessmentTx
      ? {
          eventName: commitVerification?.eventName || "AssessmentRecorded",
          chainLabel: verifiedProofChainId === 5003 ? "Mantle Sepolia · 5003" : getMantleProofNetworkLabel(verifiedProofChainId),
          txHash: commitVerification?.txHash || commitRecord.assessmentTx,
          txUrl: commitVerification?.explorerUrl || commitRecord.explorerUrl || null,
          contractLabel: "AssessmentLogger",
          contractAddress: commitVerification?.contractAddress || contract,
          localAssessmentHash: comparedLocalAssessmentHash,
          onchainAssessmentHash,
          blockNumber: commitVerification?.blockNumber
        }
      : null;
  return (
    <section className="panel proof-panel">
      <div className="panel-head">
        <h2>On-chain Proof</h2>
        <Badge value={recorderStatus} />
      </div>
      <div className="proof-copy">
        Optional: record an assessment hash on Mantle Sepolia. This proves the assessment hash, not wallet safety. It does not revoke, swap, trade, or sign wallet actions.
      </div>
      <div className="record-grid">
        <div className="record-line span-record proof-preflight-card">
          <small>Record preflight</small>
          <strong>Writes assessmentHash only to {chainLabel}; spends testnet gas only after wallet confirmation.</strong>
        </div>
        <div className="record-line">
          <small>Wallet</small>
          <strong>{shortAddress(walletLabel)}</strong>
        </div>
        <div className="record-line">
          <small>Assessment hash</small>
          <strong>{shortRecordId(assessmentHash)}</strong>
        </div>
        <div className="record-line">
          <small>Recorder status</small>
          <strong>{recorderStatus}</strong>
        </div>
        <div className="record-line">
          <small>Chain</small>
          <strong>{chainLabel}</strong>
        </div>
        <div className="record-line">
          <small>Proof source</small>
          <strong>{getMantleProofSourceLabel(chain?.chainId || data.assessment.chainId)}</strong>
        </div>
        <div className="record-line">
          <small>Contract</small>
          {contract && contractUrl ? (
            <a className="inline-link" href={contractUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {shortAddress(contract)}
            </a>
          ) : (
            <strong>unavailable</strong>
          )}
        </div>
        <div className="record-line">
          <small>Last proof</small>
          <strong>{viewModel.proofLabel}</strong>
          <small>{viewModel.proofHelper}</small>
        </div>
        <div className="record-line">
          <small>Verification status</small>
          <strong>
            {verificationLoading
              ? "checking proof..."
              : commitRecord?.assessmentTx
              ? viewModel.proofStatus === "previous_verified_available"
                ? "previous verified available"
                : verificationStatus || viewModel.proofStatus || "not checked"
              : "No on-chain record to verify yet"}
          </strong>
        </div>
        {verifiedProofState && (
          <div className="record-line span-record verified-proof-card" data-testid="verified-proof-state">
            <div className="verified-proof-header">
              <span>
                <small>Verified proof</small>
                <strong>{verifiedProofState.eventName}</strong>
              </span>
              <Badge value="matched" />
            </div>
            <div className="verified-proof-grid">
              <span>
                <small>Verification</small>
                <strong>matched</strong>
              </span>
              <span>
                <small>Chain</small>
                <strong>{verifiedProofState.chainLabel}</strong>
              </span>
              <span>
                <small>Contract</small>
                {verifiedProofState.contractAddress && contractUrl ? (
                  <a className="inline-link" href={contractUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    {verifiedProofState.contractLabel}
                  </a>
                ) : (
                  <strong>{verifiedProofState.contractLabel}</strong>
                )}
              </span>
              <span>
                <small>Tx</small>
                {verifiedProofState.txUrl ? (
                  <a className="inline-link" href={verifiedProofState.txUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    Mantlescan
                  </a>
                ) : (
                  <strong>{shortAddress(verifiedProofState.txHash)}</strong>
                )}
              </span>
              <span className="proof-hash-compare">
                <small>Local assessmentHash</small>
                <code>{verifiedProofState.localAssessmentHash}</code>
              </span>
              <span className="proof-hash-compare">
                <small>On-chain assessmentHash</small>
                <code>{verifiedProofState.onchainAssessmentHash}</code>
              </span>
            </div>
            <small>
              {verifiedProofState.eventName} · block {verifiedProofState.blockNumber ?? "confirmed"} · read-only verification
            </small>
          </div>
        )}
        {viewModel.previousVerifiedAssessmentTx && (
          <div className="record-line span-record">
            <small>Previous verified assessment</small>
            <strong>Available</strong>
            <small>Current assessment remains not recorded unless the assessment hash matches this proof.</small>
          </div>
        )}
        {commitRecord?.assessmentTx && commitRecord.explorerUrl && (
          <div className="record-line span-record">
            <small>Tx hash</small>
            <a className="inline-link" href={commitRecord.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {shortAddress(commitRecord.assessmentTx)}
            </a>
          </div>
        )}
        {(commitRecord?.unavailableReason || commitRecord?.retryReason) && (
          <div className="record-line span-record">
            <small>Commit error</small>
            <code>{commitRecord.unavailableReason || commitRecord.retryReason}</code>
          </div>
        )}
        {(commitVerification?.mismatchReason || commitVerification?.safeError) && (
          <div className="record-line span-record">
            <small>Verification note</small>
            <code>{commitVerification.mismatchReason || commitVerification.safeError}</code>
          </div>
        )}
        {commitVerification && !commitVerification.mismatchReason && !commitVerification.safeError && (
          <div className="record-line span-record">
            <small>Verification detail</small>
            <strong>
              {verificationMatched ? "Matched assessment hash" : verificationStatus === "verified" ? "Verified event found" : "Readback completed"}
            </strong>
            <small>
              {commitVerification.eventName || "AssessmentRecorded"} · block{" "}
              {commitVerification.blockNumber ?? "pending"}
            </small>
          </div>
        )}
        <button data-testid="record-assessment-onchain" disabled={!canRecord || proofRecorded} onClick={onOnchainCommit}>
          <ShieldCheck size={16} />
          {recordability.label}
        </button>
        <button
          data-testid="verify-onchain-record"
          disabled={!commitRecord?.assessmentTx || verificationLoading}
          onClick={onVerifyCommit}
        >
          <Eye size={16} />
          {verificationLoading ? "Checking proof..." : verificationStatus === "verified" ? "Recheck proof" : "Verify proof"}
        </button>
        <small className="span-record">
          Manual only. Verification is read-only and does not trigger a new transaction.
        </small>
      </div>
    </section>
  );
}

function ProofSummaryCard({
  data,
  providerStatus,
  commitRecord,
  onViewProof
}: {
  data: ScanResponse;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
  onViewProof: () => void;
}) {
  const logger = providerStatus?.assessmentLogger;
  const isLive = data.assessment.dataMode === "live";
  const contract = logger?.contractAddress || null;
  const contractUrl = contract && logger?.explorerBaseUrl ? `${logger.explorerBaseUrl}/address/${contract}` : null;
  const txUrl = commitRecord?.explorerUrl || null;
  const txHash = commitRecord?.assessmentTx || null;
  const viewModel = buildAssessmentViewModel({ scan: data, providerStatus, commitRecord });
  return (
    <section className="panel proof-summary-card" data-testid="assessment-proof-summary">
      <div className="panel-head">
        <div>
          <h2>Assessment proof</h2>
          <small>Optional assessment-hash record. It proves this assessment record, not wallet safety.</small>
        </div>
        <Badge value={viewModel.proofLabel} />
      </div>
      <div className="proof-summary-body">
        <div className="proof-summary-row">
          <small>Mode</small>
          <strong>{isLive ? "Live Mantle Sepolia · read-only" : "Demo replay · live-compatible schema"}</strong>
        </div>
        <div className="proof-summary-row">
          <small>Chain</small>
          <strong>{getMantleProofNetworkLabel(data.assessment.chainId)}</strong>
        </div>
        <div className="proof-summary-row">
          <small>Proof source</small>
          <strong>{getMantleProofSourceLabel(data.assessment.chainId)}</strong>
        </div>
        <div className="proof-summary-row">
          <small>Assessment hash</small>
          <strong>{shortRecordId(data.assessment.assessmentHash)}</strong>
        </div>
        <div className="proof-summary-row">
          <small>Contract</small>
          {contract && contractUrl ? (
            <a className="inline-link" href={contractUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {shortAddress(contract)}
            </a>
          ) : (
            <strong>Unavailable</strong>
          )}
        </div>
        <div className="proof-summary-row">
          <small>Proof</small>
          {txHash && txUrl ? (
            <a className="inline-link" href={txUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {shortAddress(txHash)}
            </a>
          ) : (
            <strong>{viewModel.proofLabel}</strong>
          )}
        </div>
        <small className="proof-summary-note">
          {viewModel.proofHelper} {isLive ? "Manual only; recording opens a wallet confirmation." : "Run a live Sepolia scan to create a Mantlescan tx proof."}
        </small>
        <button data-testid="overview-view-proof" onClick={onViewProof}>
          <ShieldCheck size={16} />
          {proofViewLabel(data, commitRecord, viewModel)}
        </button>
      </div>
    </section>
  );
}

function ComplianceDisclaimer() {
  return (
    <section className="panel span-all disclaimer" data-testid="compliance-disclaimer">
      <AlertTriangle size={17} />
      <span>
        Compliance disclaimer: MantleLens is evidence-grounded wallet risk review, not financial advice. Missing indexed data is unknown, not safe. The app does not auto revoke, sign, swap, trade, or claim complete wallet safety.
      </span>
    </section>
  );
}

function PortfolioPanel({ data }: { data: ScanResponse }) {
  const tokens = data.inventory?.tokens || [];
  const total = tokens.reduce((sum, token) => sum + Number(token.valueUsd || 0), 0);
  const top = [...tokens].sort((left, right) => Number(right.valueUsd || 0) - Number(left.valueUsd || 0))[0];
  const topPct = top && total ? (Number(top.valueUsd || 0) / total) * 100 : 0;
  const concentration = data.assessment.topRisks.find((risk) => risk.type === "concentration");
  return (
    <div className="item-list">
      <div className="item-row">
        <span>
          <strong>{top ? `${top.symbol} ${topPct.toFixed(1)}%` : "No priced portfolio inventory"}</strong>
          <small>{tokens.length} tokens · total value {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small>
        </span>
        <Badge value={concentration?.severity || "ok"} />
      </div>
      {concentration && (
        <div className="item-row">
          <span>
            <strong>{concentration.claimText}</strong>
            <small>Evidence: {monitorEvidenceLabels(concentration.evidenceIds).join(" · ")}</small>
          </span>
        </div>
      )}
    </div>
  );
}

function RiskTypePanel({ risks, empty }: { risks: RiskItem[]; empty: string }) {
  return (
    <div className="item-list">
      {risks.length ? (
        risks.map((risk) => (
          <div className="item-row" key={risk.riskId}>
            <span>
              <strong>{userFacingCopy(risk.claimText || risk.title || "Yield exposure data")}</strong>
              <small>Evidence: {monitorEvidenceLabels(risk.evidenceIds).join(" · ")}</small>
            </span>
            <Badge value={risk.severity} />
          </div>
        ))
      ) : (
        <SmallText>{empty}</SmallText>
      )}
    </div>
  );
}

function AgentIdentityPanel({ identity, providerStatus }: { identity: AgentIdentity | null; providerStatus: ProviderStatus | null }) {
  const registration = identity?.registration;
  const card = identity?.card;
  const chainId = providerStatus?.chain.chainId || registration?.chainId || card?.chain?.chainId || 5000;
  const name = providerStatus?.chain.networkName || registration?.networkName || card?.chain?.networkName || networkName(chainId);
  return (
    <div className="item-list">
      <div className="item-row">
        <span>
          <strong>{registration?.agentId || card?.name || "mantlelens-wallet-guard"}</strong>
          <small>chain {chainId} · {name} · MCP read-only · ERC-8004-compatible registration · local reputation feedback in demo</small>
          <small>No identity NFT is claimed unless a contract address and token id are shown.</small>
          <code>/.well-known/agent-card.json · /agent-registration.json · /mcp</code>
        </span>
        <Badge value={String(card?.security?.realExecutionAllowed ?? registration?.safety?.realExecutionAllowed ?? false)} />
      </div>
      <div className="item-row">
        <span>
          <strong>Agent skills</strong>
          <small>{Array.isArray(card?.skills) ? `${card.skills.length} advertised skills` : "Agent card unavailable"}</small>
        </span>
        <Bot size={16} />
      </div>
    </div>
  );
}

function EnhancementPanel({
  enhancements,
  liveMode,
  manualRevokeTx,
  walletAction,
  onManualRevoke,
  onConnectWallet,
  onWalletRevoke
}: {
  enhancements: EnhancementsResponse | null;
  liveMode: boolean;
  manualRevokeTx: string | null;
  walletAction: WalletActionState;
  onManualRevoke: (txRequest: NonNullable<EnhancementModule["txRequest"]>) => void;
  onConnectWallet: () => Promise<string | null>;
  onWalletRevoke: (txRequest: NonNullable<EnhancementModule["txRequest"]>) => void;
}) {
  const modules = enhancements?.modules || [];
  const labels: Record<string, string> = {
    nft_approval_detection: "NFT Approval Detection",
    manual_revoke: "Manual Revoke Review",
    defi_deep_parsing: "DeFi Deep Parsing",
    goplus_full_security: "GoPlus Malicious / Address / Approval",
    real_tx_simulation: "Real Transaction Simulation",
    social_share_card: "Social Share Card",
    erc8004_reputation_feedback: "ERC-8004 Reputation Feedback"
  };
  return (
    <div className="enhancement-grid">
      {modules.length ? (
        modules.map((module) => (
          <div className="enhancement-tile" key={module.module}>
            <div>
              <strong>{labels[module.module] || userFacingCopy(humanizeIdentifier(module.module))}</strong>
              <small>{enhancementStatusLabel(module)} · {enhancementFallbackLabel(module)}</small>
              <details className="raw-details">
                <summary>Raw developer trace</summary>
                <code>
                  {module.status} · fallbackUsed {String(Boolean(module.fallbackUsed))}
                </code>
              </details>
            </div>
            <Badge value={enhancementStatusLabel(module)} />
            {module.module === "manual_revoke" && module.txRequest && (
              <div className="manual-revoke-box">
                <code>{module.txRequest.method || "approve(address,uint256)"}</code>
                <small>Prepared revoke request. The app never asks for private keys; signing happens only inside your wallet.</small>
                <button
                  data-testid="manual-revoke-review"
                  onClick={() => onManualRevoke(module.txRequest as NonNullable<EnhancementModule["txRequest"]>)}
                >
                  <ShieldCheck size={15} />
                  Review request
                </button>
                <button
                  data-testid="wallet-revoke-review-only"
                  onClick={() => onWalletRevoke(module.txRequest as NonNullable<EnhancementModule["txRequest"]>)}
                >
                  <Eye size={15} />
                  Confirm review-only context
                </button>
                <small>wallet execution disabled · use your wallet app manually after reviewing evidence.</small>
                {walletAction.status === "error" && walletAction.error && <small className="danger">{walletAction.error}</small>}
                {manualRevokeTx && <code>{manualRevokeTx}</code>}
              </div>
            )}
            {module.unavailableReason && <small>{userFacingCopy(module.unavailableReason)}</small>}
            {module.simulationResult && <small>provider simulation available · no broadcast</small>}
            {module.shareText && (
              <span className="share-line">
                <Share2 size={14} />
                {module.shareText}
              </span>
            )}
          </div>
        ))
      ) : (
        <SmallText>Enhancement modules are loading or unavailable.</SmallText>
      )}
    </div>
  );
}

function MonitorView({
  trend,
  history,
  alerts,
  currentData,
  providerStatus,
  commitRecord,
  benchmarkResults: _benchmarkResults,
  onRunBenchmarkSuite: _onRunBenchmarkSuite,
  onResolve,
  onReviewAlertEvidence,
  onViewProof
}: {
  trend: Trend | null;
  history: WalletHistoryResponse | null;
  alerts: AlertItem[];
  currentData: ScanResponse | null;
  providerStatus: ProviderStatus | null;
  commitRecord: CommitRecord | null;
  benchmarkResults: Record<string, BenchmarkCaseResult>;
  onRunBenchmarkSuite: () => void;
  onResolve: (alert: AlertItem) => void;
  onReviewAlertEvidence: (alert: AlertItem) => void;
  onViewProof: () => void;
}) {
  const viewModel = currentData ? buildAssessmentViewModel({ scan: currentData, providerStatus, commitRecord, history }) : null;
  const records = viewModel ? filterHistoryRecordsForViewModel(viewModel, history?.records || []) : history?.records || [];
  const groupedRecords = groupHistoryRecords(records);
  const visibleGroups = groupedRecords;
  const highlightedGroups = selectAssessmentGroups(visibleGroups);
  const latestRecord = newestHistoryRecord(records) || highlightedGroups[0]?.record;
  const currentProofRecordId =
    viewModel && (viewModel.proofStatus === "verified_matched" || viewModel.recordStatus === "recorded_on_mantle")
      ? latestRecord?.historyRecordId
      : undefined;
  const latestPoint = trend ? latestTrendPoint(trend) : null;
  const latestScore = latestRecord ? scoreDisplayForRecord(latestRecord) : latestPoint ? scoreDisplayForTrendPoint(latestPoint) : "No score";
  const latestLevel = latestRecord ? recordRiskLevelLabel(latestRecord) : latestPoint ? trendPointRiskLevelLabel(latestPoint) : "Pending";
  const delta = trend?.latestScoreDelta ?? trend?.delta?.scoreDelta ?? 0;
  const openReviewItemCount = groupAlerts(alerts).filter((group) => group.openCount > 0).length;
  const recordsByAssessmentId = new Map(records.map((record) => [record.assessmentId, record]));
  if (!trend) {
    return (
      <div className="view-grid">
        <section className="panel span-all">
          <div className="panel-head">
            <h2>Assessment history & risk trend</h2>
            <small>{assessmentRecordCountLabel(history?.recordCount ?? records.length)}</small>
          </div>
          <EmptyState title="No previous assessments for this wallet. Run another scan to build trend." />
        </section>
      </div>
    );
  }
  return (
    <div className="view-grid">
      <section className="panel span-all history-trend-panel">
        <div className="panel-head">
          <h2>Assessment history & risk trend</h2>
          <small>showing latest / previous / last changed</small>
        </div>
        <div className="history-summary-grid">
          <HistorySummaryMetric label="Latest score" value={`${latestScore} · ${latestLevel}`} severity={latestLevel} />
          <HistorySummaryMetric label="Change" value={scoreDeltaLabel(delta)} severity={delta > 0 ? "High" : delta < 0 ? "Low" : "neutral"} />
          <HistorySummaryMetric label="Open review items" value={String(openReviewItemCount)} severity={openReviewItemCount ? "High" : "Low"} />
          <HistorySummaryMetric label="Proof" value={historyProofSummary(latestRecord, viewModel)} severity={historyProofSummary(latestRecord, viewModel)} />
        </div>
        {viewModel && (
          <div className="history-current-proof-note" data-testid="history-current-proof-note">
            <strong>{viewModel.currentAssessmentRecordLabel}</strong>
            {(viewModel.proofStatus === "verified_matched" || viewModel.recordStatus === "recorded_on_mantle") && (
              <span>Current proof applies to latest assessment.</span>
            )}
            {viewModel.previousVerifiedAssessmentLabel && <span>{viewModel.previousVerifiedAssessmentLabel}</span>}
          </div>
        )}
        <div className="monitor-summary product-history-summary">
          <TrendSparkline trend={trend} />
          <div>
            <strong>{userFacingCopy(trendSummaryText(trend, history))}</strong>
            <small>
              {isLiveHistoryContext(history?.mode || trend?.mode) ? "Live trend is cautious when source coverage is partial." : "Demo trend is based on replayed assessment data."}
            </small>
            {(trend.trendStatus || trend.status) === "partially_comparable" && (
              <small>Trend is partially comparable because source coverage changed.</small>
            )}
          </div>
        </div>
      </section>

      <section className="panel span-all">
        <div className="panel-head">
          <h2>Open review items</h2>
          <small>{openReviewItemCount} open · latest items only</small>
        </div>
        <OpenReviewItems alerts={alerts} onResolve={onResolve} onReview={onReviewAlertEvidence} />
      </section>

      <section className="panel span-all">
        <div className="panel-head">
          <h2>Recent assessments</h2>
          <small>
            {visibleGroups.length
              ? `${highlightedGroups.length} highlighted · ${assessmentRecordCountLabel(visibleGroups.length)} total`
              : "no assessment records yet"}
          </small>
        </div>
        <div className="item-list">
          {highlightedGroups.length ? (
            highlightedGroups.map((group, index) => (
              <AssessmentRecordRow
                key={`${group.label}-${group.record.historyRecordId}`}
                group={group}
                onViewProof={onViewProof}
                testId={`history-assessment-${index}`}
                viewModel={viewModel}
                currentAssessmentId={currentData?.assessment.assessmentId}
                currentProofRecordId={currentProofRecordId}
              />
            ))
          ) : (
            <SmallText>No previous assessments for this wallet. Run another scan to build trend.</SmallText>
          )}
          {visibleGroups.length > highlightedGroups.length ? (
            <details className="raw-details all-records-details">
              <summary>View complete assessment list ({visibleGroups.length})</summary>
              <div className="item-list compact-history-list">
                {visibleGroups.map(({ record, count }) => (
                  <AssessmentRecordRow
                    key={`all-${record.historyRecordId}`}
                    group={{ record, count, label: "Assessment record" }}
                    onViewProof={onViewProof}
                    testId="history-all-record-proof"
                    viewModel={viewModel}
                    currentAssessmentId={currentData?.assessment.assessmentId}
                    currentProofRecordId={currentProofRecordId}
                    compact
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </section>

      <SourceCoveragePanel trend={trend} history={history} latestRecord={latestRecord} />
    </div>
  );
}

function HistorySummaryMetric({ label, value, severity }: { label: string; value: string; severity?: string }) {
  const tone = severity ? severityClass(severity) : "";
  return (
    <div className={["history-summary-card", tone].filter(Boolean).join(" ")}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function OpenReviewItems({
  alerts,
  onResolve: _onResolve,
  onReview
}: {
  alerts: AlertItem[];
  onResolve: (alert: AlertItem) => void;
  onReview: (alert: AlertItem) => void;
}) {
  const groups = groupAlerts(alerts)
    .filter((group) => group.openCount > 0)
    .sort((left, right) => reviewItemRank(left.type, left.alerts[0]) - reviewItemRank(right.type, right.alerts[0]))
    .slice(0, 3);
  return (
    <div className="item-list review-item-list">
      {groups.length ? (
        groups.map((group) => {
          const primary = group.alerts.find((alert) => alert.status === "open") || group.alerts[0];
          return (
            <div className="item-row review-item-row" key={group.type}>
              <span>
                <strong>{reviewItemTitle(group.type, primary)}</strong>
                <small>{userFacingCopy(primary.description || primary.message || "Review this item before taking any wallet action.")}</small>
              </span>
              <div className="row-actions">
                <Badge value={primary.severity} />
                <button onClick={() => onReview(primary)}>
                  <Eye size={16} />
                  {alertPrimaryActionLabel(group.type)}
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <SmallText>No open review items. This does not mean the wallet is risk-free.</SmallText>
      )}
    </div>
  );
}

function AssessmentRecordRow({
  group,
  onViewProof,
  testId,
  viewModel,
  currentAssessmentId,
  currentProofRecordId,
  compact
}: {
  group: { record: HistoryRecord; count: number; label: string };
  onViewProof: () => void;
  testId: string;
  viewModel?: AssessmentViewModel | null;
  currentAssessmentId?: string;
  currentProofRecordId?: string;
  compact?: boolean;
}) {
  const { record, count, label } = group;
  return (
    <div className={compact ? "item-row assessment-record-row compact-row" : "item-row assessment-record-row"}>
      <span>
        <small className="record-kicker">{label}</small>
        <strong>{scoreDisplayForRecord(record)} · {recordRiskLevelLabel(record)}</strong>
        <small>Top risks: {recordTopRiskLabels(record)}</small>
        <small>Outcome: {recordOutcomeLabel(record, count)} · Coverage: {recordCoverageLabel(record)}</small>
        <small>Proof: {recordProofStatusLabel(record, viewModel, currentAssessmentId, currentProofRecordId)} · Record status: {recordStatusLabel(record, viewModel, currentAssessmentId, currentProofRecordId)}</small>
        <small>Time: {formatScanTimestamp(record.scanTimestamp || record.createdAt)}</small>
        {count > 1 && <small>{count} matching assessments grouped to reduce repeated demo noise.</small>}
        <details className="raw-details assessment-record-details">
          <summary>View details</summary>
          <div className="record-detail-grid">
            <MonitorField label="Scenario" value={benchmarkCaseLabel(record)} />
            <MonitorField label="User action" value={agentDecisionLabel(record)} />
            <MonitorField label="Recommendation" value={recordRecommendationLabel(record)} />
            <MonitorField label="Outcome" value={recordOutcomeLabel(record, count)} />
            <MonitorField label="Record status" value={recordStatusLabel(record, viewModel, currentAssessmentId, currentProofRecordId)} />
            <MonitorField label="Proof status" value={recordProofStatusLabel(record, viewModel, currentAssessmentId, currentProofRecordId)} />
            <MonitorField label="Proof type" value={recordReplayProofLabel(record, viewModel, currentAssessmentId, currentProofRecordId)} />
            <MonitorField label="Assessment hash" value={shortRecordId(record.assessmentHash || record.historyRecordId)} />
          </div>
        </details>
      </span>
      <div className="row-actions">
        <Badge value={monitorStatusLabel(record.status)} />
        {recordProofAction(record, onViewProof, testId, viewModel, currentAssessmentId, currentProofRecordId)}
      </div>
    </div>
  );
}

function SourceCoveragePanel({
  trend,
  history,
  latestRecord
}: {
  trend: Trend;
  history: WalletHistoryResponse | null;
  latestRecord?: HistoryRecord;
}) {
  const sourceAvailability = sourceCoverageAvailability(latestRecord, trend);
  const groups = getSourceStatusGroups(sourceAvailability);
  const copy = getCoverageWarningCopy();
  return (
    <section className="panel span-all source-coverage-panel">
      <div className="panel-head">
        <div>
          <h2>Source coverage</h2>
          <small>{copy.whyItMatters}</small>
        </div>
      </div>
      <div className="source-coverage-body">
        <div className="source-coverage-summary">
          <strong>{copy.statusHeadline}</strong>
          <small>{copy.body}</small>
          <small>{copy.hiddenRisk}</small>
          <small>{isLiveHistoryContext(history?.mode || trend.mode) ? "Live source availability affects trend confidence." : "Demo replay uses the recorded source-coverage state."}</small>
        </div>
        <SourceStatusGroupsView groups={groups} />
        {trend.sourceCoverageChanges?.length ? (
          <div className="source-change-list">
            {trend.sourceCoverageChanges.slice(0, 4).map((change) => (
              <span key={`${change.source}-${change.previous}-${change.current}`}>
                {sourceDisplayName(change.source)}: {sourceStatusLabel(change.previous)} to {sourceStatusLabel(change.current)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BenchmarkCaseMatrix({
  history,
  results,
  onRunSuite
}: {
  history: WalletHistoryResponse | null;
  results: Record<string, BenchmarkCaseResult>;
  onRunSuite: () => void;
}) {
  const recordResults = benchmarkResultsFromHistory(history);
  const rows = benchmarkCases.map((benchmarkCase) => {
    const actual = results[benchmarkCase.id] || recordResults[benchmarkCase.id];
    return { benchmarkCase, actual };
  });
  return (
    <section className="panel span-all benchmark-matrix-panel" data-testid="benchmark-case-matrix">
      <div className="panel-head">
        <div>
          <h2>Benchmark case matrix</h2>
          <small>Reference scenarios for benchmark coverage checks. Replay cases do not create Mantle tx proofs.</small>
        </div>
        <button className="inline-action" onClick={onRunSuite}>
          <Play size={15} />
          Run benchmark suite
        </button>
      </div>
      <div className="benchmark-matrix">
        {rows.map(({ benchmarkCase, actual }) => (
          <div className="benchmark-matrix-row" key={benchmarkCase.id}>
            <div>
              <strong>{benchmarkCase.label}</strong>
              <small>{benchmarkCase.description}</small>
            </div>
            <span>
              <small>Score</small>
              <strong>{actual ? scoreDisplay(actual.score) : "Run suite"}</strong>
            </span>
            <span>
              <small>Decision</small>
              <strong>{actual?.decision || benchmarkCase.expectedDecision}</strong>
            </span>
            <span>
              <small>Coverage</small>
              <strong>{actual?.coverage || "Fixture not run"}</strong>
            </span>
            <span>
              <small>Proof scope</small>
              <strong>{actual?.proofUrl ? "Recorded tx" : actual ? benchmarkMatrixProofLabel(actual.proofStatus) : "Replay fixture"}</strong>
              {actual?.proofUrl ? (
                <a className="inline-link matrix-proof-link" href={actual.proofUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  Recorded tx
                </a>
              ) : (
                <small>{actual ? "Evidence is replay-only; no Mantle tx" : "Run suite to generate result"}</small>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonitorField({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <span className="monitor-field">
      <small>{label}</small>
      <strong>{value}</strong>
      {action}
    </span>
  );
}

function InlineProofAction({ onClick, testId, label = "View proof" }: { onClick: () => void; testId: string; label?: string }) {
  return (
    <button className="proof-inline-action" data-testid={testId} onClick={onClick}>
      <ShieldCheck size={14} />
      {label}
    </button>
  );
}

function GroupedAlerts({
  alerts,
  onResolve,
  onReview
}: {
  alerts: AlertItem[];
  onResolve: (alert: AlertItem) => void;
  onReview: (alert: AlertItem) => void;
}) {
  const groups = groupAlerts(alerts);
  return (
    <div className="item-list">
      {groups.length ? (
        groups.map((group) => {
          const primary = group.alerts[0];
          const open = group.alerts.find((alert) => alert.status === "open");
          return (
            <div className="item-row alert-row" key={group.type}>
              <span>
                <strong>{alertTypeLabel(group.type)}</strong>
                <small>{userFacingCopy(primary.description || primary.message || "Informational alert generated from risk or source coverage changes.")}</small>
                <small>{alertWhyItMatters(primary)}</small>
                {primary.evidenceIds.length ? <ChipRow items={monitorEvidenceLabels(primary.evidenceIds)} prefix="evidence" muted /> : null}
                {primary.recommendedSafeActions?.length ? <ChipRow items={primary.recommendedSafeActions.map((item) => safeActionLabel(item, item))} prefix="actions" /> : null}
              </span>
              <div className="row-actions">
                <Badge value={primary.severity} />
                <small>{group.openCount} open · seen {group.seenCount}</small>
                <button onClick={() => onReview(open || primary)}>
                  <Eye size={16} />
                  {alertPrimaryActionLabel(group.type)}
                </button>
                {open && (
                  <button className="secondary-control" onClick={() => onResolve(open)}>
                    <CheckCircle2 size={16} />
                    Mark as reviewed
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <SmallText>No open alerts. This does not mean the wallet is risk-free.</SmallText>
      )}
    </div>
  );
}

function TrendSparkline({ trend }: { trend: Trend }) {
  const series = (
    trend.scoreSeries?.length
      ? trend.scoreSeries.map((point) => ({
          label: point.timestamp,
          value: Number(point.value)
        }))
      : trend.points.map((point) => ({
          label: point.timestamp,
          value: Number(point.walletRiskScore)
        }))
  )
    .filter((point) => Number.isFinite(point.value))
    .slice(-12);

  if (series.length < 2) {
    return <SmallText>Need at least two comparable assessments to show a score line.</SmallText>;
  }

  const width = 320;
  const height = 92;
  const pad = 14;
  const values = series.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = Math.max(1, max - min);
  const coords = series.map((point, index) => {
    const x = pad + (index / Math.max(1, series.length - 1)) * (width - pad * 2);
    const y = height - pad - ((point.value - min) / span) * (height - pad * 2);
    return { x, y, ...point };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - pad} L ${coords[0].x.toFixed(1)} ${height - pad} Z`;
  const latest = coords[coords.length - 1];

  return (
    <div className="trend-chart" aria-label={`Risk score trend, latest score ${scoreDisplay(latest.value)}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Risk score line chart">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} />
        <path className="trend-area" d={area} />
        <path className="trend-line" d={path} />
        {coords.map((point) => (
          <circle key={`${point.label}-${point.value}`} cx={point.x} cy={point.y} r={3} />
        ))}
      </svg>
      <div className="trend-chart-meta">
        <span>latest {scoreDisplay(latest.value)}</span>
        <span>range {min.toFixed(0)}-{max.toFixed(0)}</span>
      </div>
    </div>
  );
}

function HistoryList({
  items,
  type,
  dataMode
}: {
  items: Array<Record<string, unknown>>;
  type: "approval" | "transfer";
  dataMode: string;
}) {
  if (!items.length) {
    const label =
      type === "approval"
        ? "No approval history returned from configured source. Unknown, not safe."
        : "No transfer history returned from configured source. Unknown, not safe.";
    return <SmallText>{dataMode === "live" ? label : `No ${type} history returned for this reference replay mode.`}</SmallText>;
  }
  return (
    <div className="item-list">
      {items.slice(0, 8).map((item, index) => (
        <div className="item-row" key={`${type}-${index}`}>
          <span>
            <strong>{type === "approval" ? approvalRowTitle(item) : transferRowTitle(item)}</strong>
            <small>
              {type === "approval"
                ? `${item.token || shortAddress(String(item.tokenAddress || "token"))} · ${item.isActive ? "active" : "inactive"} · ${item.isUnlimited ? "unlimited" : "limited"}`
                : `${item.token || shortAddress(String(item.tokenAddress || "token"))} · ${item.direction || item.transferType || "transfer"} · ${item.amount || "0"}`}
            </small>
            <small>{type === "approval" ? `Spender ${shortAddress(String(item.spender || "unknown"))}` : `Counterparty ${shortAddress(String(item.counterparty || "unknown"))}`}</small>
            <small>{historyEvidenceLabel(type, item)}</small>
          </span>
          <Badge value={type === "approval" && item.isActive ? "High" : String(item.riskLevel || "ok")} />
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  severity,
  compact,
  helper
}: {
  label: string;
  value: string;
  severity?: string;
  compact?: boolean;
  helper?: string;
}) {
  const severityClassName = severity ? severityClass(severity) : "";
  return (
    <div className={["metric", severityClassName].filter(Boolean).join(" ")}>
      <small>{label}</small>
      <strong className={[severityClassName, compact ? "compact" : ""].filter(Boolean).join(" ")}>{value}</strong>
      {helper ? <span className="metric-helper">{helper}</span> : null}
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${severityClass(value)}`}>{value}</span>;
}

function SmallText({ children }: { children: ReactNode }) {
  return <small className="muted">{children}</small>;
}

function ChipRow({ items, prefix, muted }: { items: string[]; prefix: string; muted?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="chip-row">
      <small className="chip-prefix">{prefix}</small>
      {items.map((item) => (
        <span className={muted ? "mini-chip muted-chip" : "mini-chip"} key={`${prefix}-${item}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <section className="panel empty-state">
      <XCircle size={22} />
      <strong>{title}</strong>
    </section>
  );
}

function assessmentSummary(assessment: ScanResponse["assessment"]) {
  const risks = assessment.topRisks.slice(0, 3).map(riskTitle);
  if (!risks.length) {
    return "No top risks were returned by the current rules. Missing data is still treated as unknown, not safe.";
  }
  return `${assessment.riskLevel} risk because this wallet has ${joinHumanList(risks.map((risk) => risk.toLowerCase()))}.`;
}

function buildCoreSignals(data: ScanResponse): CoreSignal[] {
  const risks = data.assessment.topRisks || [];
  if (!risks.length) return [];
  const signals: CoreSignal[] = [];
  const approval = findEvidenceBackedApprovalRisk(data);
  const poisoning = findEvidenceBackedTransferRisk(data);
  const yieldRisk = findEvidenceBackedYieldRisk(data);

  if (approval) {
    signals.push({
      key: "approval",
      title: "Approval anomaly",
      body: "USDT has an active unlimited approval to an unknown spender.",
      impact: approval.severity || "High",
      confidence: confidenceText(approval, "78%"),
      evidenceText: evidenceCountText(approval, "sources", 2),
      primaryCta: "Inspect approval evidence",
      risk: approval
    });
  }

  if (poisoning) {
    signals.push({
      key: "poisoning",
      title: "Address poisoning signal",
      body: "A tiny incoming transfer came from a lookalike address and may be attempting to poison transaction history.",
      impact: poisoning.severity || "High",
      confidence: confidenceText(poisoning, "95%"),
      evidenceText: evidenceCountText(poisoning, "transaction", 1),
      primaryCta: "Inspect transfer evidence",
      risk: poisoning
    });
  }

  if (yieldRisk) {
    signals.push({
      key: "yield",
      title: mantleYieldSignalTitle(data),
      body: mantleYieldSignalBody(data),
      impact: yieldImpactLabel(yieldRisk),
      confidence: confidenceText(yieldRisk, "78%"),
      evidenceText: evidenceCountText(yieldRisk, "sources", 2),
      primaryCta: "Inspect yield evidence",
      risk: yieldRisk
    });
  }

  if (!signals.length) {
    const coverageRisk = findCoverageRisk(data) || risks[0];
    if (coverageRisk) {
      signals.push({
        key: "coverage",
        title: "Source coverage warning",
        body: "Some indexed sources were unavailable, so missing signals remain unknown instead of safe.",
        impact: "Unknown coverage",
        confidence: confidenceText(coverageRisk, formatPercent(data.assessment.dataConfidence)),
        evidenceText: evidenceCountText(coverageRisk, "sources", Math.max(1, coverageRisk.evidenceIds?.length || 1)),
        primaryCta: "Inspect coverage evidence",
        risk: coverageRisk
      });
    }
  }

  return signals;
}

function mantleYieldSignalTitle(data: ScanResponse) {
  return findDemoMantleYieldToken(data) ? "Demo Mantle yield-like exposure" : "Yield concentration signal";
}

function mantleYieldSignalBody(data: ScanResponse) {
  const demoToken = findDemoMantleYieldToken(data);
  if (demoToken) {
    return "MLDT · Sepolia test token. Demo Mantle yield-like token, not official mETH/cmETH or real RWA exposure.";
  }
  return "mETH and cmETH can create concentrated Mantle yield exposure in the known-token portfolio; this is not RWA or investment advice.";
}

function findDemoMantleYieldToken(data: ScanResponse): TokenItem | null {
  return data.inventory?.tokens?.find((token) => isDemoMantleYieldLikeToken(token.symbol, token.tokenAddress)) || null;
}

function hasDemoMantleYieldLikeEvidence(data: ScanResponse) {
  return Boolean(findDemoMantleYieldToken(data) || data.evidenceBundle.evidence.some(isDemoMantleEvidence));
}

function findEvidenceBackedApprovalRisk(data: ScanResponse) {
  const risk = findRisk(data.assessment.topRisks || [], ["approval", "allowance", "spender", "unlimited"]);
  if (!risk) return null;
  return riskHasEvidenceType(data, risk, ["approval"]) || hasActiveApprovalEvidence(data, risk) ? risk : null;
}

function findEvidenceBackedTransferRisk(data: ScanResponse) {
  const risk = findRisk(data.assessment.topRisks || [], ["poison", "dust", "lookalike", "transfer"]);
  if (!risk) return null;
  return riskHasEvidenceType(data, risk, ["transfer"]) ? risk : null;
}

function findEvidenceBackedYieldRisk(data: ScanResponse) {
  const risk = findRisk(data.assessment.topRisks || [], ["concentration", "meth", "cmeth", "yield", "rwa", "defi"]);
  if (!risk) return null;
  return riskHasEvidenceType(data, risk, ["balance", "inventory", "portfolio", "token"]) || riskHasInventoryEvidence(data, risk) ? risk : null;
}

function findCoverageRisk(data: ScanResponse) {
  return findRisk(data.assessment.topRisks || [], ["source", "coverage", "partial", "unknown", "unavailable", "indexed"]);
}

function riskHasEvidenceType(data: ScanResponse, risk: RiskItem, types: string[]) {
  const expected = types.map((type) => type.toLowerCase());
  return evidenceItemsForRisk(data, risk).some((item) => {
    const type = String(item.type || "").toLowerCase();
    const source = String(item.source || "").toLowerCase();
    const claim = String(item.claimText || "").toLowerCase();
    return expected.some((expectedType) => type.includes(expectedType) || source.includes(expectedType) || claim.includes(expectedType));
  });
}

function riskHasInventoryEvidence(data: ScanResponse, risk: RiskItem) {
  const ids = evidenceIdsForRisk(risk);
  return Boolean(data.inventory?.tokens?.some((token) => ids.some((id) => rowHasEvidence(token, id))));
}

function evidenceItemsForRisk(data: ScanResponse, risk: RiskItem) {
  const ids = new Set(evidenceIdsForRisk(risk));
  return data.evidenceBundle.evidence.filter((item) => ids.has(item.evidenceId));
}

function hasActiveApprovalEvidence(data: ScanResponse, risk?: RiskItem) {
  const ids = risk ? new Set(evidenceIdsForRisk(risk)) : null;
  const approvalRows = data.history?.approvalHistory?.items || [];
  if (
    approvalRows.some((approval) => {
      const matches = !ids || [...ids].some((id) => rowHasEvidence(approval, id));
      return matches && approval.isActive !== false && (approval.isUnlimited || approval.allowanceConfirmed);
    })
  ) {
    return true;
  }
  return data.evidenceBundle.evidence.some((item) => {
    const matches = !ids || ids.has(item.evidenceId);
    const haystack = `${item.type} ${item.claimText}`.toLowerCase();
    return matches && haystack.includes("approval") && (item.allowanceConfirmed || haystack.includes("active allowance"));
  });
}

function canSimulateApproval(data: ScanResponse) {
  const risk = findEvidenceBackedApprovalRisk(data);
  return Boolean(risk && hasActiveApprovalEvidence(data, risk));
}

function canSimulatePortfolio(data: ScanResponse) {
  return Boolean(findEvidenceBackedYieldRisk(data));
}

function findRisk(risks: RiskItem[], keywords: string[]) {
  return risks.find((risk) => {
    const haystack = `${risk.type} ${risk.category || ""} ${risk.title || ""} ${risk.claimText} ${risk.explanation || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

function confidenceText(risk: RiskItem, fallback: string) {
  return typeof risk.confidence === "number" && Number.isFinite(risk.confidence) ? formatPercent(risk.confidence) : fallback;
}

function evidenceCountText(risk: RiskItem, noun: string, fallbackCount: number) {
  const count = risk.evidenceIds?.length || fallbackCount;
  if (noun === "transaction") return count === 1 ? "1 transaction" : `${count} transactions`;
  return count === 1 ? "1 source" : `${count} sources`;
}

function roundedScore(value: number) {
  return Math.round(Number(value) || 0);
}

function coverageHeroLabel(status: string, mode?: string) {
  return copyCoverageLabel(status, mode);
}

function heroTitle(data: ScanResponse, signalCount: number) {
  if (data.assessment.dataMode !== "live" && signalCount === 3) return THREE_SIGNAL_HERO_TITLE;
  return getRiskHeadline(data.assessment, signalCount);
}

function heroSubtitle(data: ScanResponse, signals: CoreSignal[]) {
  return getRiskSubtitle(data.assessment, signals.map((signal) => signal.title));
}

function heroRiskLevelLabel(data: ScanResponse) {
  return assessmentDisplayRiskLevel(data);
}

function assessmentDisplayRiskLevel(data: ScanResponse) {
  if (isCoverageOnlyAssessment(data.assessment)) return "Unknown coverage";
  return data.assessment.riskLevel;
}

function timelineRiskEvaluationDetail(data: ScanResponse, signalCount: number) {
  const kind = resultKind(data);
  if (kind === "coverage_warning_only") {
    const count = Math.max(1, signalCount);
    return `${count} coverage warning evaluated; no direct risk evidence scored`;
  }
  if (kind === "no_material_signals") return "No direct risk signals scored from available evidence";
  return `${signalCount} risk signal${signalCount === 1 ? "" : "s"} scored deterministically`;
}

function traceEventTitle(event: TraceEvent) {
  if (event.toState) return traceStateLabel(event.toState);
  if (event.toolName) return humanizeIdentifier(event.toolName);
  return humanizeIdentifier(event.eventType);
}

function tracePhaseSummaries(events: TraceEvent[]) {
  const phases = [
    { key: "DATA_GATHERING", label: "Collect wallet data", fallback: "Read wallet state and source coverage." },
    { key: "RISK_EVALUATING", label: "Evaluate risk signals", fallback: "Score approval, transfer, and exposure signals." },
    { key: "EVIDENCE_BINDING", label: "Bind evidence", fallback: "Attach evidence records to each claim." },
    { key: "EXPLAINING", label: "Explain findings", fallback: "Generate user-facing explanation." },
    { key: "SIMULATION_READY", label: "Prepare safe actions", fallback: "Prepare review-only next actions." }
  ];
  const phaseByKey = new Map(
    phases.map((phase) => [
      phase.key,
      {
        ...phase,
        eventCount: 0,
        tools: [] as string[],
        coverage: ""
      }
    ])
  );
  let activeKey = phases[0].key;
  for (const event of events) {
    const state = String(event.toState || "").toUpperCase();
    if (state === "PARTIAL_OR_UNKNOWN") {
      phaseByKey.get("DATA_GATHERING")!.coverage = "Partial scan · unknown fields present";
      continue;
    }
    if (phaseByKey.has(state)) activeKey = state;
    const active = phaseByKey.get(activeKey);
    if (!active) continue;
    active.eventCount += 1;
    if (event.toolName) active.tools = uniqueLabels([...active.tools, event.toolName]);
  }
  return phases
    .map((phase) => phaseByKey.get(phase.key)!)
    .filter((phase) => phase.eventCount > 0 || phase.tools.length || phase.coverage)
    .map((phase) => {
      const toolCount = phase.tools.length;
      const countText = `${phase.eventCount} event${phase.eventCount === 1 ? "" : "s"}`;
      const toolText = toolCount ? `${toolCount} read-only tool${toolCount === 1 ? "" : "s"}` : "";
      const detailParts = [phase.coverage, toolText, countText].filter(Boolean);
      return {
        key: phase.key,
        label: phase.label,
        detail: detailParts.length ? detailParts.join(" · ") : phase.fallback,
        tools: phase.tools,
        status: phase.coverage ? "Partial" : "Complete"
      };
    });
}

function traceStateLabel(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "DATA_GATHERING") return "Collect wallet data";
  if (normalized === "RISK_EVALUATING") return "Evaluate risk signals";
  if (normalized === "EVIDENCE_BINDING") return "Bind evidence";
  if (normalized === "EXPLAINING") return "Explain findings";
  if (normalized === "SIMULATION_READY") return "Prepare safe actions";
  if (normalized === "PARTIAL_OR_UNKNOWN") return "Partial scan · unknown fields present";
  return humanizeIdentifier(value);
}

function advancedExplanationText(data: ScanResponse) {
  const fallback = data.explanation?.explanation || "No explanation returned.";
  if (resultKind(data) !== "coverage_warning_only") return userFacingCopy(fallback);
  const scoreCopy = getScoreDisplay(data.assessment);
  const evidenceLabels = uniqueLabels(
    summaryEvidence(data).map((item) => humanEvidenceLabel(item)).filter(Boolean)
  );
  const evidenceText = evidenceLabels.length ? joinHumanList(evidenceLabels) : "source coverage evidence";
  return [
    `This live scan is Unknown coverage, not a Moderate risk claim.`,
    `${scoreCopy.value}: ${scoreCopy.helper} because no direct approval, transfer, or yield-risk evidence was returned by the available sources.`,
    `Missing indexed data remains unknown instead of safe. Evidence available: ${evidenceText}.`
  ].join(" ");
}

function heroDecisionLabel(data: ScanResponse) {
  if (resultKind(data) === "coverage_warning_only") return "Check source coverage";
  const decision = assessmentDecisionLabel(data.assessment).toLowerCase();
  if (decision.includes("approval") || decision.includes("revoke")) return "Review approval evidence";
  if (decision.includes("transfer") || decision.includes("poison")) return "Review transfer evidence";
  if (decision.includes("yield") || decision.includes("exposure")) return "Inspect yield evidence";
  return "Inspect evidence before interacting";
}

function signalSectionTitle(data: ScanResponse, signalCount: number) {
  const kind = resultKind(data);
  if (kind === "coverage_warning_only") return "Coverage warning";
  if (kind === "no_material_signals") return "No direct signals found";
  return "Core on-chain signals";
}

function signalSectionSubtitle(data: ScanResponse, signalCount: number) {
  const kind = resultKind(data);
  if (kind === "coverage_warning_only") return "The live scan returned coverage evidence, not direct approval, transfer, or yield-risk evidence.";
  if (kind === "no_material_signals") return "This scan did not find material direct evidence in the available data.";
  return `${signalCount} evidence-bound signal${signalCount === 1 ? "" : "s"} to inspect before any wallet action.`;
}

function resultKind(data: ScanResponse): "risk_signals" | "coverage_warning_only" | "no_material_signals" {
  const directSignals = [
    findEvidenceBackedApprovalRisk(data),
    findEvidenceBackedTransferRisk(data),
    findEvidenceBackedYieldRisk(data)
  ].filter(Boolean);
  if (directSignals.length) return "risk_signals";
  if (isPartialOrUnknown(data.assessment.dataStatus) || findCoverageRisk(data)) return "coverage_warning_only";
  return "no_material_signals";
}

function proofStatusLabel(data: ScanResponse, providerStatus: ProviderStatus | null, record: CommitRecord | null) {
  return getProofLabel(data.assessment, record, providerStatus).label;
}

function proofHeroLabel(_data: ScanResponse, _providerStatus: ProviderStatus | null, record: CommitRecord | null) {
  return getProofLabel(_data.assessment, record, _providerStatus).label;
}

function proofHeroHint(data: ScanResponse, providerStatus: ProviderStatus | null, record: CommitRecord | null) {
  return getProofLabel(data.assessment, record, providerStatus).helper;
}

function proofViewLabel(data: ScanResponse, record: CommitRecord | null, viewModel?: AssessmentViewModel) {
  return viewModel?.proofActionLabel || buildAssessmentViewModel({ scan: data, commitRecord: record }).proofActionLabel;
}

function recordAssessmentCtaLabel(data: ScanResponse, record: CommitRecord | null, viewModel?: AssessmentViewModel) {
  return viewModel?.recordability.label || buildAssessmentViewModel({ scan: data, commitRecord: record }).recordability.label;
}

function reviewWorkflowTitle(data: ScanResponse, record?: CommitRecord | null, viewModel?: AssessmentViewModel) {
  if (viewModel?.proofStatus === "verified_matched" || viewModel?.proofStatus === "recorded_on_mantle") {
    return "Inspect evidence → Verify assessment → View on-chain proof";
  }
  if (viewModel?.evidenceClass === "coverage_limited_unknown") {
    return "Inspect coverage evidence → Check source coverage → View on-chain proof if recorded";
  }
  return getReviewWorkflow(data.assessment, record);
}

function evidenceNextActionTitle(data: ScanResponse, record?: CommitRecord | null) {
  const simulation = getSimulationAvailability(data.assessment);
  if (!simulation.available) return `${getPrimaryNextStep(data.assessment, record)} first. ${simulation.reason}`;
  return getReviewWorkflow(data.assessment, record);
}

function supportingRecordCount(data: ScanResponse) {
  return (
    (data.inventory?.tokens?.length || 0) +
    (data.history?.approvalHistory?.items?.length || 0) +
    (data.history?.transferHistory?.items?.length || 0)
  );
}

function yieldImpactLabel(risk: RiskItem) {
  const severity = String(risk.severity || "Moderate");
  if (severity.toLowerCase().includes("critical")) return "High";
  if (severity.toLowerCase().includes("high")) return "Elevated";
  return severity;
}

function riskTitle(risk: RiskItem) {
  const title = risk.title || risk.claimText || risk.type;
  if (title.toLowerCase().includes("unlimited") && title.toLowerCase().includes("approval")) return "Unlimited token approval";
  if (title.toLowerCase().includes("dust") || title.toLowerCase().includes("poison")) return "Suspicious dust transfer";
  if (title.toLowerCase().includes("concentration") || risk.type === "concentration") return "Concentrated token exposure";
  if (risk.type === "source_coverage") return "Incomplete source coverage";
  return humanizeIdentifier(title);
}

function plainRiskExplanation(risk: RiskItem) {
  if (risk.explanation) return risk.explanation;
  const normalized = `${risk.title || ""} ${risk.claimText || ""} ${risk.type}`.toLowerCase();
  if (normalized.includes("unlimited") && normalized.includes("approval")) {
    return "This wallet has an unlimited approval to a spender. If the spender is malicious, funds may remain at risk until the approval is reviewed or revoked manually.";
  }
  if (normalized.includes("dust") || normalized.includes("poison")) {
    return "A small or suspicious transfer can be used to confuse wallet history and trick users into copying a lookalike address.";
  }
  if (normalized.includes("concentration") || normalized.includes("meth") || normalized.includes("cmeth")) {
    return "A large share of value appears concentrated in one exposure, so portfolio risk depends heavily on that asset or yield position.";
  }
  if (normalized.includes("source") || normalized.includes("coverage")) {
    return "One or more data sources returned partial or unavailable results. This lowers confidence and must not be treated as safety.";
  }
  return risk.claimText || "Risk claim generated from bound evidence and source-coverage uncertainty.";
}

function summaryEvidence(data: ScanResponse) {
  const topEvidenceIds = new Set(data.assessment.topRisks.flatMap((risk) => risk.evidenceIds || []));
  return data.evidenceBundle.evidence.filter((item) => topEvidenceIds.has(item.evidenceId));
}

function humanEvidenceLabel(item: EvidenceItem) {
  const claim = item.claimText.toLowerCase();
  if (item.type === "approval" || claim.includes("approval")) return "Unlimited approval evidence";
  if (item.type === "transfer" || claim.includes("dust") || claim.includes("transfer")) return "Dust transfer evidence";
  if (isDemoMantleEvidence(item)) return "Demo Mantle yield-like token evidence";
  if (isYieldContextEvidence(item)) return "Yield exposure evidence";
  if (item.type === "balance" || item.type === "inventory") {
    const tokenSymbol = evidenceTokenSymbol(item);
    return tokenSymbol ? `${tokenSymbol} balance evidence` : "Token balance evidence";
  }
  if (item.type === "source_status") return "Source coverage evidence";
  if (item.type === "token_security") return "Token security evidence";
  if (item.type === "commit") return "On-chain proof evidence";
  return `${evidenceTypeLabel(item.type)} evidence`;
}

function evidenceTokenSymbol(item: EvidenceItem) {
  const rawSymbol = item.rawData?.symbol || item.rawData?.token_symbol || item.rawData?.tokenSymbol;
  if (typeof rawSymbol === "string" && rawSymbol.trim() && !isGenericTokenSymbol(rawSymbol)) return rawSymbol.trim();
  const claimMatch = item.claimText.match(/\b([A-Za-z][A-Za-z0-9]{1,15})\s+(?:current\s+|configured-token\s+)?balance\b/i);
  if (claimMatch?.[1] && !isGenericTokenSymbol(claimMatch[1])) return claimMatch[1];
  const idMatch = item.evidenceId.match(/(?:^|_)(mnt|usdc|usdt|musd|meth|cmeth)(?:_|$)/i);
  return idMatch?.[1] ? normalizeTokenSymbol(idMatch[1]) : "";
}

function evidenceTokenAddress(item: EvidenceItem) {
  const raw = item.rawData || {};
  const rawAddress =
    raw.tokenAddress ||
    raw.token_address ||
    raw.address ||
    raw.contractAddress ||
    raw.contract_address;
  if (typeof rawAddress === "string" && rawAddress.startsWith("0x")) return rawAddress;
  const text = `${item.claimText} ${item.endpoint || ""} ${item.evidenceId}`;
  return text.match(/0x[a-fA-F0-9]{40}/)?.[0] || "";
}

function isDemoMantleEvidence(item: EvidenceItem) {
  const text = `${item.type} ${item.evidenceId} ${item.claimText} ${item.endpoint || ""} ${JSON.stringify(item.rawData || {})}`.toLowerCase();
  return isDemoMantleYieldLikeToken(evidenceTokenSymbol(item), evidenceTokenAddress(item)) || text.includes("mldt");
}

function isOfficialMantleYieldEvidence(item: EvidenceItem) {
  const symbol = evidenceTokenSymbol(item);
  const text = `${item.type} ${item.evidenceId} ${item.claimText} ${item.endpoint || ""}`.toLowerCase();
  return (symbol.toLowerCase() === "meth" || symbol.toLowerCase() === "cmeth" || text.includes("meth") || text.includes("cmeth")) && !isDemoMantleEvidence(item);
}

function isYieldContextEvidence(item: EvidenceItem) {
  const text = `${item.type} ${item.evidenceId} ${item.claimText} ${item.endpoint || ""}`.toLowerCase();
  return text.includes("rwa") || text.includes("yield");
}

function isGenericTokenSymbol(value: string) {
  return ["token", "native", "known", "configured", "current", "wallet"].includes(value.trim().toLowerCase());
}

function normalizeTokenSymbol(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "meth") return "mETH";
  if (normalized === "cmeth") return "cmETH";
  if (normalized === "musd") return "mUSD";
  return value.toUpperCase();
}

function evidenceTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "balance") return "Inventory";
  if (normalized.includes("rwa") || normalized.includes("yield")) return "Yield exposure";
  if (normalized === "source_status") return "Source coverage";
  if (normalized === "token_security") return "Token security";
  return humanizeIdentifier(type);
}

function evidenceSourceMode(data: ScanResponse, item: EvidenceItem) {
  if (data.assessment.dataMode !== "live") return "Demo replay";
  const source = `${item.source} ${item.endpoint || ""}`.toLowerCase();
  if (source.includes("rpc") || source.includes("allowance") || source.includes("balanceof")) return "Live RPC read";
  if (source.includes("etherscan") || source.includes("mantlescan") || source.includes("moralis")) return "Explorer indexed log";
  if (source.includes("goplus")) return "GoPlus signal";
  if (source.includes("coingecko") || source.includes("defillama")) return "Price source";
  return "Live evidence record";
}

function evidenceModeSummary(data: ScanResponse) {
  return data.assessment.dataMode === "live" ? "Live Mantle Sepolia" : "Demo replay";
}

function fixtureAwareTxLabel(data: ScanResponse, value?: string | null) {
  if (!value) return "Not available";
  if (data.assessment.dataMode !== "live") return "Demo-only reference, not an explorer transaction";
  return shortRecordId(String(value));
}

function approvalRowTitle(item: Record<string, unknown>) {
  const token = String(item.token || item.tokenAddress || "token");
  if (item.isActive && item.isUnlimited) return `Active unlimited approval · ${token}`;
  if (item.isActive) return `Active approval · ${token}`;
  return `Approval history · ${token}`;
}

function transferRowTitle(item: Record<string, unknown>) {
  const token = String(item.token || item.tokenAddress || "token");
  const pattern = String(item.pattern || item.transferType || "");
  if (pattern.toLowerCase().includes("poison") || pattern.toLowerCase().includes("dust")) return `Suspicious dust transfer · ${token}`;
  return `Transfer evidence · ${token}`;
}

function scoreMetricLabel(metricId: string, fallback: string) {
  const normalized = `${metricId} ${fallback}`.toLowerCase();
  if (normalized.includes("approval")) return "Approval risk";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Suspicious transfer risk";
  if (normalized.includes("concentration")) return "Yield-token concentration";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Source uncertainty";
  if (normalized.includes("yield") || normalized.includes("rwa") || normalized.includes("defi")) return "DeFi / yield exposure";
  return humanizeIdentifier(fallback || metricId);
}

type ScoreMetricDisplayInput = {
  metricId: string;
  label: string;
  score: number;
  weight: number;
  weightedContribution: number;
  severity: string;
};

type ScoreMetricDisplay = ScoreMetricDisplayInput & {
  displayLabel: string;
  metricIds: string[];
};

function scoreBreakdownDisplayMetrics(rawMetrics: ScoreMetricDisplayInput[]): ScoreMetricDisplay[] {
  const grouped = new Map<string, ScoreMetricDisplay>();
  for (const metric of rawMetrics) {
    const displayLabel = scoreMetricLabel(metric.metricId, metric.label);
    const key = displayLabel.toLowerCase();
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...metric,
        metricId: key,
        displayLabel,
        metricIds: [metric.metricId]
      });
      continue;
    }
    existing.score = Math.max(existing.score, metric.score);
    existing.weight += metric.weight;
    existing.weightedContribution += metric.weightedContribution;
    existing.severity = higherSeverity(existing.severity, metric.severity);
    existing.metricIds = uniqueLabels([...existing.metricIds, metric.metricId]);
  }
  return Array.from(grouped.values()).sort((left, right) => Math.abs(right.weightedContribution) - Math.abs(left.weightedContribution));
}

function higherSeverity(left: string, right: string) {
  return severityRank(right) > severityRank(left) ? right : left;
}

function severityRank(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("critical")) return 4;
  if (normalized.includes("high")) return 3;
  if (normalized.includes("moderate") || normalized.includes("medium")) return 2;
  if (normalized.includes("low")) return 1;
  return 0;
}

function scoreMetricDetailLabel(metricId: string) {
  const normalized = metricId.toLowerCase();
  if (normalized.includes("rwa")) return "Mantle yield asset signal";
  if (normalized.includes("defi")) return "DeFi exposure signal";
  if (normalized.includes("approval")) return "Approval signal";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Transfer pattern signal";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Source coverage signal";
  return humanizeIdentifier(metricId);
}

function sourceStatusCounts(sourceAvailability: ScanResponse["coverage"]["sourceAvailability"]) {
  const counts = { available: 0, partial: 0, unavailable: 0 };
  Object.values(sourceAvailability || {}).forEach((source) => {
    const category = sourceStatusCategory(source.status);
    counts[category] += 1;
  });
  return counts;
}

function displaySourceStatuses(sourceAvailability: ScanResponse["coverage"]["sourceAvailability"]) {
  const rank: Record<ReturnType<typeof sourceStatusCategory>, number> = {
    available: 1,
    partial: 2,
    unavailable: 3
  };
  const merged = new Map<string, { name: string; status: string }>();
  Object.entries(sourceAvailability || {}).forEach(([rawName, source]) => {
    const name = sourceDisplayName(rawName);
    const existing = merged.get(name);
    if (!existing || rank[sourceStatusCategory(source.status)] > rank[sourceStatusCategory(existing.status)]) {
      merged.set(name, { name, status: source.status });
    }
  });
  return Array.from(merged.values());
}

function sourceStatusCategory(status: string): "available" | "partial" | "unavailable" {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "available") return "available";
  if (normalized.includes("partial") || normalized.includes("unknown") || normalized.includes("limited")) return "partial";
  return "unavailable";
}

function buildEvidenceAuditGroups(data: ScanResponse): EvidenceAuditGroup[] {
  const evidenceById = new Map(data.evidenceBundle.evidence.map((item) => [item.evidenceId, item]));
  return buildCoreSignals(data).map((signal) => {
    const risk = signal.risk;
    const items = evidenceIdsForRisk(risk)
      .map((id) => evidenceById.get(id))
      .filter((item): item is EvidenceItem => Boolean(item));
    return { signal, risk, items };
  });
}

function evidenceIdsForRisk(risk: RiskItem) {
  return uniqueLabels([...(risk.evidenceIds || []), ...(risk.evidence_ids || [])]);
}

function findApprovalDetail(data: ScanResponse, evidenceId: string) {
  return data.history?.approvalHistory?.items?.find((item) => rowHasEvidence(item, evidenceId));
}

function findTransferDetail(data: ScanResponse, evidenceId: string) {
  return data.history?.transferHistory?.items?.find((item) => rowHasEvidence(item, evidenceId));
}

function findInventoryDetail(data: ScanResponse, evidenceId: string) {
  return data.inventory?.tokens?.find((token) => rowHasEvidence(token, evidenceId));
}

function rowHasEvidence(row: { evidenceId?: string; evidenceIds?: string[] }, evidenceId: string) {
  return row.evidenceId === evidenceId || Boolean(row.evidenceIds?.includes(evidenceId));
}

function riskDataQuality(data: ScanResponse, risk: RiskItem) {
  const status = risk.sourceStatus || risk.source_status || data.assessment.dataStatus;
  return coverageDisplayLabel(status, data.assessment.dataMode);
}

function evidenceDataQuality(data: ScanResponse, item: EvidenceItem) {
  if (data.assessment.dataMode !== "live") return `Replay fixture / ${coverageDisplayLabel(data.assessment.dataStatus, data.assessment.dataMode)}`;
  return coverageDisplayLabel(data.assessment.dataStatus, data.assessment.dataMode);
}

function evidenceVerificationLabel(item: EvidenceItem, approval?: ApprovalItem, transfer?: TransferItem, inventory?: TokenItem) {
  if (isApprovalEvidence(item, approval)) {
    return item.allowanceConfirmed || approval?.allowanceConfirmed || approval?.isActive
      ? "Active allowance confirmed"
      : "Allowance check not confirmed";
  }
  if (isTransferEvidence(item, transfer)) {
    return item.txHash || transfer?.txHash ? "Transfer tx observed" : "Transfer pattern unresolved";
  }
  if (inventory || item.type === "balance" || item.type === "inventory") return "Known-token balance observed";
  if (item.type === "source_status") return "Source status recorded";
  return "Evidence record resolved";
}

function evidenceVerificationSummary(item: EvidenceItem, approval?: ApprovalItem, transfer?: TransferItem, inventory?: TokenItem) {
  if (isApprovalEvidence(item, approval)) return "Verifies the active allowance state and spender context.";
  if (isTransferEvidence(item, transfer)) return "Verifies the transfer pattern, counterparty, and transaction record.";
  if (inventory || item.type === "balance" || item.type === "inventory") return "Verifies the known-token balance used by the risk claim.";
  if (item.type === "source_status") return "Verifies source availability and coverage limits for this scan.";
  return "Verifies a supporting fact used by the risk engine.";
}

function evidenceTransactionFact(data: ScanResponse, item: EvidenceItem, approval?: ApprovalItem, transfer?: TransferItem) {
  const transferTx = item.txHash || transfer?.txHash;
  if (isTransferEvidence(item, transfer)) {
    return transferTx
      ? {
          label: data.assessment.dataMode === "live" ? "Tx hash" : "Replay reference",
          value: fixtureAwareTxLabel(data, transferTx)
        }
      : { label: "Transaction", value: "Indexed transfer tx unavailable" };
  }
  if (isApprovalEvidence(item, approval)) {
    const approvalTx = item.txHash || approval?.txHash;
    return approvalTx
      ? {
          label: data.assessment.dataMode === "live" ? "Related approval tx" : "Replay reference",
          value: fixtureAwareTxLabel(data, approvalTx)
        }
      : { label: "Transaction", value: "Read call · no tx hash" };
  }
  if (isReadOnlyEvidence(item)) return { label: "Transaction", value: "Read call · no tx hash" };
  if (item.txHash) return { label: "Related tx", value: shortRecordId(item.txHash) };
  return null;
}

function isReadOnlyEvidence(item: EvidenceItem) {
  const method = `${item.endpoint || ""} ${evidenceMethod(item)} ${item.type}`.toLowerCase();
  return method.includes("balanceof") || method.includes("allowance") || method.includes("read call") || method.includes("source coverage");
}

function riskLimitation(risk: RiskItem) {
  const limitation = risk.limitations?.[0] || risk.unknowns?.find((item) => isLimitationText(item));
  if (limitation) return limitation;
  const text = `${risk.type} ${risk.category || ""} ${risk.claimText}`.toLowerCase();
  if (text.includes("mldt")) return getMantleTokenLimitation("MLDT");
  if (text.includes("approval") || text.includes("allowance")) return "known-token scan / bounded logs";
  if (text.includes("transfer") || text.includes("poison") || text.includes("dust")) return "bounded wallet history / indexed logs may be partial";
  if (text.includes("meth") || text.includes("cmeth")) return getMantleTokenLimitation(text.includes("cmeth") ? "cmETH" : "mETH");
  if (text.includes("concentration") || text.includes("yield")) return "This is not yield or investment advice.";
  return "Source coverage may be partial; missing signals are unknown, not safe.";
}

function evidenceLimitation(item: EvidenceItem, risk: RiskItem) {
  if (item.limitation) return item.limitation;
  if (isDemoMantleEvidence(item)) return getMantleTokenLimitation(evidenceTokenSymbol(item), evidenceTokenAddress(item));
  if (isApprovalEvidence(item)) return "known-token scan / bounded logs";
  if (isTransferEvidence(item)) return "bounded wallet history / indexed logs may be partial";
  if (isOfficialMantleYieldEvidence(item)) return getMantleTokenLimitation(evidenceTokenSymbol(item), evidenceTokenAddress(item));
  return riskLimitation(risk);
}

function evidenceMethod(item: EvidenceItem) {
  const claim = item.claimText.toLowerCase();
  if (isApprovalEvidence(item)) return "ERC20.allowance(owner, spender)";
  if (isTransferEvidence(item)) return item.endpoint || "Transfer log / indexed wallet history";
  if (item.type === "balance" || item.type === "inventory" || claim.includes("balance")) return item.endpoint || "Known-token balance inventory";
  if (item.type === "source_status") return item.endpoint || "Source coverage check";
  if (isYieldContextEvidence(item)) return "Rule-based yield exposure check";
  return item.endpoint || "Evidence resolver";
}

function evidenceTimestamp(item: EvidenceItem, detail?: ApprovalItem | TransferItem) {
  if (item.timestamp) return item.timestamp;
  if (detail?.timestamp) return detail.timestamp;
  if (detail?.observedAt) return detail.observedAt;
  const block = item.blockNumber || detail?.blockNumber;
  return block ? `Block ${block}` : "";
}

function evidenceHash(item: EvidenceItem) {
  const explicit = (item as unknown as Record<string, unknown>).evidenceHash;
  if (typeof explicit === "string" && explicit) return explicit;
  return `0x${hashEvidencePayload(item)}`;
}

function hashEvidencePayload(item: EvidenceItem) {
  const payload = JSON.stringify(item);
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isApprovalEvidence(item: EvidenceItem, approval?: ApprovalItem) {
  const claim = item.claimText.toLowerCase();
  return Boolean(approval) || item.type === "approval" || claim.includes("approval") || claim.includes("allowance");
}

function isTransferEvidence(item: EvidenceItem, transfer?: TransferItem) {
  const claim = item.claimText.toLowerCase();
  return Boolean(transfer) || item.type === "transfer" || claim.includes("transfer") || claim.includes("dust") || claim.includes("poison");
}

function approvalConfirmedLabel(item: EvidenceItem, approval?: ApprovalItem) {
  if (item.allowanceConfirmed || approval?.allowanceConfirmed || approval?.isActive) return "Yes";
  return "Not confirmed in this scan";
}

function approvalUsdAtRisk(_data: ScanResponse, inventory?: TokenItem) {
  if (typeof inventory?.valueUsd === "number" && Number.isFinite(inventory.valueUsd)) return formatUsd(inventory.valueUsd);
  return "Not available in this scan";
}

function transferPatternLabel(transfer?: TransferItem) {
  const raw = String(transfer?.pattern || transfer?.transferType || "").toLowerCase();
  if (raw.includes("poison") || raw.includes("dust") || raw.includes("lookalike")) return "dust / lookalike / address poisoning candidate";
  return raw ? humanizeIdentifier(raw) : "dust / lookalike / address poisoning candidate";
}

function unknownFieldsLabel(risk: RiskItem) {
  const normalized = `${risk.type} ${risk.category || ""} ${risk.claimText} ${risk.explanation || ""}`.toLowerCase();
  const explicit = risk.unknowns?.filter((item) => !isLimitationText(item)).map((item) => unknownFieldDisplay(item)).filter(Boolean) || [];
  if (explicit.length) return uniqueLabels(explicit).slice(0, 2).join(", ");
  if (normalized.includes("approval") || normalized.includes("spender")) return "spender label";
  if (normalized.includes("source") || normalized.includes("coverage")) return "source completeness";
  if (normalized.includes("transfer") || normalized.includes("poison") || normalized.includes("dust")) return "counterparty intent";
  if (normalized.includes("concentration") || normalized.includes("yield") || normalized.includes("meth")) return "liquidity depth unavailable";
  return "none flagged";
}

function isLimitationText(value: string) {
  const normalized = String(value || "").toLowerCase();
  return (
    normalized.includes("not advice") ||
    normalized.includes("investment advice") ||
    normalized.includes("yield advice") ||
    normalized.includes("disclaimer") ||
    normalized.includes("bounded") ||
    normalized.includes("may miss") ||
    normalized.includes("may be partial")
  );
}

function unknownFieldDisplay(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("fulltokeninventory") || normalized.includes("full token inventory")) {
    return "full token inventory";
  }
  if (normalized.includes("spender")) return "spender label";
  if (normalized.includes("source") || normalized.includes("coverage")) return "source completeness";
  if (normalized.includes("liquidity")) return "liquidity depth unavailable";
  if (normalized.includes("counterparty")) return "counterparty intent";
  if (normalized.includes("portfolio") || normalized.includes("inventory")) return "full portfolio coverage";
  return humanizeIdentifier(value).toLowerCase();
}

function inventorySourceLabel(token: TokenItem) {
  const source = token.balanceSource || token.candidateSource;
  if (!source) return "Balance source: known-token inventory";
  if (source.toLowerCase() === "rpc") return "Balance source: Mantle RPC";
  return `Balance source: ${sourceDisplayName(source)}`;
}

function inventoryPriceLabel(token: TokenItem) {
  if (typeof token.valueUsd === "number" && Number.isFinite(token.valueUsd)) return `Known value: ${formatUsd(token.valueUsd)}`;
  return "Price unavailable";
}

function inventoryBadgeLabel(token: TokenItem) {
  const status = String(token.securityStatus || "").toLowerCase();
  if (!status || status === "unknown") {
    if (typeof token.valueUsd !== "number" || !Number.isFinite(token.valueUsd)) return "Price unavailable";
    return "Known token";
  }
  if (status.includes("clean")) return "Known token";
  if (status.includes("unverified")) return "Risk label unverified";
  return humanizeIdentifier(status);
}

function historyEvidenceLabel(type: "approval" | "transfer", item: Record<string, unknown>) {
  if (type === "approval") {
    if (item.allowanceConfirmed || item.isActive) return "Evidence: active allowance confirmed";
    return "Evidence: approval history row";
  }
  const pattern = transferPatternLabel(item as TransferItem);
  return `Evidence: ${pattern}`;
}

function coverageDisplayLabel(status: string, mode?: string) {
  return copyCoverageLabel(status, mode);
}

function formatScanTimestamp(value: string) {
  if (!value || value === "Current scan") return "Current scan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 0 : 2 });
}

function coverageLabel(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("partial") || normalized.includes("unknown")) return "Partial";
  if (normalized.includes("safe")) return "Complete";
  if (normalized.includes("error")) return "Error";
  return statusLabel(status);
}

function sourceDisplayName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("fulltokeninventory") || normalized.includes("full token inventory")) return "Full token inventory is unavailable, so unknown tokens may be missing from this scan.";
  if (normalized.includes("rwayieldexposure") || normalized.includes("rwa_yield")) return "Yield exposure data";
  if (normalized.includes("coingecko")) return "CoinGecko";
  if (normalized.includes("defillama")) return "DeFiLlama";
  if (normalized.includes("goplus")) return "GoPlus";
  if (normalized.includes("mantle") && normalized.includes("rpc")) return "Mantle RPC";
  if (normalized.includes("moralis") && (normalized.includes("balance") || normalized.includes("token"))) return "Moralis balances";
  if (normalized.includes("moralis") && (normalized.includes("history") || normalized.includes("transfer") || normalized.includes("wallet"))) {
    return "Moralis wallet history";
  }
  if (normalized.includes("moralis")) return "Moralis";
  if (normalized.includes("etherscan")) return "Etherscan V2";
  if (normalized.includes("mantlescan")) return "Mantlescan";
  return humanizeIdentifier(name);
}

function sourceStatusLabel(status: string) {
  return copySourceStatusLabel(status);
}

function groupHistoryRecords(records: NonNullable<WalletHistoryResponse["records"]>) {
  const groups: Array<{ record: (typeof records)[number]; count: number; key: string }> = [];
  for (const record of records) {
    const key = [
      record.mode,
      record.benchmarkCaseId || record.fixtureId || "",
      record.chainId,
      record.riskScore,
      record.riskLevel,
      record.status,
      record.topRiskSummaries.map((risk) => risk.riskId).sort().join("|"),
      record.commitTxHash || ""
    ].join("::");
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({ record, count: 1, key });
    }
  }
  return groups;
}

function selectAssessmentGroups(groups: ReturnType<typeof groupHistoryRecords>) {
  const sorted = [...groups].sort((left, right) => historyRecordTime(right.record) - historyRecordTime(left.record));
  const selected: Array<{ record: HistoryRecord; count: number; key: string; label: string }> = [];
  const addGroup = (group: (typeof sorted)[number] | undefined, label: string) => {
    if (!group || selected.some((item) => item.record.historyRecordId === group.record.historyRecordId)) return;
    selected.push({ ...group, label });
  };
  const latest = sorted[0];
  const previous = sorted[1];
  addGroup(latest, "Latest assessment");
  addGroup(previous, "Previous assessment");
  const latestChangeKey = latest ? recordChangeKey(latest.record) : "";
  const changed = sorted.find((group) => group !== latest && group !== previous && recordChangeKey(group.record) !== latestChangeKey);
  addGroup(changed, "Last changed assessment");
  return selected;
}

function newestHistoryRecord(records: HistoryRecord[]) {
  return [...records].sort((left, right) => historyRecordTime(right) - historyRecordTime(left))[0];
}

function latestTrendPoint(trend: Trend) {
  return [...trend.points].sort((left, right) => Date.parse(right.timestamp || "") - Date.parse(left.timestamp || ""))[0] || trend.points[trend.points.length - 1] || null;
}

function historyRecordTime(record: HistoryRecord) {
  const parsed = Date.parse(record.scanTimestamp || record.createdAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordChangeKey(record: HistoryRecord) {
  return [
    record.riskScore,
    record.riskLevel,
    record.status,
    recordProofStatusLabel(record),
    recordTopRiskLabels(record)
  ].join("::");
}

function benchmarkResultFromScan(benchmarkCase: BenchmarkCase, data: ScanResponse, proofStatus: string): BenchmarkCaseResult {
  return {
    caseId: benchmarkCase.id,
    caseLabel: benchmarkCase.label,
    fixtureId: benchmarkCase.fixtureId,
    score: data.assessment.walletRiskScore,
    riskLevel: data.assessment.riskLevel,
    decision: assessmentDecisionLabel(data.assessment),
    coverage: benchmarkCoverageLabel(data.assessment.dataStatus),
    proofStatus: data.assessment.dataMode === "live" ? proofStatus : "Replay proof only",
    assessmentHash: data.assessment.assessmentHash,
    scanTimestamp: data.assessment.timestamp,
  };
}

function benchmarkResultsFromHistory(history: WalletHistoryResponse | null) {
  const results: Record<string, BenchmarkCaseResult> = {};
  for (const record of history?.records || []) {
    const caseId = record.benchmarkCaseId || benchmarkCaseIdFromFixture(record.fixtureId || "");
    if (!caseId || results[caseId]) continue;
    results[caseId] = benchmarkResultFromRecord(record, caseId);
  }
  return results;
}

function benchmarkResultFromRecord(record: HistoryRecord, caseId: string): BenchmarkCaseResult {
  const benchmarkCase = benchmarkCases.find((item) => item.id === caseId);
  return {
    caseId,
    caseLabel: record.benchmarkCaseLabel || benchmarkCase?.label || benchmarkCaseLabel(record).replace("Demo scenario: ", ""),
    fixtureId: record.fixtureId || benchmarkCase?.fixtureId || "",
    score: Number(record.riskScore) || 0,
    riskLevel: record.riskLevel,
    decision: agentDecisionLabel(record),
    coverage: recordCoverageLabel(record),
    proofStatus: recordProofStatusLabel(record),
    proofUrl: record.commitExplorerUrl || undefined,
    assessmentHash: record.assessmentHash || "",
    scanTimestamp: record.scanTimestamp,
  };
}

function benchmarkCaseIdFromFixture(fixtureId: string) {
  return benchmarkCases.find((item) => item.fixtureId === fixtureId)?.id || null;
}

function benchmarkCoverageLabel(status: string) {
  return copyCoverageLabel(status);
}

function benchmarkMatrixProofLabel(value: string) {
  return value === "Replay only" || value === "Replay proof only" ? "Replay proof only" : value;
}

function benchmarkOptionLabel(benchmarkCase: BenchmarkCase) {
  const riskLabel = benchmarkOptionRiskLabel(benchmarkCase);
  const scoreLabel = benchmarkOptionScoreLabel(benchmarkCase);
  return [benchmarkCase.label, riskLabel, scoreLabel, benchmarkCase.signalFocus].filter(Boolean).join(" · ");
}

function benchmarkOptionRiskLabel(benchmarkCase: BenchmarkCase) {
  if (benchmarkCase.id === "approval_anomaly") return "Moderate";
  if (benchmarkCase.id === "address_poisoning") return "Moderate";
  if (benchmarkCase.id === "yield_concentration") return "Low";
  if (benchmarkCase.id === "partial_coverage") return "Unknown";
  if (benchmarkCase.id === "quiet_wallet") return "Insufficient data";
  return benchmarkCase.expectedRiskLevel;
}

function benchmarkOptionScoreLabel(benchmarkCase: BenchmarkCase) {
  if (benchmarkCase.id === "partial_coverage" || benchmarkCase.id === "quiet_wallet") return "";
  return `${benchmarkCase.expectedScore} / 100`;
}

function benchmarkDecisionChip(decision: string) {
  const normalized = decision.toLowerCase();
  if (normalized.includes("pause")) return "Pause";
  if (normalized.includes("approval")) return "Review approval";
  if (normalized.includes("coverage")) return "Check coverage";
  if (normalized.includes("monitor")) return "Monitor";
  return decision;
}

function benchmarkEvidenceChip(benchmarkCase: BenchmarkCase) {
  const first = benchmarkCase.evidenceTypes[0] || "Evidence";
  const extra = benchmarkCase.evidenceTypes.length - 1;
  return extra > 0 ? `${first} +${extra}` : first;
}

function recordTopRiskLabels(record?: HistoryRecord) {
  if (!record?.topRiskSummaries?.length) return "No top risks recorded";
  if (isUnknownCoverageRecord(record)) return "Source coverage warning";
  const labels = uniqueLabels(
    record.topRiskSummaries.map((risk) => riskSignalLabel(`${risk.title} ${risk.category} ${risk.riskId}`))
  );
  return labels.slice(0, 3).join(" · ") || "No top risks recorded";
}

function benchmarkCaseLabel(record?: HistoryRecord, point?: TrendPoint) {
  if (record?.benchmarkCaseLabel) return `Demo scenario: ${record.benchmarkCaseLabel}`;
  if (record?.benchmarkCaseId) {
    const benchmarkCase = benchmarkCases.find((item) => item.id === record.benchmarkCaseId);
    if (benchmarkCase) return `Demo scenario: ${benchmarkCase.label}`;
  }
  if (record?.fixtureId) {
    const benchmarkCase = benchmarkCases.find((item) => item.fixtureId === record.fixtureId);
    if (benchmarkCase) return `Demo scenario: ${benchmarkCase.label}`;
  }
  const text = `${record?.mode || ""} ${record?.riskLevel || point?.riskLevel || ""} ${recordTopRiskLabels(record)} ${(point?.topRiskIds || []).join(" ")}`.toLowerCase();
  if (isDemoMode(record?.mode)) {
    if (text.includes("critical")) return "Demo scenario: critical risk case";
    if (text.includes("approval") && text.includes("transfer")) return "Demo scenario: multi-signal wallet";
    if (text.includes("approval")) return "Demo scenario: approval anomaly";
    if (text.includes("poison") || text.includes("transfer")) return "Demo scenario: address poisoning";
    if (text.includes("yield") || text.includes("concentration") || text.includes("meth")) return "Demo scenario: yield concentration";
    return "Demo scenario: reference wallet";
  }
  return `Live Mantle Sepolia wallet${record?.walletAddress ? ` · ${shortAddress(record.walletAddress)}` : ""}`;
}

function agentDecisionLabel(record?: HistoryRecord, point?: TrendPoint) {
  const level = String(record?.riskLevel || point?.riskLevel || "").toLowerCase();
  const risks = `${recordTopRiskLabels(record)} ${(point?.topRiskIds || []).join(" ")}`.toLowerCase();
  if (level.includes("critical")) return "Pause and review evidence before interaction";
  if (risks.includes("approval")) return "Review approval before interacting";
  if (risks.includes("poison") || risks.includes("transfer")) return "Review transfer evidence before copying addresses";
  if (risks.includes("coverage") || String(record?.status || point?.dataStatus || "").toLowerCase().includes("partial")) return "Treat missing data as unknown";
  if (level.includes("low")) return "Continue monitoring; residual risk remains";
  return "Review evidence before taking action";
}

function assessmentDecisionLabel(assessment: ScanResponse["assessment"]) {
  const raw = `${(assessment as unknown as Record<string, unknown>).decisionType || ""} ${(assessment as unknown as Record<string, unknown>).actionType || ""}`;
  const normalized = `${raw} ${assessment.riskLevel} ${assessment.topRisks.map((risk) => `${risk.title} ${risk.type} ${risk.category}`).join(" ")}`.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("pause")) return "Pause and review evidence";
  if (normalized.includes("approval") || normalized.includes("revoke")) return "Review approval · simulate revoke";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Review transfer evidence";
  if (normalized.includes("coverage") || normalized.includes("partial") || normalized.includes("unknown")) return "Check source coverage";
  if (normalized.includes("low") || normalized.includes("safe")) return "Continue monitoring";
  return "Review evidence";
}

function trendPointTopRisksLabel(point: TrendPoint, record?: HistoryRecord) {
  if (record?.topRiskSummaries?.length) return recordTopRiskLabels(record);
  if (isUnknownCoverageTrendPoint(point)) return "Source coverage warning";
  if (!point.topRiskIds.length) return "No top risks recorded";
  return uniqueLabels(point.topRiskIds.map(riskIdDisplayLabel)).slice(0, 3).join(" · ");
}

function recordRecommendationLabel(record?: HistoryRecord) {
  if (isUnknownCoverageRecord(record)) return "Check source coverage";
  const text = record?.topRiskSummaries?.map((risk) => `${risk.title} ${risk.category} ${risk.riskId}`).join(" ").toLowerCase() || "";
  if (text.includes("approval") || text.includes("spender")) return "Review spender · simulate revoke impact";
  if (text.includes("transfer") || text.includes("poison") || text.includes("dust")) return "Review evidence · mark suspicious";
  if (text.includes("concentration") || text.includes("yield") || text.includes("meth") || text.includes("cmeth")) return "Simulate lower exposure";
  if (text.includes("source") || text.includes("coverage")) return "Check source coverage";
  return "Review evidence before taking action";
}

function recordStatusLabel(record?: HistoryRecord, viewModel?: AssessmentViewModel | null, currentAssessmentId?: string, currentProofRecordId?: string) {
  if (recordHasCurrentVerifiedProof(record, viewModel, currentAssessmentId, currentProofRecordId)) return "AssessmentRecorded";
  if (recordUsesLatestProofButIsNotCurrent(record, viewModel, currentAssessmentId, currentProofRecordId)) return "Historical local record";
  return copyRecordStatusLabel(record);
}

function recordOutcomeLabel(record?: HistoryRecord, duplicateCount = 1) {
  return copyOutcomeLabel(record, duplicateCount);
}

function trendPointOutcomeLabel(point: TrendPoint, record?: HistoryRecord) {
  if (record) return recordOutcomeLabel(record);
  if (isPartialOrUnknown(point.dataStatus)) return "Pending review";
  return "Pending review";
}

function recordCoverageLabel(record?: HistoryRecord, fallbackStatus?: string) {
  return copyCoverageLabel(record?.status || fallbackStatus, record?.mode);
}

function recordRiskLevelLabel(record?: HistoryRecord) {
  if (!record) return "Pending review";
  if (isUnknownCoverageRecord(record)) return "Unknown coverage";
  return record.riskLevel;
}

function trendPointRiskLevelLabel(point: TrendPoint, record?: HistoryRecord) {
  if (record) return recordRiskLevelLabel(record);
  if (isUnknownCoverageTrendPoint(point)) return "Unknown coverage";
  return point.riskLevel;
}

function recordProofStatusLabel(record?: HistoryRecord, viewModel?: AssessmentViewModel | null, currentAssessmentId?: string, currentProofRecordId?: string) {
  if (recordHasCurrentVerifiedProof(record, viewModel, currentAssessmentId, currentProofRecordId)) return "Recorded on Mantle Sepolia";
  if (recordUsesLatestProofButIsNotCurrent(record, viewModel, currentAssessmentId, currentProofRecordId)) return "Not recorded on-chain";
  if (isLiveHistoryRecord(record)) {
    if (record?.commitTxHash || record?.commitStatus === "recorded" || record?.commitVerificationStatus === "verified") {
      return "Recorded on Mantle Sepolia";
    }
    if (String(record?.commitStatus || "").includes("pending_retry")) return "Pending";
    return "Not recorded on-chain";
  }
  if (record?.commitTxHash || record?.commitStatus === "recorded") return "Recorded on Mantle Sepolia";
  if (String(record?.commitStatus || "").includes("pending_retry")) return "Pending";
  if (!record) return "Not recorded on-chain";
  if (isBenchmarkRecord(record)) return "Replay proof only";
  return "Not recorded on-chain";
}

function recordReplayProofLabel(record?: HistoryRecord, viewModel?: AssessmentViewModel | null, currentAssessmentId?: string, currentProofRecordId?: string) {
  if (!record) return "Unavailable";
  if (recordHasCurrentVerifiedProof(record, viewModel, currentAssessmentId, currentProofRecordId)) return "Recorded on Mantle Sepolia";
  if (recordUsesLatestProofButIsNotCurrent(record, viewModel, currentAssessmentId, currentProofRecordId)) return "Not recorded on-chain";
  if (isLiveHistoryRecord(record)) {
    if (record.commitTxHash || record.commitStatus === "recorded" || record.commitVerificationStatus === "verified") {
      return "Recorded on Mantle Sepolia";
    }
    return "Not recorded on-chain";
  }
  if (isBenchmarkRecord(record)) return "Replay proof only";
  if (record.commitTxHash || record.commitStatus === "recorded") return "Recorded on Mantle Sepolia";
  return "Not recorded on-chain";
}

function historyProofSummary(record?: HistoryRecord, viewModel?: AssessmentViewModel | null) {
  if (viewModel?.proofStatus === "verified_matched" || viewModel?.recordStatus === "recorded_on_mantle") return "Recorded on Mantle Sepolia";
  if (record?.commitTxHash || record?.commitStatus === "recorded") return "Recorded";
  if (String(record?.commitStatus || "").includes("pending")) return "Pending";
  return "Not recorded";
}

function recordProofAction(
  record: HistoryRecord | undefined,
  onViewProof: () => void,
  testId: string,
  viewModel?: AssessmentViewModel | null,
  currentAssessmentId?: string,
  currentProofRecordId?: string
) {
  if (recordUsesLatestProofButIsNotCurrent(record, viewModel, currentAssessmentId, currentProofRecordId)) {
    return null;
  }
  if (record?.commitTxHash && record.commitExplorerUrl) {
    return (
      <a className="proof-inline-action" data-testid={testId} href={record.commitExplorerUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={14} />
        View on-chain proof
      </a>
    );
  }
  const status = recordProofStatusLabel(record, viewModel, currentAssessmentId, currentProofRecordId);
  if (recordHasCurrentVerifiedProof(record, viewModel, currentAssessmentId, currentProofRecordId)) {
    return <InlineProofAction testId={testId} onClick={onViewProof} label="View on-chain proof" />;
  }
  const label = isBenchmarkRecord(record) ? "View replay proof" : status === "Pending" ? "View proof status" : "Record assessment hash";
  return <InlineProofAction testId={testId} onClick={onViewProof} label={label} />;
}

function recordHasCurrentVerifiedProof(record?: HistoryRecord, viewModel?: AssessmentViewModel | null, _currentAssessmentId?: string, currentProofRecordId?: string) {
  if (!record || !viewModel) return false;
  if (!isLiveHistoryRecord(record)) return false;
  if (!(viewModel.proofStatus === "verified_matched" || viewModel.recordStatus === "recorded_on_mantle")) return false;
  return Boolean(currentProofRecordId && record.historyRecordId === currentProofRecordId);
}

function recordUsesLatestProofButIsNotCurrent(record?: HistoryRecord, viewModel?: AssessmentViewModel | null, currentAssessmentId?: string, currentProofRecordId?: string) {
  if (!record || !viewModel || !isLiveHistoryRecord(record)) return false;
  if (recordHasCurrentVerifiedProof(record, viewModel, currentAssessmentId, currentProofRecordId)) return false;
  if (!record.commitTxHash || !viewModel.currentAssessmentTx) return false;
  return record.commitTxHash.toLowerCase() === viewModel.currentAssessmentTx.toLowerCase();
}

function assessmentRecordCountLabel(count: number) {
  return `${count} assessment record${count === 1 ? "" : "s"}`;
}

function riskSignalLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("approval") || normalized.includes("allowance") || normalized.includes("spender")) return "Approval anomaly";
  if (normalized.includes("transfer") || normalized.includes("poison") || normalized.includes("dust")) return "Address poisoning signal";
  if (normalized.includes("concentration") || normalized.includes("yield") || normalized.includes("meth") || normalized.includes("cmeth")) return "Yield concentration signal";
  if (
    normalized.includes("source") ||
    normalized.includes("coverage") ||
    normalized.includes("stale") ||
    normalized.includes("undated") ||
    normalized.includes("partial") ||
    normalized.includes("unknown") ||
    normalized.includes("unavailable")
  ) {
    return "Source coverage warning";
  }
  return humanizeIdentifier(value);
}

function riskIdDisplayLabel(value: string) {
  return riskSignalLabel(value);
}

function monitorEvidenceLabels(evidenceIds: string[]) {
  return uniqueLabels(evidenceIds.map(monitorEvidenceLabel)).slice(0, 4);
}

function monitorEvidenceLabel(evidenceId: string) {
  const normalized = evidenceId.toLowerCase();
  if (normalized.includes("approval") || normalized.includes("allowance")) return "active allowance confirmed";
  if (normalized.includes("transfer") || normalized.includes("dust") || normalized.includes("poison")) return "transfer log with tx hash";
  if (normalized.includes("source") || normalized.includes("coverage")) return "source coverage warning";
  if (normalized.includes("meth") || normalized.includes("cmeth") || normalized.includes("balance") || normalized.includes("inventory")) return "known-token balance evidence";
  if (normalized.includes("yield") || normalized.includes("rwa")) return "yield exposure evidence";
  return "supporting evidence";
}

function alertPrimaryActionLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("approval")) return "Review approval";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Review transfer evidence";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Check source coverage";
  return "Review evidence";
}

function userFacingCopy(value: string) {
  return normalizeUserFacingLabel(String(value || ""))
    .replaceAll(
      "This is based on a Partial scan · unknown fields present scan",
      "This is based on a partial scan with unknown fields"
    )
    .replaceAll(
      "This is based on a PARTIAL_OR_UNKNOWN scan",
      "This is based on a partial scan with unknown fields"
    )
    .replaceAll(
      "fullTokenInventory is unavailable, so missing data remains unknown.",
      "Full token inventory is unavailable, so unknown tokens may be missing from this scan."
    )
    .replaceAll(
      "fullTokenInventory",
      "full token inventory"
    );
}

function canonicalStateLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "coverage_limited_unknown") return "Coverage-limited unknown";
  if (normalized === "direct_risk_found") return "Direct risk found";
  if (normalized === "critical_red_flag") return "Critical red flag";
  if (normalized === "low_risk_with_sufficient_coverage") return "Low risk with sufficient coverage";
  if (normalized === "local_draft") return "Local draft";
  if (normalized === "ready_to_record") return "Ready to record";
  if (normalized === "recorded_on_mantle") return "Recorded on Mantle";
  if (normalized === "verified_matched") return "Verified matched";
  if (normalized === "replay_only") return "Replay proof only";
  if (normalized === "not_recorded_onchain") return "Not recorded on-chain";
  if (normalized === "previous_verified_available") return "Previous verified proof available";
  if (normalized === "current_live_wallet") return "Current live wallet";
  if (normalized === "current_replay_scenario") return "Current replay scenario";
  if (normalized === "all_records") return "All records";
  return userFacingCopy(humanizeIdentifier(String(value || "Not available")));
}

function enhancementStatusLabel(module: EnhancementModule) {
  const status = String(module.status || "");
  if (status === "local_recorded") return "Local fallback record";
  if (module.fallbackUsed && (status.includes("record") || status.includes("local"))) return "Local fallback record";
  return userFacingCopy(humanizeIdentifier(status || "Unavailable"));
}

function enhancementFallbackLabel(module: EnhancementModule) {
  if (module.fallbackUsed) return "Local fallback record";
  return "Provider result";
}

function monitorStatusLabel(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (!normalized) return "Not available";
  if (normalized === "partial_or_unknown" || (normalized.includes("partial") && normalized.includes("unknown"))) {
    return "Partial scan · unknown fields present";
  }
  if (normalized.includes("partial")) return "Partial scan";
  if (normalized.includes("insufficient")) return "Need more history";
  if (normalized.includes("partially_comparable")) return "Partially comparable";
  if (normalized.includes("comparable")) return "Comparable trend";
  if (normalized.includes("source_failed") || normalized.includes("failed") || normalized.includes("error")) return "Source failed";
  if (normalized.includes("safe")) return "No major signal detected";
  if (normalized.includes("risky")) return "Risky";
  return userFacingCopy(humanizeIdentifier(String(status)));
}

function isPartialOrUnknown(status?: string | null) {
  return copyIsPartialOrUnknown(status);
}

function isUnknownCoverageRecord(record?: HistoryRecord) {
  return Boolean(record && isPartialOrUnknown(record.status) && !recordHasDirectRisk(record));
}

function isUnknownCoverageTrendPoint(point?: TrendPoint) {
  return Boolean(point && isPartialOrUnknown(point.dataStatus) && Number(point.walletRiskScore) <= 0);
}

function recordOnlyCoverageWarnings(record?: HistoryRecord) {
  const risks = record?.topRiskSummaries || [];
  if (!risks.length) return false;
  return risks.every((risk) => {
    const text = `${risk.title || ""} ${risk.category || ""} ${risk.riskId || ""}`.toLowerCase();
    return (
      text.includes("source") ||
      text.includes("coverage") ||
      text.includes("partial") ||
      text.includes("unknown") ||
      text.includes("unavailable") ||
      text.includes("indexed")
    );
  });
}

function recordHasDirectRisk(record?: HistoryRecord) {
  const risks = record?.topRiskSummaries || [];
  if (!risks.length) return false;
  return risks.some((risk) => {
    const text = `${risk.title || ""} ${risk.category || ""} ${risk.riskId || ""}`.toLowerCase();
    return (
      text.includes("approval") ||
      text.includes("allowance") ||
      text.includes("spender") ||
      text.includes("transfer") ||
      text.includes("poison") ||
      text.includes("dust") ||
      text.includes("yield") ||
      text.includes("concentration") ||
      text.includes("meth") ||
      text.includes("cmeth") ||
      text.includes("portfolio") ||
      text.includes("exposure")
    );
  });
}

function duplicateAssessmentCopy(record: HistoryRecord) {
  return isBenchmarkRecord(record)
    ? "No material change detected across recent replay assessments."
    : "No material change detected across recent live assessments.";
}

function trendDeltaRiskLevelText(trend: Trend, recordsByAssessmentId: Map<string, HistoryRecord>) {
  const previousPoint = trend.points.length >= 2 ? trend.points[trend.points.length - 2] : undefined;
  const currentPoint = trend.points.length >= 1 ? trend.points[trend.points.length - 1] : undefined;
  const previousRecord = previousPoint ? recordsByAssessmentId.get(previousPoint.assessmentId) : undefined;
  const currentRecord = currentPoint ? recordsByAssessmentId.get(currentPoint.assessmentId) : undefined;
  const previous =
    previousPoint && (previousRecord || isUnknownCoverageTrendPoint(previousPoint))
      ? trendPointRiskLevelLabel(previousPoint, previousRecord)
      : trend.delta?.previousRiskLevel || "Unknown";
  const current =
    currentPoint && (currentRecord || isUnknownCoverageTrendPoint(currentPoint))
      ? trendPointRiskLevelLabel(currentPoint, currentRecord)
      : trend.delta?.currentRiskLevel || "Unknown";
  return `${previous} to ${current}`;
}

function scoreDisplay(value: number) {
  return `${roundedScore(value)} / 100`;
}

function scoreDisplayForRecord(record?: HistoryRecord) {
  if (!record) return "No score";
  if (isUnknownCoverageRecord(record)) return "Not enough data";
  return scoreDisplay(record.riskScore);
}

function scoreDisplayForTrendPoint(point?: TrendPoint) {
  if (!point) return "No score";
  if (isUnknownCoverageTrendPoint(point)) return "Not enough data";
  return scoreDisplay(point.walletRiskScore);
}

function scoreDeltaLabel(value: number) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded === 0) return "No score change";
  return `Δ ${rounded > 0 ? "+" : ""}${rounded}`;
}

function reviewItemTitle(type: string, alert: AlertItem) {
  const normalized = `${type} ${alert.title} ${alert.description || alert.message}`.toLowerCase();
  if (normalized.includes("approval") || normalized.includes("allowance")) return "Approval anomaly";
  if (normalized.includes("transfer") || normalized.includes("poison") || normalized.includes("dust")) return "Suspicious transfer";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Source coverage";
  if (normalized.includes("yield") || normalized.includes("exposure")) return "Yield exposure";
  return alertTypeLabel(type).replace(" alerts", "");
}

function reviewItemRank(type: string, alert: AlertItem) {
  const title = reviewItemTitle(type, alert).toLowerCase();
  if (title.includes("approval")) return 1;
  if (title.includes("transfer") || title.includes("poison")) return 2;
  if (title.includes("source") || title.includes("coverage")) return 3;
  if (title.includes("yield")) return 4;
  return 5;
}

function groupAlerts(alerts: AlertItem[]) {
  const grouped = new Map<string, AlertItem[]>();
  for (const alert of alerts) {
    const key = alert.alertType || alert.type || "alert";
    grouped.set(key, [...(grouped.get(key) || []), alert]);
  }
  return Array.from(grouped.entries()).map(([type, group]) => ({
    type,
    alerts: group,
    openCount: group.filter((alert) => alert.status === "open").length,
    seenCount: group.reduce((sum, alert) => sum + Number(alert.occurrenceCount || 1), 0)
  }));
}

function alertTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("approval")) return "Approval alerts";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Suspicious transfer alerts";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Source coverage alerts";
  if (normalized.includes("score")) return "Risk score alerts";
  if (normalized.includes("level")) return "Risk level alerts";
  if (normalized.includes("commit")) return "On-chain proof alerts";
  return humanizeIdentifier(type);
}

function alertWhyItMatters(alert: AlertItem) {
  const normalized = `${alert.alertType} ${alert.title} ${alert.description || alert.message}`.toLowerCase();
  if (normalized.includes("approval")) return "Why it matters: approvals can allow a spender to move tokens until reviewed or revoked manually.";
  if (normalized.includes("transfer") || normalized.includes("poison")) return "Why it matters: suspicious transfers may indicate address poisoning or misleading wallet history.";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Why it matters: degraded data coverage lowers confidence and must not be read as safety.";
  return "Why it matters: this alert is informational and should be reviewed before taking any non-custodial next step.";
}

function sourceCoverageAvailability(record: HistoryRecord | undefined, trend: Trend): ScanResponse["coverage"]["sourceAvailability"] {
  const statuses = record?.sourceCoverageSummary?.statuses || {};
  const sourceAvailability: ScanResponse["coverage"]["sourceAvailability"] = {};
  Object.entries(statuses).forEach(([name, status]) => {
    sourceAvailability[name] = { status: String(status) };
  });
  if (Object.keys(sourceAvailability).length) return sourceAvailability;
  (trend.sourceCoverageChanges || []).slice(0, 6).forEach((change) => {
    sourceAvailability[change.source] = { status: String(change.current) };
  });
  return sourceAvailability;
}

function historyRecordModeLabel(record: NonNullable<WalletHistoryResponse["records"]>[number]) {
  if (record.mode === "demo") return "Reference scan · replay data";
  return `Live ${record.networkName || networkName(record.chainId)} · ${record.chainId}`;
}

function modeSelectionLabel(mode?: string | null) {
  if (isDemoMode(mode)) return "Reference scan · replay data";
  if (String(mode || "").toLowerCase().includes("live")) return "Live Mantle Sepolia";
  return String(mode || "mode scoped");
}

function isDemoMode(mode?: string | null) {
  return String(mode || "").toLowerCase().includes("demo");
}

function isLiveHistoryContext(mode?: string | null) {
  const normalized = String(mode || "").toLowerCase();
  return normalized.includes("live") && !isDemoMode(normalized);
}

function isLiveHistoryRecord(record?: HistoryRecord) {
  return isLiveHistoryContext(record?.mode);
}

function isBenchmarkRecord(record?: HistoryRecord) {
  if (!record) return false;
  if (isLiveHistoryRecord(record)) return false;
  return isDemoMode(record.mode) || Boolean(record.benchmarkCaseId || record.benchmarkCaseLabel || record.fixtureId);
}

function trendSummaryText(trend: Trend, history: WalletHistoryResponse | null) {
  if (trend.trendSummary) return trend.trendSummary;
  if (!trend.delta) return "Need at least two comparable assessments to show trend.";
  if (trend.delta.scoreDelta === 0) return "Risk unchanged across recent scans.";
  if (trend.delta.scoreDelta < 0 && !trend.delta.improvementConfirmed) {
    return "Risk score decreased, but source coverage or comparability prevents confirming improvement.";
  }
  if (trend.delta.scoreDelta > 0) return "Risk score increased since the previous comparable scan.";
  return isDemoMode(history?.mode || trend.mode) ? "Reference trend is based on replayed data." : "Trend is available with cautious comparability.";
}

function simulationLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("approval")) return "Approval risk simulation";
  if (normalized.includes("portfolio")) return "Portfolio exposure simulation";
  return humanizeIdentifier(type);
}

function simulationActionLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("approval")) return "Simulated action: revoke unlimited USDT approval";
  if (normalized.includes("portfolio")) return "Simulated action: lower mETH/cmETH concentration";
  return `Simulated action: ${simulationLabel(type)}`;
}

function simulationEvidenceReason(type: string, data: ScanResponse) {
  const normalized = type.toLowerCase();
  const risk = simulationEvidenceRisk(type, data);
  const labels = risk ? monitorEvidenceLabels(risk.evidenceIds || risk.evidence_ids || []) : [];
  const evidenceText = labels.length ? joinHumanList(labels) : "the selected risk evidence";
  if (normalized.includes("approval")) {
    return `The risk model selected this action because ${evidenceText} shows an active unlimited approval that can be reviewed before any manual wallet action.`;
  }
  if (normalized.includes("portfolio")) {
    return `The risk model selected this action because ${evidenceText} shows concentrated mETH/cmETH exposure in the known-token portfolio.`;
  }
  return `The risk model selected this action because ${evidenceText} supports a review-only risk reduction path.`;
}

function simulationEvidenceRisk(type: string, data: ScanResponse) {
  const normalized = type.toLowerCase();
  const risks = data.assessment.topRisks || [];
  if (normalized.includes("approval")) return findRisk(risks, ["approval", "allowance", "spender", "unlimited"]) || risks[0];
  if (normalized.includes("portfolio")) return findRisk(risks, ["concentration", "yield", "meth", "cmeth", "rwa", "defi"]) || risks[0];
  return risks[0];
}

function uniqueLabels(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function joinHumanList(items: string[]) {
  if (items.length <= 1) return items[0] || "bound risk evidence";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function shortRecordId(value?: string | null) {
  const text = String(value || "");
  if (text.length <= 24) return text;
  return `${text.slice(0, 12)}...${text.slice(-8)}`;
}

function humanizeIdentifier(value: string) {
  return normalizeUserFacingLabel(String(value || ""))
    .replace(/^ev_/, "")
    .replace(/^risk_/, "")
    .replace(/^act_/, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function severityClass(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("pause")) return "critical";
  if (normalized.includes("high") || normalized.includes("risky") || normalized.includes("mismatch") || normalized.includes("failed")) return "danger";
  if (
    normalized.includes("moderate") ||
    normalized.includes("elevated") ||
    normalized.includes("partial") ||
    normalized.includes("unknown") ||
    normalized.includes("unavailable") ||
    normalized.includes("not available")
  ) return "warn";
  if (
    normalized.includes("pending") ||
    normalized.includes("not recorded") ||
    normalized.includes("not run") ||
    normalized.includes("replay") ||
    normalized.includes("fixture") ||
    normalized.includes("local only") ||
    normalized.includes("local draft") ||
    normalized.includes("idle")
  ) return "neutral";
  return "ok";
}

function shortAddress(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function browserWalletProvider(): BrowserWalletProvider | null {
  const maybeWindow = globalThis as typeof globalThis & { ethereum?: BrowserWalletProvider };
  return maybeWindow.ethereum?.request ? maybeWindow.ethereum : null;
}

async function ensureWalletChain(provider: BrowserWalletProvider, chainId: number) {
  const hexChainId = `0x${Number(chainId).toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }]
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: number }).code : undefined;
    if (code !== 4902 || chainId !== 5003) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexChainId,
          chainName: "Mantle Sepolia",
          nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
          blockExplorerUrls: ["https://sepolia.mantlescan.xyz"]
        }
      ]
    });
  }
}

function isEvmAddress(value?: string | null) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function validatePreparedRevokeTx(txRequest: NonNullable<EnhancementModule["txRequest"]>) {
  if (!isEvmAddress(txRequest.to)) return "Prepared revoke target token address is invalid.";
  if (!String(txRequest.data || "").startsWith("0x095ea7b3")) return "Only ERC20 approve(address,uint256) revoke calldata is allowed.";
  if (String(txRequest.value || "0x0").toLowerCase() !== "0x0") return "Revoke transaction value must be zero.";
  if (!Number.isFinite(Number(txRequest.chainId))) return "Prepared revoke request is missing a chain id.";
  const allowance = txRequest.args?.allowance;
  if (allowance !== undefined && String(allowance) !== "0") return "Only allowance reset to 0 can be sent from this flow.";
  return null;
}

function networkName(chainId: number) {
  if (chainId === 5003) return "Mantle Sepolia";
  if (chainId === 5000) return "Mantle Mainnet";
  return `EVM Chain ${chainId}`;
}

function healthStatusLabel(health: string) {
  if (health.startsWith("ok") || health.startsWith("healthy")) return "System ready";
  if (health === "checking API") return "Checking API";
  return "API unavailable";
}

function scanStatusLabel({
  loading,
  currentData,
  isDemoTarget,
  message
}: {
  loading: boolean;
  currentData: ScanResponse | null;
  isDemoTarget: boolean;
  message: string;
}) {
  if (loading) return message || "Scanning";
  if (message && message !== "Ready") return message;
  if (currentData) return "Scan complete";
  return isDemoTarget ? "Ready to scan demo data" : "Ready for live scan";
}

function focusScanControls() {
  document.querySelector(".scan-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    (document.querySelector('[data-testid="scan-button"]') as HTMLButtonElement | null)?.focus();
  }, 180);
}

function targetOptionLabel(target: ChainTarget) {
  const base = target.label || targetPublicLabel(target);
  if (!target.enabled || !target.supportsReadOnlyScan) {
    return base.toLowerCase().includes("coming soon") ? base : `${base} · Coming soon`;
  }
  return base;
}

function targetPublicLabel(target: ChainTarget) {
  if (!target.chainId) return `${target.name} · Adapter-ready / Coming soon`;
  if (target.environment === "testnet") return `${target.name} · Testnet · ${target.chainId}`;
  return `${target.name} · ${target.chainId}`;
}

function scanTargetHint(target: ChainTarget) {
  if (target.id === demoScanTarget.id) {
    return "Demo scenarios use replay data. Assessment tx proof requires a live Mantle Sepolia scan.";
  }
  if (!target.enabled || !target.supportsReadOnlyScan) {
    return target.description || "Adapter-ready / Coming soon.";
  }
  const proof = target.supportsAssessmentCommit ? "Assessment proof supported." : "Assessment proof unavailable for this target.";
  return `${target.description || "Read-only scan target."} ${proof}`;
}

function commitStatusLabel(status: string) {
  if (status === "recorded") return "success";
  if (status === "recorded_local") return "success";
  if (status === "pending_retry") return "pending";
  if (status === "pending_unavailable") return "failed";
  return status || "none";
}

function statusLabel(status: string) {
  return userFacingCopy(String(status || ""));
}

function chainContextText(assessment: ScanResponse["assessment"], providerStatus: ProviderStatus | null) {
  if (assessment.dataMode === "live") return `Live ${networkName(assessment.chainId)} · read-only · ${assessment.chainId}`;
  const defaultTarget = providerStatus?.chainTargets?.find((target) => target.id === providerStatus.defaultTargetId);
  return `Demo scenario · ${defaultTarget?.name || "Mantle Sepolia"}-compatible data`;
}

function riskScoreImpact(risk: RiskItem) {
  const impact = risk.scoreImpact ?? risk.score_impact ?? risk.scoreContribution ?? risk.score_contribution;
  return Number.isFinite(Number(impact)) ? String(impact) : "unknown";
}

function riskSafeActionLabels(risk: RiskItem) {
  return (risk.recommendedSafeActions || risk.recommended_safe_actions || [])
    .slice(0, 4)
    .map((action) => safeActionLabel(action, action));
}

function safeActionLabel(actionType: string, fallback: string) {
  const normalized = `${actionType} ${fallback}`.toLowerCase();
  if (normalized.includes("simulate") && normalized.includes("revoke")) return "Simulate revoke";
  if (normalized.includes("review") && normalized.includes("spender")) return "Review spender";
  if (normalized.includes("inspect") && normalized.includes("token")) return "Inspect token";
  if (normalized.includes("suspicious")) return "Mark suspicious";
  if (normalized.includes("rescan")) return "Rescan later";
  if (normalized.includes("reduce") && (normalized.includes("meth") || normalized.includes("cmeth"))) return "Simulate lower mETH/cmETH exposure";
  if (normalized.includes("source") || normalized.includes("coverage")) return "Check source coverage";
  if (normalized.includes("revoke")) return "Manual revoke review";
  return fallback;
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 0.000001) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return "0";
  return `${value > 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "unknown";
  return `${Math.round(value * 100)}%`;
}
