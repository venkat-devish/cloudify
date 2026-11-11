import { Suspense } from "react";
import Link from "next/link";
import CloudifyLogo from "@/components/CloudifyLogo";
import WorkflowWizard from "./WorkflowWizard";

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <CloudifyLogo size={28} showWordmark wordmarkClassName="font-semibold text-rose-700" />
        </Link>
        <span className="text-sm text-slate-500">workflow</span>
      </header>
      <Suspense fallback={<p className="p-8">Loading workflow…</p>}>
        <WorkflowWizard />
      </Suspense>
    </div>
  );
}
