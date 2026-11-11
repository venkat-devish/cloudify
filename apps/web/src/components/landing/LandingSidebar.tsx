"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import CloudifyLogo, { LOGO_SRC } from "@/components/CloudifyLogo";
import {
  IconAdvisor,
  IconBilling,
  IconEditor,
  IconHome,
  IconImport,
  IconMonitoring,
  IconOnCall,
} from "./SidebarIcons";

const STORAGE_KEY = "cloudify:sidebar-collapsed";

function isCanvasRoute(path: string) {
  return path === "/create" || path === "/upload";
}

const WORKSPACE = [
  {
    href: "/create",
    label: "Architecture editor",
    hint: "Draw on canvas",
    Icon: IconEditor,
  },
  {
    href: "/upload",
    label: "Import diagram",
    hint: "Image or Draw.io",
    Icon: IconImport,
  },
] as const;

const OPERATIONS = [
  { href: "/operations/on-call", label: "On-call alerts", Icon: IconOnCall, highlight: true },
  { href: "/operations/monitoring", label: "Monitoring setup", Icon: IconMonitoring },
  { href: "/operations/advisor", label: "Architecture advisor", Icon: IconAdvisor },
  { href: "/operations/billing", label: "Billing & usage", Icon: IconBilling },
] as const;

function navClass(active: boolean) {
  return active
    ? "bg-slate-700 text-white"
    : "text-slate-200 hover:bg-slate-700/80 hover:text-white";
}

function NavIcon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
        active
          ? "border-rose-500/50 bg-rose-600 text-white"
          : "border-slate-600 bg-slate-700 text-slate-200"
      }`}
    >
      {children}
    </span>
  );
}

export default function LandingSidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isCanvasRoute(path)) {
      setCollapsed(true);
      return;
    }
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, [path]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (!isCanvasRoute(path)) {
        try {
          localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-700 bg-slate-800 text-sm text-slate-100 transition-[width] duration-200 ease-out ${
        collapsed ? "w-[84px]" : "w-[272px]"
      }`}
    >
      <div className={`border-b border-slate-700 ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}>
        <Link href="/" className={`flex items-center ${collapsed ? "justify-center" : ""}`} title="Cloudify home">
          {collapsed ? (
            <Image
              src={LOGO_SRC}
              alt="Cloudify"
              width={48}
              height={48}
              className="rounded-xl object-cover ring-2 ring-rose-500/30"
            />
          ) : (
            <CloudifyLogo size={44} subtitle="Diagram → Terraform → PR" />
          )}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <Link
          href="/"
          title="Home"
          className={`flex items-center rounded-xl py-2 font-medium ${collapsed ? "justify-center px-1" : "gap-3 px-2"} ${navClass(path === "/")}`}
        >
          <NavIcon active={path === "/"}>
            <IconHome />
          </NavIcon>
          {!collapsed && <span>Home</span>}
        </Link>

        {!collapsed ? (
          <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Build</p>
        ) : (
          <div className="my-3 border-t border-slate-700" aria-hidden />
        )}
        {WORKSPACE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={`${item.label} — ${item.hint}`}
            className={`flex items-center rounded-xl py-2 font-medium ${collapsed ? "justify-center px-1" : "gap-3 px-2"} ${navClass(path === item.href)}`}
          >
            <NavIcon active={path === item.href}>
              <item.Icon />
            </NavIcon>
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate">{item.label}</span>
                <span className="block truncate text-xs font-normal text-slate-400">{item.hint}</span>
              </span>
            )}
          </Link>
        ))}

        {!collapsed ? (
          <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Operations</p>
        ) : (
          <div className="my-3 border-t border-slate-700" aria-hidden />
        )}
        {OPERATIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`relative flex items-center rounded-xl py-2 font-medium ${collapsed ? "justify-center px-1" : "gap-3 px-2 pr-3"} ${navClass(path === item.href)}`}
          >
            <NavIcon active={path === item.href}>
              <item.Icon />
            </NavIcon>
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {"highlight" in item && item.highlight && path !== item.href && (
                  <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
                )}
              </>
            )}
            {collapsed && "highlight" in item && item.highlight && path !== item.href && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" aria-hidden />
            )}
          </Link>
        ))}
      </nav>

      <div className={`border-t border-slate-700 ${collapsed ? "p-2" : "px-3 py-3"}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-700/80 py-2.5 font-mono text-sm tracking-widest text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white ${
            collapsed ? "px-1" : "px-3"
          }`}
        >
          {collapsed ? "»»»" : "«««"}
        </button>
      </div>
    </aside>
  );
}
