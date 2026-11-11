"use client";

import { AWS_RESOURCES } from "@/lib/aws-resources";
import type { AwsResourceType } from "@/lib/types";

export default function ResourcePalette({
  onDragStart,
}: {
  onDragStart: (e: React.DragEvent, type: AwsResourceType) => void;
}) {
  const byCategory = AWS_RESOURCES.reduce<Record<string, typeof AWS_RESOURCES>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r-2 border-slate-300 bg-white p-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">AWS resources</h2>
      <p className="mt-1 text-xs text-slate-600">Drag to canvas · double-click to edit</p>
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="mt-4">
          <p className="text-xs font-bold text-slate-500">{cat}</p>
          <ul className="mt-2 space-y-2">
            {items.map((p) => (
              <li
                key={p.type}
                draggable
                onDragStart={(e) => onDragStart(e, p.type)}
                className="flex cursor-grab items-center gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 px-2 py-2 active:cursor-grabbing hover:border-rose-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.iconUrl} alt="" className="h-8 w-8" />
                <span className="text-sm font-semibold text-slate-900">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
