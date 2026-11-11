"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTopologyInsights } from "@/lib/api";
import { LANDING_SAMPLE_TOPOLOGY } from "@/lib/sample-topology";
import type { TopologyInsights } from "@/lib/types";
import InsightsPanel, { type InsightsTab } from "@/components/InsightsPanel";
import BillingUsageChart from "./BillingUsageChart";

export default function OperationsView({ tab }: { tab: InsightsTab }) {
  const [insights, setInsights] = useState<TopologyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTopologyInsights(LANDING_SAMPLE_TOPOLOGY)
      .then(setInsights)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load insights"))
      .finally(() => setLoading(false));
  }, []);

  const titles: Record<InsightsTab, { h1: string; sub: string }> = {
    monitoring: {
      h1: "Monitoring setup",
      sub: "CloudWatch alarms and metrics suggested from the sample AWS topology.",
    },
    advisor: {
      h1: "Architecture advisor",
      sub: "Load, cost, and security suggestions derived from topology rules.",
    },
    billing: {
      h1: "Billing & usage",
      sub: "Indicative cost breakdown and usage trend for portfolio demos.",
    },
  };

  const { h1, sub } = titles[tab];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{h1}</h1>
      <p className="mt-2 text-slate-600">{sub}</p>

      {tab === "billing" && (
        <div className="mt-8">
          <BillingUsageChart />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <InsightsPanel tab={tab} insights={insights} loading={loading} error={error} />
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
