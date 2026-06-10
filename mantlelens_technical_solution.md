# MantleLens Wallet Guard 技术方案

## 项目定位

MantleLens Wallet Guard 应被实现为一个面向 Mantle 用户的钱包风险代理系统，用于扫描 approvals、可疑转账、资产集中度、DeFi 暴露和 RWA/yield 风险，并把结果组织成可解释、可模拟、可存证的评估流程。[cite:1] PRD 明确将其定位为 “evidence-grounded, on-chain benchmarkable AI agent workflow”，而不是普通的投资组合看板或单纯的安全 API 聚合器。[cite:1]

从系统方法论上，技术方案必须遵守五条底线：Data before reasoning、Evidence before claims、Rules before LLM、Simulation before execution、Benchmark before reputation。[cite:1] 这意味着系统核心不是“让模型决定一切”，而是建立一个白盒风险内核，并在其外层使用受控 Agent 完成工具编排、解释生成和交互控制。[cite:1]

## 建设目标

P0 阶段的目标不是提供生产级钱包安全评级，而是快速交付一个可演示、可验证、可扩展的 MVP。[cite:1] 该 MVP 至少应完成：钱包输入、结构化扫描、风险评分、证据绑定、plain-language explanation、simulation-only 动作建议、链上 assessment hash 记录、benchmark history 展示。[cite:1]

系统必须显式支持 partial scan、known-token-only scan、replay 模式和 rule-based fallback。[cite:1] PRD 也明确要求：缺失数据不能被静默标记为安全，GoPlus clean result 只是信号而不是保证，P0 不执行真实 revoke 或真实交易。[cite:1]

## 总体技术路线

推荐采用“四层式”架构：Protocol Layer、Agent Control Layer、Workflow Layer、Wallet Safety Kernel。[cite:1] 这种结构能把对外接口、Agent 灵活性、固定工作流和白盒风险核心清晰解耦。[cite:1]

| 层 | 职责 | 设计原则 |
|---|---|---|
| Protocol Layer | 对外提供 REST API、MCP、agent-card、registration file [cite:1] | 稳定 schema、低耦合 |
| Agent Control Layer | 负责意图识别、状态机、策略控制、受限 ReAct [cite:1] | Agent 受 policy 和状态约束 |
| Workflow Layer | 执行 Scan、Evaluate、Explain、Simulate、Commit、Replay 等流程 [cite:1] | 可写清楚的步骤显式工作流化 |
| Wallet Safety Kernel | 完成风险评分、红旗规则、证据绑定、simulation、hash 和存证 [cite:1] | 100% 白盒、LLM 不可进入 |

这种技术路线的关键思想是：workflow 提供确定性，agent 提供有限弹性。[cite:1] 对一个安全敏感系统来说，这种结构比开放式自治 agent 更稳，也更容易做 harness、replay 和审计。[cite:1]

## 前端方案

### 前端定位

前端应被实现为一个 **Agent Workspace**，而不是自由聊天页面。[cite:1] PRD 中已经明确要求展示 Wallet Risk Dashboard、Top Risks、Suggested Actions、Approval Risk Panel、Suspicious Transfer Panel、Portfolio Exposure、RWA Yield Risk、Evidence Detail、On-chain Record 和 Benchmark History，因此前端本质上是一个风险工作台。[cite:1]

建议页面采用“左输入、右工作台、侧边追踪抽屉”的布局。[cite:1] 这种结构既保留 agent 产品的交互感，也保证证据和状态可视化足够清晰。[cite:1]

### 页面结构

推荐主页面拆成以下区域：

- 左侧：Wallet Input、Connect Wallet、Agent Feed、Quick Actions。[cite:1]
- 中间：Risk Score、Top Risks、Suggested Actions、各风险面板。[cite:1]
- 右侧抽屉：Evidence Detail、Trace Inspector、Benchmark History、Agent Identity。[cite:1]

页面内部采用 tabs 或 drawer 组织，不建议一开始做过多独立页面。[cite:1] 这样更符合 Hackathon MVP 的开发效率要求。[cite:1]

### 核心组件

建议前端至少包含以下组件：

- `WalletInputCard`
- `AgentStatusFeed`
- `RiskScoreCard`
- `TopRisksList`
- `SuggestedActionsCard`
- `DataCoverageBanner`
- `ApprovalRiskTable`
- `SuspiciousTransferTable`
- `PortfolioExposurePanel`
- `RwaYieldRiskPanel`
- `EvidenceDrawer`
- `SimulationDiffCard`
- `OnChainRecordCard`
- `BenchmarkHistoryTable`
- `AgentIdentityPanel`
- `TraceInspectorDrawer`[cite:1]

