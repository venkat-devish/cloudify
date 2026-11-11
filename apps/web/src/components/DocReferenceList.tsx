"use client";

import Image from "next/image";
import type { DocReference } from "@/lib/types";
import { docRefAriaLabel, docRefLogoPath, docRefShortLabel } from "@/lib/doc-reference-ui";

export default function DocReferenceList({ refs }: { refs: DocReference[] }) {
  if (refs.length === 0) {
    return <p className="text-sm text-slate-600">No registry links for this topology.</p>;
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-3">
      {refs.map((d) => (
        <li key={d.resourceType}>
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            title={d.title}
            aria-label={docRefAriaLabel(d)}
            className="group inline-flex items-center gap-2 text-sm font-medium text-slate-800 transition hover:text-violet-800"
          >
            <Image
              src={docRefLogoPath(d.url, d.category)}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 object-contain"
            />
            <span className="border-b border-transparent group-hover:border-violet-400">
              {docRefShortLabel(d.resourceType)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
