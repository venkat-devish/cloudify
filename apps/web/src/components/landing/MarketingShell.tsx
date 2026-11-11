import type { ReactNode } from "react";
import LandingSidebar from "./LandingSidebar";

export default function MarketingShell({
  children,
  mainClassName = "overflow-y-auto",
}: {
  children: ReactNode;
  /** e.g. `overflow-hidden flex flex-col min-h-0` for full-height editor */
  mainClassName?: string;
}) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-rose-50">
      <LandingSidebar />
      <main className={`min-h-0 min-w-0 flex-1 ${mainClassName}`}>{children}</main>
    </div>
  );
}
