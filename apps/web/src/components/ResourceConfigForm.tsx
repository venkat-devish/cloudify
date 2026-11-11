"use client";

import type { AwsResourceType } from "@/lib/types";
import { defaultsFor, fieldsFor, labelWithMarkers, type FieldDef } from "@/lib/resource-fields";

export function ResourceConfigForm({
  resourceType,
  values,
  onChange,
  nameValue,
  onNameChange,
}: {
  resourceType: AwsResourceType;
  values: Record<string, string | number | boolean>;
  onChange: (next: Record<string, string | number | boolean>) => void;
  nameValue: string;
  onNameChange: (v: string) => void;
}) {
  const fields = fieldsFor(resourceType);

  const setField = (key: string, val: string | number | boolean) => {
    onChange({ ...values, [key]: val });
  };

  const renderField = (f: FieldDef) => {
    if (f.key === "name") {
      return (
        <label key={f.key} className="mt-3 block text-sm font-semibold text-slate-800">
          {labelWithMarkers(f)}
          <span className="mt-0.5 block text-xs font-normal text-slate-500">Shown on the canvas and used in Terraform.</span>
          <input
            className="cloudify-input mt-1 w-full rounded-md px-3 py-2 text-sm"
            value={nameValue}
            onChange={(e) => {
              const v = e.target.value;
              onNameChange(v);
              setField("name", v);
            }}
            placeholder={f.placeholder}
          />
        </label>
      );
    }
    const raw = values[f.key];
    const hasValue = raw !== undefined && raw !== null && !(f.type === "string" && raw === "");
    const v = hasValue ? raw : f.default ?? (f.type === "number" ? f.default : "");
    if (f.type === "select" && f.options) {
      return (
        <label key={f.key} className="mt-3 block text-sm font-semibold text-slate-800">
          {labelWithMarkers(f)}
          <select
            className="cloudify-input mt-1 w-full rounded-md px-3 py-2 text-sm"
            value={String(v)}
            onChange={(e) => setField(f.key, e.target.value)}
          >
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (f.type === "boolean") {
      return (
        <label key={f.key} className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={Boolean(values[f.key] ?? f.default)}
            onChange={(e) => setField(f.key, e.target.checked)}
          />
          {labelWithMarkers(f)}
        </label>
      );
    }
    if (f.type === "number") {
      const numDefault = f.default !== undefined ? Number(f.default) : 0;
      const numVal = hasValue ? Number(raw) : numDefault;
      return (
        <label key={f.key} className="mt-3 block text-sm font-semibold text-slate-800">
          {labelWithMarkers(f)}
          <input
            type="number"
            className="cloudify-input mt-1 w-full rounded-md px-3 py-2 text-sm"
            value={numVal}
            onChange={(e) => setField(f.key, Number(e.target.value))}
          />
        </label>
      );
    }
    return (
      <label key={f.key} className="mt-3 block text-sm font-semibold text-slate-800">
        {labelWithMarkers(f)}
        <input
          className="cloudify-input mt-1 w-full rounded-md px-3 py-2 text-sm"
          value={hasValue ? String(raw) : ""}
          onChange={(e) => setField(f.key, e.target.value)}
          placeholder={f.placeholder}
        />
      </label>
    );
  };

  return <div>{fields.map(renderField)}</div>;
}

export function validateResourceConfig(
  resourceType: AwsResourceType,
  name: string,
  values: Record<string, string | number | boolean>,
): string | null {
  if (!name.trim()) return "Name is required *";
  for (const f of fieldsFor(resourceType)) {
    if (!f.required || f.key === "name") continue;
    const v = values[f.key];
    if (v === undefined || v === "") return `${f.label} is required *`;
  }
  return null;
}

export function mergeDefaults(resourceType: AwsResourceType, values: Record<string, string | number | boolean>) {
  return { ...defaultsFor(resourceType), ...values };
}
