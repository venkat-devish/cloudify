"use client";

export default function PrDeployLoader({
  label = "Creating pull request",
  detail = "Pushing infra/ to GitHub and opening a feature branch.",
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-900 px-6 py-8 text-slate-100 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-center text-sm font-semibold">{label}</p>
      <p className="mt-1 text-center text-xs text-slate-400">{detail}</p>
      <div className="relative mt-8 h-24">
        <div
          className="absolute right-4 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border border-emerald-500/50 bg-slate-950 shadow-[inset_0_0_20px_rgba(16,185,129,0.35)]"
          aria-hidden
        />
        <div className="pr-deploy-track absolute left-2 top-1/2 flex -translate-y-1/2 items-center gap-2" aria-hidden>
          <div className="rounded border border-slate-600 bg-slate-800 px-2.5 py-2 font-mono text-[11px] font-medium text-slate-200">
            infra/
          </div>
          <p className="font-mono text-[10px] text-slate-500">*.tf</p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">Terraform plan runs on the pull request in GitHub Actions.</p>
    </div>
  );
}
