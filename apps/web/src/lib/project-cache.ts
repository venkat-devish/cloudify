export type DraftPayload = {
  nodes: unknown[];
  edges: unknown[];
  projectName: string;
  terraformVersion: string;
  awsProviderVersion: string;
};

const DRAFT_PREFIX = "cloudify:draft:";

export function saveDraft(projectName: string, draft: DraftPayload) {
  localStorage.setItem(DRAFT_PREFIX + projectName, JSON.stringify(draft));
}

export function loadDraft(projectName: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + projectName);
    return raw ? (JSON.parse(raw) as DraftPayload) : null;
  } catch {
    return null;
  }
}

export function removeDraft(projectName: string) {
  localStorage.removeItem(DRAFT_PREFIX + projectName);
}
