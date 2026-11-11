"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { metaForType } from "@/lib/aws-resources";
import type { AwsResourceType } from "@/lib/types";

export type AwsNodeData = {
  label: string;
  resourceType: AwsResourceType;
  runtime?: string;
  config?: Record<string, string | number | boolean>;
  logRetentionDays?: number;
  status?: string;
};

export function AwsResourceNode({ data, selected }: NodeProps) {
  const d = data as AwsNodeData;
  const meta = metaForType(d.resourceType);
  const border = selected ? meta?.brandColor ?? "#e11d48" : "#cbd5e1";
  const title =
    d.label?.trim() ||
    (typeof d.config?.name === "string" ? d.config.name.trim() : "") ||
    meta?.shortLabel ||
    d.resourceType.replace(/^aws_/, "").replace(/_/g, " ");

  return (
    <div
      className="min-w-[200px] rounded-xl border-2 bg-white px-3 py-2 shadow-md"
      style={{ borderColor: border }}
    >
      {d.resourceType !== "external_client" && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!h-3 !w-3 !border-2 !border-rose-600 !bg-white"
        />
      )}
      <div className="flex items-center gap-3">
        {meta?.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.iconUrl} alt="" width={40} height={40} className="shrink-0 rounded-md" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          <p className="truncate text-xs font-medium text-slate-600">{meta?.label ?? d.resourceType}</p>
          {d.config?.runtime && <p className="text-xs text-slate-500">Runtime: {String(d.config.runtime)}</p>}
          {d.config?.logRetentionDays && <p className="text-xs text-slate-500">Logs: {String(d.config.logRetentionDays)}d</p>}
          {d.config?.retentionDays && <p className="text-xs text-slate-500">Retention: {String(d.config.retentionDays)}d</p>}
          {d.status && (
            <p className={`text-xs font-semibold ${d.status === "READY" ? "text-green-700" : "text-amber-700"}`}>
              {d.status}
            </p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!h-3 !w-3 !border-2 !border-rose-600 !bg-white"
      />
    </div>
  );
}