此外，建议新增两个体现 agent 特征的组件：`AgentStepTimeline` 和 `GuardrailBanner`。[cite:1] 前者展示 tool calls、状态切换、耗时和当前阶段，后者显式提示 partial scan、source unavailable、step limit、repeat-call block 等状态。[cite:1]

### 前端状态管理

前端状态不应只分为 loading 和 loaded，而应与 agent 状态机保持一致。[cite:1] 建议至少维护：`idle`、`scanning`、`evaluating`、`explaining`、`simulation_ready`、`simulation_running`、`commit_pending`、`committed`、`partial_data`、`failed_retryable`。[cite:1]

这样用户可以明确理解“为什么现在不能 commit”“为什么当前只能 simulation-only”“为什么结果是 partial 而不是完整”。[cite:1]

### 前端技术栈

建议前端采用 Next.js、TypeScript、Tailwind CSS、shadcn/ui、wagmi、viem 和 TanStack Query。[cite:1] 该组合适合实现钱包连接、风险控制台和链上记录查看，同时也有利于快速构建高质量 MVP。[cite:1]

TanStack Query 负责 scan、assessment、simulation、benchmark history 这类异步数据获取和缓存；wagmi/viem 用于钱包接入、Mantle 链交互和 assessment 记录查看。[cite:1] 这套栈既满足功能要求，也便于后续扩展到多链或更多 agent-facing protocol。[cite:1]

## 后端方案

### 后端定位

后端不是简单的 API 层，而是整个系统的执行核心。[cite:1] 它需要同时承担协议门面、Agent 控制、Workflow 编排、白盒风险计算、证据组织、simulation 计算和链上存证等职责。[cite:1]

因此推荐后端实现为“Protocol + Agent Control + Workflow + Safety Kernel”的多层服务，而不是一组扁平 controller。[cite:1] 这种做法更适合后续做 replay harness、trace attribution 和 MCP 暴露。[cite:1]

### 后端技术栈

推荐使用 FastAPI、Pydantic、PostgreSQL、Redis 和 Celery 或 Dramatiq。[cite:1] FastAPI 与 Pydantic 非常适合承载 PRD 中大量结构化 schema，例如 WalletRiskAssessment、Evidence、MetricResult、SuggestedAction、WalletRiskAssessmentRecord。[cite:1]

PostgreSQL 用于持久化 assessment、evidence、simulation、benchmark、tool traces；Redis 用于缓存钱包扫描结果、价格、source availability 和 explanation 任务状态；异步任务队列用于 explanation、simulation 和 async commit。[cite:1] 这与 PRD 的性能目标是匹配的：wallet first response 5s、full assessment 15s、AI explanation 10s、assessment commit async。[cite:1]

### 后端模块划分

建议后端代码至少拆成以下模块：

- `api/`：REST endpoints 与响应 schema。[cite:1]
- `protocols/`：MCP endpoint、agent-card、registration files。[cite:1]
- `agent/`：intent resolver、planner、policy engine、state machine、trace manager。[cite:1]
- `workflows/`：scan、assessment、explanation、simulation、commit、replay。[cite:1]
- `adapters/`：Mantle RPC、GoPlus、CoinGecko、DeFiLlama、RWA module。[cite:1]
- `kernel/`：risk engine、red flags、normalization、decision mapping。[cite:1]
- `evidence/`：claim binding、evidence hashing、bundle assembly。[cite:1]
- `ledger/`：assessment commit、outcome record、benchmark queries。[cite:1]
- `harness/`：tool、risk、evidence、LLM、simulation、on-chain、UI harness。[cite:1]

这种模块拆法与 PRD 的 Agent Architecture、API、Memory、Harness、Benchmarking 和 ERC-8004/MCP 设计一致。[cite:1]

## Agent 方案

### Agent 角色定义

MantleLens 中的 Agent 应被定义为 **受限编排代理**。[cite:1] 它负责理解当前用户动作意图、选择下一个 workflow、协调 tool 调用、维护 run memory，并在结构化 assessment 生成后调用 explanation model 输出自然语言结果。[cite:1]

Agent 不负责评分、不负责覆盖硬规则、不负责直接生成最终证据。[cite:1] 风险判断、红旗判定、evidence bundle、simulation diff 和 assessment hash 都必须由白盒模块产生。[cite:1]

### Agent 控制层

Agent Control Layer 建议由以下子模块构成：

