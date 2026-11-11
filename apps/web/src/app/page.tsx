import MarketingShell from "@/components/landing/MarketingShell";
import BuildEntryCards from "@/components/landing/BuildEntryCards";
import LandingHeroBackground from "@/components/landing/LandingHeroBackground";

export default function Home() {
  return (
    <MarketingShell>
      <div className="relative min-h-screen overflow-hidden">
        <LandingHeroBackground />

        <div className="relative mx-auto max-w-3xl px-6 py-12 sm:py-16 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">Infrastructure as code</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Draw the system. Cloudify writes the code.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-700">
            You do not hand-author Terraform or pipeline YAML. Model AWS on the canvas, and Cloudify generates{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-sm text-slate-800 shadow-sm">infra/</code>, validates
            it, opens a GitHub pull request, and runs plan in Actions—delivery stays reviewable without manual HCL.
          </p>

          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Start here</p>
            <div className="mt-3">
              <BuildEntryCards />
            </div>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
