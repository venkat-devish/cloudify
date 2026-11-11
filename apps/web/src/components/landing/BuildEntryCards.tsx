import Image from "next/image";
import Link from "next/link";

const ENTRIES = [
  {
    href: "/create",
    src: "/brand/architecture-editor.svg",
    title: "Architecture editor",
    blurb: "Drag AWS blocks, connect the flow, generate Terraform.",
    primary: true,
  },
  {
    href: "/upload",
    src: "/brand/diagram-import.svg",
    title: "Import diagram",
    blurb: "Upload a screenshot or Draw.io file—we read the architecture.",
    primary: false,
  },
] as const;

export default function BuildEntryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ENTRIES.map((entry) => (
        <Link
          key={entry.href}
          href={entry.href}
          className={`group flex flex-col rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
            entry.primary
              ? "border-rose-200 bg-white hover:border-rose-300"
              : "border-slate-200 bg-white/95 hover:border-slate-300"
          }`}
        >
          <Image
            src={entry.src}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 transition group-hover:scale-105"
          />
          <h2 className="mt-4 text-base font-semibold text-slate-900">{entry.title}</h2>
          <p className="mt-1 text-sm leading-snug text-slate-600">{entry.blurb}</p>
          <span
            className={`mt-4 text-sm font-semibold ${
              entry.primary ? "text-rose-700 group-hover:text-rose-800" : "text-sky-800 group-hover:text-sky-900"
            }`}
          >
            Open →
          </span>
        </Link>
      ))}
    </div>
  );
}
