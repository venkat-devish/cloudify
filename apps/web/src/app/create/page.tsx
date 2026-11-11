import MarketingShell from "@/components/landing/MarketingShell";
import DiagramEditor from "./DiagramEditor";

export default function CreatePage() {
  return (
    <MarketingShell mainClassName="flex min-h-0 flex-col overflow-hidden">
      <DiagramEditor />
    </MarketingShell>
  );
}
