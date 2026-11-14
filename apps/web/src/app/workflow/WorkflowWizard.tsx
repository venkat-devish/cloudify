"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopologyCanvas from "@/components/TopologyCanvas";
import {
  analyzeSession,
  createPullRequest,
  generateTerraform,
  getSession,
  getValidation,
} from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import DocReferenceList from "@/components/DocReferenceList";
import WorkflowLoader from "@/components/WorkflowLoader";
import type { DocReference, ResourceValidation, Suggestion, Topology } from "@/lib/types";

const STEPS = ["Analyze", "Architecture", "Terraform", "Delivery"];

export default function WorkflowWizard() {
  const search = useSearchParams();
  const router = useRouter();
  const sessionId = search.get("sessionId") ?? "";
  const step = Math.min(4, Math.max(1, Number(search.get("step") ?? "1")));

  const [topology, setTopology] = useState<Topology | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [docRefs, setDocRefs] = useState<DocReference[]>([]);
  const [canContinue, setCanContinue] = useState(false);
  const [validations, setValidations] = useState<ResourceValidation[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [prUrl, setPrUrl] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [prMock, setPrMock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<"file" | "all" | null>(null);

  const validationMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of validations) m[v.nodeId] = v.status;
    return m;
  }, [validations]);


  const copyTerraform = async (mode: "file" | "all") => {
    const text = mode === "file" ? files[selectedFile] ?? "" : Object.entries(files).map(([p, c]) => `// ${p}\n${c}`).join("\n\n");
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyHint(mode);
      setTimeout(() => setCopyHint(null), 2500);
    } else {
      setError("Copy failed — allow clipboard access for this site.");
    }
  };

  const goStep = useCallback(
    (n: number) => {
      const mode = search.get("mode") ?? "create";
      router.push(`/workflow?mode=${mode}&sessionId=${sessionId}&step=${n}`);
    },
    [router, search, sessionId],
  );

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((s) => setTopology(s.topology))
      .catch(() => setTopology(null));
  }, [sessionId]);

  const runStep = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      if (step === 1) {
        const res = await analyzeSession(sessionId);
        setSuggestions(res.suggestions);
        setDocRefs(res.docReferences ?? []);
        setCanContinue(res.canContinue);
      } else if (step === 2) {
        setValidations(await getValidation(sessionId));
      } else if (step === 3) {
        const res = await generateTerraform(sessionId);
        setFiles(res.files);
        setSelectedFile(Object.keys(res.files)[0] ?? "");
      } else if (step === 4) {
        const res = await createPullRequest(sessionId);
        setPrUrl(res.pullRequestUrl);
        setBranch(res.branchName);
        setPrMock(res.mock);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [sessionId, step]);

  useEffect(() => {
    void runStep();
  }, [runStep]);

  if (!sessionId) {
    return <p className="p-8 font-medium text-slate-800">Missing session. Start from the diagram editor.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-2 text-sm font-semibold">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 ${i + 1 === step ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-800"}`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {loading && (
        <div className="py-8">
          <WorkflowLoader step={step as 1 | 2 | 3 | 4} />
        </div>
      )}
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-2 font-medium text-rose-900">{error}</p>}

      {step === 1 && !loading && (
        <section className="space-y-6">
          <h1 className="text-2xl font-bold text-slate-900">Analyze topology</h1>
          <p className="text-sm text-slate-600">
            Validation checks plus monitoring, security, and cost hints from the architecture advisor.
          </p>
          {!suggestions.some((s) => s.severity === "error") && suggestions.length > 0 && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900">
              No blocking validation errors — review operational suggestions below.
            </p>
          )}
          <ul className="space-y-2">
            {suggestions.length === 0 && (
              <li className="font-medium text-slate-600">No suggestions yet — add resources on the canvas and run analyze again.</li>
            )}
            {suggestions.map((s, idx) => (
              <li key={idx} className="rounded-lg border-2 border-slate-300 bg-white p-4 text-sm text-slate-900">
                <span className="font-bold uppercase text-slate-600">{s.severity}</span> — {s.message}
                {s.docUrl && (
                  <a className="ml-2 font-semibold text-sky-800 underline" href={s.docUrl} target="_blank" rel="noreferrer">
                    Terraform docs
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="rounded-xl border-2 border-slate-300 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">Terraform Registry references</h2>
            <p className="mt-1 text-sm text-slate-600">
              HashiCorp provider docs · AWS {topology?.awsProviderVersion ?? "—"}
            </p>
            <DocReferenceList refs={docRefs} />
          </div>
        </section>
      )}

      {step === 2 && !loading && topology && (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Architecture</h1>
            <p className="mt-1 text-sm text-slate-700">Connected diagram with AWS icons (from your canvas layout).</p>
            <div className="mt-4 h-[420px]">
              <TopologyCanvas topology={topology} validationStatus={validationMap} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resource status</h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl border-2 border-slate-300 bg-white">
              {validations.map((v) => (
                <li key={v.nodeId} className="flex justify-between px-4 py-3 text-sm font-medium text-slate-900">
                  <span>
                    {v.name} <span className="text-slate-500">({v.type})</span>
                  </span>
                  <span className={v.status === "READY" ? "text-green-800" : "text-amber-800"}>{v.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {step === 3 && !loading && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Terraform</h1>
              <p className="mt-1 text-sm text-slate-700">
                Preview only. <strong>init / plan</strong> run on the PR in GitHub Actions; <strong>apply</strong> runs after merge and environment approval.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold ${copyHint === "file" ? "border-green-600 bg-green-50 text-green-800" : "border-slate-800 bg-white text-slate-900"}`}
                onClick={() => void copyTerraform("file")}
              >
                {copyHint === "file" ? "Copied ✓" : "Copy file"}
              </button>
              <button
                type="button"
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold ${copyHint === "all" ? "border-green-600 bg-green-50 text-green-800" : "border-slate-800 bg-white text-slate-900"}`}
                onClick={() => void copyTerraform("all")}
              >
                {copyHint === "all" ? "Copied ✓" : "Copy all"}
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="rounded-xl border-2 border-slate-300 bg-white p-3 text-sm">
              <p className="mb-2 font-bold text-slate-700">INFRA/</p>
              <ul className="space-y-1">
                {Object.keys(files).map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      className={`w-full rounded px-2 py-1 text-left font-medium ${selectedFile === path ? "bg-rose-100 text-rose-900" : "text-slate-900"}`}
                      onClick={() => setSelectedFile(path)}
                    >
                      {path.replace("infra/", "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <pre className="max-h-[45vh] overflow-auto rounded-xl border-2 border-slate-800 bg-slate-900 p-4 text-xs text-slate-100">
              {files[selectedFile] ?? "Select a file"}
            </pre>
          </div>
        </section>
      )}

      {step === 4 && !loading && !error && (
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Delivery handoff</h1>
          <p className="mt-2 text-slate-700">
            {prMock
              ? "Pull request handoff (sandbox): infra was generated and a feature branch name was assigned — same UX as production without pushing to GitHub."
              : "Pull request opened. Review the plan in GitHub Actions, merge to main, then approve apply in the target environment."}
          </p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {prMock && (
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
                Demo PR
              </span>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Feature branch</p>
            <p className="mt-1 font-mono text-sm text-slate-900">{branch || "—"}</p>
            {prUrl ? (
              <a
                href={prUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                {prMock ? "Open pull request (demo)" : "Open pull request"}
              </a>
            ) : null}
            {prMock && (
              <p className="mt-3 text-xs text-slate-500">
                Opens a GitHub compare link for the generated branch name (no files pushed in sandbox mode).
              </p>
            )}
          </div>
        </section>
      )}

      {step === 4 && !loading && error && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-lg font-bold text-rose-950">Could not open pull request</h2>
          <p className="mt-2 text-sm text-rose-900">{error}</p>
          <button
            type="button"
            onClick={() => void runStep()}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between border-t-2 border-slate-300 pt-6">
        <button type="button" className="text-sm font-semibold text-slate-800" disabled={step <= 1} onClick={() => goStep(step - 1)}>
          ← Back
        </button>
        <span className="text-sm font-medium text-slate-600">Step {step} of 4</span>
        {step < 4 ? (
          <button
            type="button"
            disabled={step === 1 && !canContinue}
            onClick={() => goStep(step + 1)}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <Link href="/" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">
            Done
          </Link>
        )}
      </div>
    </div>
  );
}
