"use client";

import type { ReactNode } from "react";
import PrDeployLoader from "@/components/PrDeployLoader";

const WIZARD_STATUS: Record<1 | 2 | 3 | 4, { title: string; detail: string }> = {
  1: {
    title: "Analyzing topology",
    detail: "Applying graph rules and resolving Terraform Registry references.",
  },
  2: {
    title: "Loading architecture",
    detail: "Fetching validation status for each resource.",
  },
  3: {
    title: "Generating Terraform",
    detail: "Composing multi-file HCL from the session topology.",
  },
  4: {
    title: "Creating pull request",
    detail: "Pushing infra/ to GitHub and opening a feature branch.",
  },
};

export default function WorkflowLoader({
  step,
  variant = "wizard",
}: {
  step?: 1 | 2 | 3 | 4;
  variant?: "wizard" | "session";
}) {
  if (variant === "session") {
    return (
      <LoaderPanel title="Creating session" detail="Starting workflow with your diagram snapshot.">
        <Spinner />
      </LoaderPanel>
    );
  }

  const s = step ?? 1;
  const { title, detail } = WIZARD_STATUS[s];

  if (s === 4) {
    return <PrDeployLoader label={title} detail={detail} />;
  }

  return (
    <LoaderPanel title={title} detail={detail}>
      <Spinner />
    </LoaderPanel>
  );
}

function LoaderPanel({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-center text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">{detail}</p>
      <div className="mt-8 flex justify-center">{children}</div>
    </div>
  );
}

function Spinner() {
  return <div className="workflow-spinner h-10 w-10 rounded-full border-[3px] border-slate-200 border-t-rose-600" aria-hidden />;
}
