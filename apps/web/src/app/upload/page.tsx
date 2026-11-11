import Image from "next/image";
import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import UploadDiagramForm from "@/components/UploadDiagramForm";

export default function UploadPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-6 py-16 sm:py-20">
        <Image src="/brand/diagram-import.svg" alt="" width={48} height={48} className="h-12 w-12" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Import diagram</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          PNG or Draw.io in—we turn it into a topology, then validate, Terraform, and PR.
        </p>
        <div className="mt-8">
          <UploadDiagramForm />
        </div>
        <Link href="/create" className="mt-8 inline-block text-sm font-semibold text-sky-800 hover:text-sky-900">
          Use the architecture editor instead →
        </Link>
      </div>
    </MarketingShell>
  );
}
