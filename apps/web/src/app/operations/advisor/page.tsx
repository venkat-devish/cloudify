import MarketingShell from "@/components/landing/MarketingShell";
import OperationsView from "@/components/landing/OperationsView";

export default function AdvisorPage() {
  return (
    <MarketingShell>
      <OperationsView tab="advisor" />
    </MarketingShell>
  );
}