- `Intent Resolver`：识别 scan / explain / simulate / commit / history。[cite:1]
- `Planner`：根据当前状态选择下一条 workflow。[cite:1]
- `Policy Engine`：校验权限、步骤预算、重复调用、side effect 等限制。[cite:1]
- `State Machine`：控制状态流转。[cite:1]
- `Trace Manager`：记录 step trace、tool calls、policy decisions、state transitions。[cite:1]
- `Reflection Hook`：仅做轻量 progress / termination reflection。[cite:1]

其中最关键的是 Policy Engine 和 State Machine，因为它们共同决定 Agent 的边界。[cite:1]

### 状态机设计

建议状态机至少包括以下状态：

- `INIT`
- `DATA_GATHERING`
- `RISK_EVALUATING`
- `EVIDENCE_BINDING`
- `EXPLAINING`
- `SIMULATING`
- `READY_TO_COMMIT`
- `COMMITTED`
- `PARTIAL_OR_UNKNOWN`
- `FAILED_RETRYABLE`[cite:1]

状态机要与 workflow 节点一一对应，这样才能确保 explanation 只能建立在 assessment 之后，commit 只能发生在 hash 准备完成并通过 policy 验证之后。[cite:1]

### 受限 ReAct 与策略控制

Agent 可以采用 ReAct 思路，但必须是 Policy-bounded ReAct。[cite:1] 也就是说，Agent 的每一步 action 必须同时满足三个条件：当前状态允许、policy engine 允许、tool schema 校验通过。[cite:1]

建议加入以下 guardrails：

- 单次 run 最多 10 个 step。[cite:1]
- 相同 tool + 相同参数最多重复 2 次。[cite:1]
- explanation 最多重试 2 次，失败后回退到 rule-based explanation。[cite:1]
- 数据不足直接进入 `PARTIAL_OR_UNKNOWN`，不继续假装完整推理。[cite:1]
- commit 失败后进入 `pending_retry`，不做无限重试。[cite:1]

### Agent 与 Workflow 的关系

Workflow 是骨架，Agent 是控制层。[cite:1] 推荐显式实现以下 workflows：

- `ScanWorkflow`
- `AssessmentWorkflow`
- `ExplanationWorkflow`
- `SimulationWorkflow`
- `CommitWorkflow`
- `ReplayWorkflow`[cite:1]

Agent 只负责决定调用哪个 workflow 以及是否进入下一阶段。[cite:1] Workflow 内部步骤必须确定性执行，不依赖大模型自由规划。[cite:1]

## Tool 方案

### Tool Registry

PRD 已明确列出 P0 tools，包括 `getNativeBalance`、`getKnownTokenBalances`、`getTokenApprovals`、`confirmActiveAllowance`、`getSpenderLabels`、`getTransactionCount`、`getTransferLogs`、`getTokenPrices`、`getTokenSecurity`、`getRwaYieldExposure`、`evaluateWalletRisk`、`buildEvidenceBundle`、`commitAssessment`、`recordOutcome`。[cite:1]

建议工具分成三层：

| 层级 | 示例工具 | 职责 |
|---|---|---|
| Raw Tools | `getNativeBalance`、`getTransferLogs`、`confirmActiveAllowance` [cite:1] | 获取原始结构化事实 |
| Derived Tools | `getApprovalRisks`、`getSuspiciousTransfers`、`getWalletExposure` [cite:1] | 在原始事实基础上形成中间风险对象 |
| Decision Tools | `evaluateWalletRisk`、`buildEvidenceBundle`、`simulatePortfolioAdjustment`、`recordWalletAssessment` [cite:1] | 形成正式 assessment、simulation 与提交结果 |

### Tool 元数据与权限分级

每个工具建议补充以下元数据：`tool_id`、`version`、`required_state`、`side_effect_level`、`max_retries`、`requires_confirmation`、`fallback_policy`、`idempotency_key`。[cite:1] 这样 planner、policy engine 和 watchdog 才能正确工作。[cite:1]

同时建议按权限分三类：

- Read-only：读取 balances、approvals、transfers、exposure。[cite:1]
- Analytical：执行 evaluate、evidence build、simulation。[cite:1]
- State-changing：执行 assessment commit、outcome record。[cite:1]

State-changing tools 必须经过 policy engine 二次确认，并记录完整审计 trace。[cite:1]

## Memory 方案

### Memory 分类

PRD 已定义五类 memory：Run Memory、Evidence Memory、Assessment Memory、Config Memory、Source Availability Memory。[cite:1] 在实现时，建议进一步按生命周期管理它们。[cite:1]

