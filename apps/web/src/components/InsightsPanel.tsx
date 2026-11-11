"use client";

import type { TopologyInsights } from "@/lib/types";
import { metaForType } from "@/lib/aws-resources";
import type { AwsResourceType } from "@/lib/types";

function severityClass(severity: string) {
  if (severity === "warning") return "border-amber-300 bg-amber-50 text-amber-950";
  if (severity === "error") return "border-rose-300 bg-rose-50 text-rose-950";
  return "border-sky-200 bg-sky-50 text-sky-950";
}

function priorityClass(priority: string) {
  if (priority === "high") return "text-rose-700";
  if (priority === "medium") return "text-amber-700";
  return "text-slate-600";
}

export type InsightsTab = "monitoring" | "advisor" | "billing";

export default function InsightsPanel({
  tab,
  insights,
  loading,
  error,
  compact,
}: {
  tab: InsightsTab;
  insights: TopologyInsights | null;
  loading: boolean;
  error: string | null;
  compact?: boolean;
}) {
  if (loading && !insights) {
    return <p className="text-sm text-slate-600">Loading insights…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
        {error}
        <span className="mt-1 block text-xs text-rose-700">Start the API on port 8080 to load live advisor data.</span>
      </p>
    );
  }
  if (!insights) {
    return <p className="text-sm text-slate-600">Insights unavailable.</p>;
  }

  if (tab === "monitoring") {
    return (
      <div className={`space-y-3 ${compact ? "" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested CloudWatch alerts</p>
        {insights.monitoringAlerts.length === 0 ? (
          <p className="text-sm text-slate-600">No monitoring gaps detected.</p>
        ) : (
          <ul className="space-y-2">
            {insights.monitoringAlerts.map((a) => (
              <li
                key={`${a.code}-${a.resourceId ?? "global"}`}
                className={`rounded-lg border p-3 text-sm ${severityClass(a.severity)}`}
              >
                <p className="font-semibold">{a.title}</p>
                <p className={`mt-1 leading-snug opacity-90 ${compact ? "line-clamp-3" : ""}`}>{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (tab === "advisor") {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Architecture advisor</p>
        <p className="text-xs text-slate-500">Cost, resilience, and load recommendations from the topology graph.</p>
        {insights.recommendations.length === 0 ? (
          <p className="text-sm text-slate-600">No additional improvements flagged.</p>
        ) : (
          <ul className="space-y-2">
            {insights.recommendations.map((r, idx) => (
              <li key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{r.title}</span>
                  <span className={`text-[10px] font-bold uppercase ${priorityClass(r.priority)}`}>{r.priority}</span>
                </div>
                <p className="mt-1 text-xs font-medium uppercase text-slate-500">{r.category}</p>
                <p className={`mt-1 leading-snug text-slate-700 ${compact ? "line-clamp-3" : ""}`}>{r.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated monthly spend</p>
      <p className="text-2xl font-semibold text-slate-900">
        ${insights.estimatedMonthlyUsd.toFixed(2)}
        <span className="ml-1 text-sm font-normal text-slate-500">USD</span>
      </p>
      <p className="text-xs leading-relaxed text-slate-500">{insights.billingDisclaimer}</p>
      {insights.billingLines.length > 0 && (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-semibold">Resource</th>
              <th className="pb-2 text-right font-semibold">$/mo</th>
            </tr>
          </thead>
          <tbody>
            {insights.billingLines.map((line) => (
              <tr key={line.resourceId} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <p className="font-medium text-slate-900">{line.resourceName}</p>
                  <p className="text-slate-500">
                    {metaForType(line.resourceType as AwsResourceType)?.shortLabel ?? line.resourceType}
                  </p>
                </td>
                <td className="py-2 text-right font-mono text-slate-800">${line.monthlyUsd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
