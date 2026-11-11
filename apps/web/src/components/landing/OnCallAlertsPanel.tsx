"use client";

import type { OnCallAlert } from "@/lib/types";

function severityStyles(severity: string) {
  if (severity === "critical") return "border-rose-400 bg-rose-50";
  if (severity === "warning") return "border-amber-400 bg-amber-50";
  return "border-sky-300 bg-sky-50";
}

function severityDot(severity: string) {
  if (severity === "critical") return "bg-rose-600";
  if (severity === "warning") return "bg-amber-500";
  return "bg-sky-500";
}

export default function OnCallAlertsPanel({
  alerts,
  loading,
  error,
}: {
  alerts: OnCallAlert[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !alerts) {
    return <p className="text-sm text-slate-600">Loading on-call signals…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
        {error}
        <span className="mt-1 block text-xs">Start the API on port 8080 for live demo data.</span>
      </p>
    );
  }
  if (!alerts || alerts.length === 0) {
    return <p className="text-sm text-slate-600">No active signals for this topology.</p>;
  }

  const firing = alerts.filter((a) => a.status === "firing").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{firing} firing</span>
        {" · "}synthetic signals for portfolio demo — wire to CloudWatch alarms and log filters in production.
      </p>
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li
            key={`${a.code}-${a.resourceName}-${a.detectedAt}`}
            className={`rounded-xl border p-4 ${severityStyles(a.severity)}`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot(a.severity)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {a.status}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug text-slate-700">{a.message}</p>
                <p className="mt-2 font-mono text-xs text-slate-600">{a.metricSummary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Resource <span className="font-medium text-slate-800">{a.resourceName}</span>
                  {" · "}Logs{" "}
                  <code className="rounded bg-white/70 px-1 text-[11px]">{a.logGroup}</code>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
