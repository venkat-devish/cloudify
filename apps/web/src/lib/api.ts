import type {
  DocReference,
  ResourceValidation,
  Suggestion,
  TerraformPlanResult,
  Topology,
  TopologyInsights,
} from "./types";
import { isClientMockApi } from "./client-mock";
import * as mock from "./mock-backend";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) throw new Error(body.message);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
    }
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

export async function createSession(mode: string, topology: Topology) {
  if (isClientMockApi()) {
    await delay();
    return mock.mockCreateSession(mode, topology);
  }
  return json<{ sessionId: string }>(
    await fetch(`${base}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, topology }),
    }),
  );
}

export async function getSession(sessionId: string) {
  if (isClientMockApi()) {
    await delay(120);
    return mock.mockGetSession(sessionId);
  }
  return json<{ sessionId: string; topology: Topology }>(await fetch(`${base}/api/v1/sessions/${sessionId}`));
}

export async function analyzeSession(sessionId: string) {
  if (isClientMockApi()) {
    await delay(400);
    return mock.mockAnalyze(sessionId);
  }
  return json<{ canContinue: boolean; suggestions: Suggestion[]; docReferences: DocReference[] }>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/analyze`, { method: "POST" }),
  );
}

export async function getValidation(sessionId: string) {
  if (isClientMockApi()) {
    await delay(200);
    return mock.mockValidation(sessionId);
  }
  return json<ResourceValidation[]>(await fetch(`${base}/api/v1/sessions/${sessionId}/validation`));
}

export async function fetchTopologyInsights(topology: Topology) {
  if (isClientMockApi()) {
    await delay(300);
    return mock.mockInsights(topology);
  }
  return json<TopologyInsights>(
    await fetch(`${base}/api/v1/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topology }),
    }),
  );
}

export async function generateTerraform(sessionId: string) {
  if (isClientMockApi()) {
    await delay(500);
    return mock.mockGenerateTerraform(sessionId);
  }
  return json<{ files: Record<string, string>; fileCount: number; totalLines: number }>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/terraform`, { method: "POST" }),
  );
}

export async function runTerraformPipeline(sessionId: string, apply: boolean) {
  if (isClientMockApi()) {
    await delay(600);
    return {
      success: true,
      initOutput: "Terraform initialized",
      validateOutput: "Success! The configuration is valid.",
      planOutput: "Plan: 4 to add, 0 to change, 0 to destroy.",
      applyOutput: apply ? "Apply complete!" : undefined,
      applied: apply,
    } satisfies TerraformPlanResult;
  }
  return json<TerraformPlanResult>(
    await fetch(`${base}/api/v1/sessions/${sessionId}/terraform/run?apply=${apply}`, { method: "POST" }),
  );
}

export async function createPullRequest(sessionId: string) {
  if (isClientMockApi()) {
    await delay(450);
    return mock.mockPullRequest(sessionId);
  }
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
  if (isClientMockApi()) {
    await delay(700);
    return mock.mockImport(projectName, file);
  }
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