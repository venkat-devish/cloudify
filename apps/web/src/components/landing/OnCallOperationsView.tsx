"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTopologyInsights } from "@/lib/api";
import { LANDING_SAMPLE_TOPOLOGY } from "@/lib/sample-topology";
import type { TopologyInsights } from "@/lib/types";
import OnCallAlertsPanel from "./OnCallAlertsPanel";

export default function OnCallOperationsView() {
  const [insights, setInsights] = useState<TopologyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTopologyInsights(LANDING_SAMPLE_TOPOLOGY)
      .then(setInsights)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load alerts"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">On-call alerts</h1>
      <p className="mt-2 text-slate-600">
        Failed integrations, timeouts, DLQ growth, and CloudWatch error bursts — surfaced for the engineer on rotation.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <OnCallAlertsPanel
          alerts={insights?.onCallAlerts ?? null}
          loading={loading}
          error={error}
        />
      </div>

      <Link
        href="/create"
        className="mt-8 inline-flex rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Open architecture editor
      </Link>
    </div>
  );
}
