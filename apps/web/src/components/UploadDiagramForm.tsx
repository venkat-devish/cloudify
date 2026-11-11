"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { importDiagram } from "@/lib/api";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.drawio,.xml,application/xml";

export default function UploadDiagramForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("imported-diagram");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const onPick = (f: File | null) => {
    setFile(f);
    setError(null);
    setLastResult(null);
    if (preview) URL.revokeObjectURL(preview);
    if (f?.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const analyze = async () => {
    if (!file) {
      setError("Choose a diagram file first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await importDiagram(file, projectName.trim() || "imported-diagram");
      const hint = res.mock
        ? `${res.message} Continuing with demo topology.`
        : `${res.nodeCount} nodes, ${res.edgeCount} edges via ${res.visionProvider ?? res.source}.`;
      setLastResult(hint);
      router.push(`/workflow?sessionId=${encodeURIComponent(res.sessionId)}&step=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="my-service"
        />
      </div>

      <div
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-sky-400 hover:bg-sky-50/40"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onPick(f);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Diagram preview" className="mx-auto max-h-48 rounded-lg object-contain" />
        ) : (
          <p className="text-sm text-slate-600">
            Drop PNG, JPG, WebP, or Draw.io (.drawio / XML)
            <br />
            <span className="text-slate-500">Click to browse</span>
          </p>
        )}
        {file && (
          <p className="mt-3 text-xs font-medium text-slate-700">
            {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Images use vision analysis when configured
      </p>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      {lastResult && !error && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{lastResult}</p>
      )}

      <button
        type="button"
        disabled={loading || !file}
        onClick={analyze}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Analyze & continue to workflow"}
      </button>
    </div>
  );
}
