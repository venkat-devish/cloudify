import type {
  DocReference,
  ResourceValidation,
  Suggestion,
  TerraformPlanResult,
  Topology,
  TopologyInsights,
} from "./types";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function createSession(mode: string, topology: Topology) {
  return json<{ sessionId: string }>(
    await fetch(`${base}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, topology }),
    }),
  );
}

export async function getSession(sessionId: string) {
  return json<{ sessionId: string; topology: Topology }>(await fetch(`${base}/api/v1/sessions/${sessionId}`));
}

export async function analyzeSession(sessionId: string) {
  return json<{ canContinue: boolean; suggestions: Suggestion[]; docReferences: DocReference[] }>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/analyze`, { method: "POST" }),
  );
}

export async function getValidation(sessionId: string) {
  return json<ResourceValidation[]>(await fetch(`${base}/api/v1/sessions/${sessionId}/validation`));
}

export async function fetchTopologyInsights(topology: Topology) {
  return json<TopologyInsights>(
    await fetch(`${base}/api/v1/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topology }),
    }),
  );
}

export async function generateTerraform(sessionId: string) {
  return json<{ files: Record<string, string>; fileCount: number; totalLines: number }>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/terraform`, { method: "POST" }),
  );
}

export async function runTerraformPipeline(sessionId: string, apply: boolean) {
  return json<TerraformPlanResult>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/terraform/run?apply=${apply}`, { method: "POST" }),
  );
}

export async function createPullRequest(sessionId: string) {
  return json<{ branchName: string; pullRequestUrl: string; mock: boolean }>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/pull-request`, { method: "POST" }),
  );
}

export type ImportAnalyzeResponse = {
  sessionId: string;
  topology: Topology;
  source: "drawio" | "image";
  visionProvider?: string;
  mock: boolean;
  message: string;
  nodeCount: number;
  edgeCount: number;
};

export async function importDiagram(file: File, projectName: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("projectName", projectName);
  return json<ImportAnalyzeResponse>(
    await fetch(`${base}/api/v1/import`, {
      method: "POST",
      body: form,
    }),
  );
}
