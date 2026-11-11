import MarketingShell from "@/components/landing/MarketingShell";
import OperationsView from "@/components/landing/OperationsView";

export default function BillingPage() {
  return (
    <MarketingShell>
      <OperationsView tab="billing" />
    </MarketingShell>
  );
}