| 类型 | 生命周期 | 内容 |
|---|---|---|
| Run Memory | 单次 run 内有效 | 当前 wallet、当前步骤、当前 tool outputs、当前 action [cite:1] |
| Source Availability Memory | 单次 assessment 周期有效 | RPC、GoPlus、价格源、Moralis 等可用性 [cite:1] |
| Evidence Memory | 长期保留 | evidence objects、hash、source、txHash、limitation [cite:1] |
| Assessment Memory | 长期保留 | assessment、top risks、simulation outcome、commit 状态 [cite:1] |
| Config Memory | 长期保留并版本化 | 评分权重、红旗表、阈值、allowlist、prompt versions [cite:1] |

### Memory 设计要求

必须保留原始 records，而不是只保留摘要。[cite:1] Summary memory 只能作为辅助检索项，不能替代原始 evidence、tool output 或 assessment JSON，因为后者是链上 benchmark、审计和 replay 的基础。[cite:1]

## 风险引擎与证据层

### 风险评分框架

P0 风险评分采用固定阈值分桶和红旗覆盖机制。[cite:1] PRD 明确给出了五个维度：Approval Risk、Suspicious Transfer Risk、Asset Concentration Risk、RWA Yield Risk、DeFi Exposure Stub，以及对应的权重、规则和 red flags。[cite:1]

风险引擎的职责包括：

- 聚合各数据源结果。[cite:1]
- 计算各子分数和 Wallet Risk Score。[cite:1]
- 应用红旗覆盖规则。[cite:1]
- 输出 Data Confidence、DecisionType、ActionType。[cite:1]
- 生成用于 explanation 和 simulation 的结构化 assessment。[cite:1]

### 证据层

证据层必须确保每个风险 claim 都有可追溯 evidence。[cite:1] 每条 evidence 至少要包含：`evidenceId`、`type`、`source`、`endpoint`、`rawData`、`txHash`、`timestamp`、`evidenceHash`、`dataQuality`、`limitation`。[cite:1]

建议 assessment 中的 Top Risks、Suggested Actions 和 Explanation 都通过 evidenceId 回指到 evidence bundle，而不是直接散落自然语言描述。[cite:1] 这是系统“evidence-grounded”最关键的技术落实方式。[cite:1]

## API 方案

### 核心 API

P0 API 建议基本按 PRD 落地：

| Endpoint | Method | 作用 |
|---|---|---|
| `/api/wallet/scan` | POST | 扫描钱包并返回 WalletRiskAssessment [cite:1] |
| `/api/wallet/balances` | GET | 返回 known-token balances [cite:1] |
| `/api/wallet/approvals` | GET | 返回 approvals 与 active allowance 结果 [cite:1] |
| `/api/wallet/transfers` | GET | 返回 recent transfers [cite:1] |
| `/api/wallet/exposure` | GET | 返回 RWA/yield exposure [cite:1] |
| `/api/wallet/data-availability` | GET | 返回 source availability 与 data completeness [cite:1] |
| `/api/risk/evaluate-wallet` | POST | 运行风险引擎 [cite:1] |
| `/api/agent/explain` | POST | 基于 assessment package 输出 explanation [cite:1] |
| `/api/simulation/approval` | POST | 模拟 revoke approval 影响 [cite:1] |
| `/api/simulation/portfolio` | POST | 模拟资产调整影响 [cite:1] |
| `/api/assessment/commit` | POST | 提交 assessmentHash [cite:1] |
| `/api/assessment/outcome` | POST | 记录 outcomeHash [cite:1] |
| `/api/benchmark` | GET | 查询 benchmark history [cite:1] |

### API 设计原则

API 必须坚持三项原则：事实层与解释层分离、workflow 边界清晰、幂等与可追踪。[cite:1] 例如 `/api/agent/explain` 不应直接接受原始 RPC 数据，而应只接受 assessment package；`/api/assessment/commit` 必须带 idempotency key 和 trace id；`/api/wallet/scan` 必须明确返回 data completeness 状态。[cite:1]

## 数据库与持久化

建议 PostgreSQL 至少建立以下核心表：

- `wallet_assessments`
- `assessment_subscores`
- `assessment_top_risks`
- `evidence_items`
- `simulation_runs`
- `benchmark_records`
- `source_availability_snapshots`
- `agent_runs`
- `tool_calls`
- `policy_events`
- `workflow_runs`[cite:1]

其中 `agent_runs`、`tool_calls`、`policy_events` 和 `workflow_runs` 对后续 harness、trace attribution 和 replay 极其重要。[cite:1] 它们不应被当作普通 debug 日志，而应作为系统一等数据资产管理。[cite:1]

## 协议与生态接入

### MCP 与 Agent Registration

PRD 已明确要求系统具备 ERC-8004 Ready、A2A Agent Card 和 MCP Tools List。[cite:1] 因此 Protocol Layer 应提供：

