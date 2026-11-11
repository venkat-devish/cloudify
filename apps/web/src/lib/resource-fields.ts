import raw from "@/data/resource-fields.json";
import type { AwsResourceType } from "./types";

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  suggested?: boolean;
  type: "string" | "number" | "boolean" | "select";
  default?: string | number | boolean;
  options?: string[];
  placeholder?: string;
};

const byType = raw as Record<string, FieldDef[]>;

export function fieldsFor(type: AwsResourceType): FieldDef[] {
  return byType[type] ?? [{ key: "name", label: "Name", required: true, type: "string" }];
}

export function labelWithMarkers(f: FieldDef): string {
  if (f.required) return `${f.label} *`;
  if (f.suggested) return `${f.label} (Suggested)`;
  return f.label;
}

export function defaultsFor(type: AwsResourceType): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of fieldsFor(type)) {
    if (f.default === undefined) continue;
    if (f.type === "string" && f.default === "") continue;
    out[f.key] = f.default;
  }
  return out;
}
