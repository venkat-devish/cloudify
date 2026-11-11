import MarketingShell from "@/components/landing/MarketingShell";
import OperationsView from "@/components/landing/OperationsView";

export default function MonitoringPage() {
  return (
    <MarketingShell>
      <OperationsView tab="monitoring" />
    </MarketingShell>
  );
}