- `agent-registration.json`
- `.well-known/agent-card.json`
- `mcp` endpoint 和 tools list。[cite:1]

推荐对外暴露的 MCP 工具包括：`scanwalletrisk`、`getwalletexposure`、`getapprovalrisks`、`getsuspicioustransfers`、`getrwayieldrisks`、`getevidencebundle`、`recordwalletassessment`、`getbenchmarkhistory`。[cite:1] 这些工具是对内 Tool Registry 的稳定投影，而不是内部实现的逐一暴露。[cite:1]

## Harness 与质量保障

Harness 是系统设计的一部分，而不是后补测试。[cite:1] P0 阶段应至少覆盖以下 harness：

- Tool Harness：验证 schema、fallback、source 标记、幂等性。[cite:1]
- Risk Harness：验证阈值、权重、红旗覆盖、UNKNOWN circuit breaker。[cite:1]
- Evidence Harness：验证每个 claim 都能绑定 evidence。[cite:1]
- LLM Harness：验证 explanation 不新增 claim、不覆盖规则。[cite:1]
- Simulation Harness：验证 before/after diff 来自白盒重算。[cite:1]
- On-chain Harness：验证 hash 一致性、pending retry、commit trace。[cite:1]
- UI Harness：验证 partial、replay、error、pending 等状态能被正确表达。[cite:1]

建议进一步加入以下质量指标：

- `policy_compliance_rate`
- `trace_completeness`
- `loop_prevention_rate`
- `abstention_accuracy`
- `workflow_selection_accuracy`[cite:1]

## 主流程设计

系统主流程建议严格按下列步骤执行：

1. 用户连接钱包或输入地址。[cite:1]
2. Agent 进入 `DATA_GATHERING`，调用 scan-related workflows。[cite:1]
3. Data adapters 获取 balances、approvals、transfers、exposure、prices。[cite:1]
4. Risk engine 计算 Wallet Risk Score、subscores、dataConfidence、decisionType、actionType。[cite:1]
5. Evidence layer 绑定证据，生成 evidence bundle hash。[cite:1]
6. 前端立即显示 Dashboard 与 Data Coverage。[cite:1]
7. Explanation workflow 调用 LLM 或 fallback rule-based explanation。[cite:1]
8. 用户查看 evidence，并可触发 simulation workflow。[cite:1]
9. 用户确认后执行 commit workflow，把 assessmentHash 写入链上。[cite:1]
10. Benchmark history 更新，完整 run trace 被持久化。[cite:1]

该流程既满足 PRD demo path，也便于 replay 和 harness 验证。[cite:1]

## 阶段规划

### P0

P0 聚焦 Mantle 单链、known-token scan、partial scan 支持、固定阈值风险引擎、evidence bundle、simulation-only、assessment hash 存证、MCP-ready 最小工具集。[cite:1] 不做真实 revoke、不做真实 swap、不做完整 DeFi 深解析、不做 cross-chain 风险模型。[cite:1]

### P1

P1 再补充 keyed indexed APIs、Moralis/Mantlescan 增强、更多协议识别、真实 tx simulation、trend history、alerts、更多 benchmark cases。[cite:1]

### P2

P2 再考虑 cross-chain、full DeFi risk model、ML-calibrated WRS、validation registry、paid agent API 和 guard mode。[cite:1]

## 结论

该技术方案的核心判断是：MantleLens 不应被做成“大模型主导的钱包安全助手”，而应被做成“白盒风险内核 + 受控 Agent 控制层 + 可观测工作流”的系统。[cite:1] 前端是 Agent Workspace，后端是多层控制与执行中枢，Agent 只承担有限规划、解释和交互职责，真正的风险事实、证据和决策由规则内核生成。[cite:1]

这种结构最符合 PRD 的定位、MVP 交付节奏和后续扩展方向。[cite:1] 它能够同时满足可解释、可模拟、可存证、可评测、可通过 MCP/agent card 对外暴露的要求，是当前阶段最合适的技术实现路径。[cite:1]
EOF && python - <<'PY'
from pathlib import Path
p = Path('output/mantlelens_technical_solution_regenerated.md')
text = p.read_text()
text = text.replace('[cite:1]', '[file:1]').replace('[cite:32]','[web:32]').replace('[cite:33]','[web:33]').replace('[cite:37]','[web:37]').replace('[cite:38]','[web:38]').replace('[cite:39]','[web:39]').replace('[cite:40]','[web:40]').replace('[cite:41]','[web:41]').replace('[cite:44]','[web:44]')
p.write_text(text)
PY
head -n 20 output/mantlelens_technical_solution_regenerated.md
