import { buildDispatcherEnterpriseSnapshot, rankDriversForLoad } from "./dispatcherEnterpriseEngine";
import { getDispatchSlaDashboard } from "./dispatcherSlaEngine";
import { buildDispatchProfitabilityDashboard } from "./dispatcherProfitabilityEngine";

export const DISPATCHER_COPILOT_PROMPTS = [
  "Which loads are at risk right now?",
  "Who is the best driver for this load?",
  "Which loads have low margin?",
  "Which delivered loads are missing POD?",
  "Which drivers are available near this lane?",
  "What should I update brokers about first?",
];

export function buildDispatcherCopilotRecommendations({ loads = [], drivers = [], trucks = [] } = {}) {
  const snapshot = buildDispatcherEnterpriseSnapshot({ loads, drivers, trucks });
  const sla = getDispatchSlaDashboard(loads);
  const profitability = buildDispatchProfitabilityDashboard(loads);
  const recommendations = [];

  if (sla.critical > 0) recommendations.push({ priority: "critical", title: "Resolve critical SLA alerts", detail: `${sla.critical} critical SLA issue(s) need dispatcher action.` });
  if (snapshot.critical_exceptions > 0) recommendations.push({ priority: "critical", title: "Review critical exceptions", detail: `${snapshot.critical_exceptions} critical dispatch exception(s) detected.` });
  if (profitability.negative_loads > 0 || profitability.low_margin_loads > 0) recommendations.push({ priority: "high", title: "Review load margin", detail: `${profitability.negative_loads} negative and ${profitability.low_margin_loads} low-margin load(s).` });
  if (snapshot.sla.unassigned > 0) recommendations.push({ priority: "medium", title: "Assign open loads", detail: `${snapshot.sla.unassigned} active load(s) are not assigned.` });
  if (snapshot.sla.delivered_missing_pod > 0) recommendations.push({ priority: "medium", title: "Collect missing PODs", detail: `${snapshot.sla.delivered_missing_pod} delivered load(s) are missing POD.` });

  return {
    generated_at: new Date().toISOString(),
    recommendations,
    prompts: DISPATCHER_COPILOT_PROMPTS,
    top_matching_loads: snapshot.matching_board.slice(0, 5),
    sla_summary: sla,
    profitability_summary: profitability,
  };
}

export function answerDispatcherCopilotPrompt(prompt = "", context = {}) {
  const text = String(prompt).toLowerCase();
  const loads = context.loads || [];
  const drivers = context.drivers || [];
  if (text.includes("best driver") && context.load) {
    return { type: "driver_match", matches: rankDriversForLoad(context.load, drivers) };
  }
  const recs = buildDispatcherCopilotRecommendations(context);
  if (text.includes("risk") || text.includes("alert")) return { type: "risk_summary", recommendations: recs.recommendations };
  if (text.includes("margin")) return { type: "profitability", profitability: recs.profitability_summary };
  if (text.includes("pod")) return { type: "pod", missing: loads.filter((load) => ["delivered", "completed"].includes(load.status) && !load.pod_uploaded && !load.pod_document_id) };
  return { type: "recommendations", recommendations: recs.recommendations, prompts: recs.prompts };
}
