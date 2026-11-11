"use client";

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"] as const;
const VALUES = [42, 48, 51, 47, 55, 58] as const;
const MAX = Math.max(...VALUES);

export default function BillingUsageChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Monthly spend trend</p>
          <p className="mt-0.5 text-xs text-slate-500">Sample workload · USD · mock data</p>
        </div>
        <p className="text-lg font-semibold text-slate-900">
          ${VALUES[VALUES.length - 1]}
          <span className="text-sm font-normal text-emerald-600"> +5.4%</span>
        </p>
      </div>
      <div className="mt-6 flex h-40 items-end justify-between gap-2 border-b border-slate-100 pb-2">
        {VALUES.map((v, i) => (
          <div key={MONTHS[i]} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">${v}</span>
            <div
              className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400"
              style={{ height: `${(v / MAX) * 100}%`, minHeight: "12px" }}
              role="presentation"
            />
            <span className="text-[10px] font-medium text-slate-600">{MONTHS[i]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Lambda and API Gateway drive most variance; connect Cost Explorer for live curves in production.
      </p>
    </div>
  );
}
