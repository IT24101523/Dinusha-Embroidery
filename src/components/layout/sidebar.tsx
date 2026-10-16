"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  CalendarClock, 
  Database, 
  LogOut, 
  ShieldCheck, 
  Activity
} from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface SidebarProps {
  user: SessionUser | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      label: "Production Floor (Live)",
      href: "/production/dashboard",
      icon: Activity,
      roles: ["CEO", "FACTORY_MANAGER", "PRODUCTION_MANAGER", "QUALITY_MANAGER"],
    },
    {
      label: "Production Editor",
      href: "/production/editor",
      icon: CalendarClock,
      roles: ["CEO", "FACTORY_MANAGER", "PRODUCTION_MANAGER"],
    },
    {
      label: "Master Data Portal",
      href: "/master-data",
      icon: Database,
      roles: ["CEO", "FACTORY_MANAGER", "PRODUCTION_MANAGER"],
    },
  ];

  return (
    <aside className="w-64 bg-persian-900 text-white flex flex-col shadow-xl z-20 shrink-0 no-print select-none">
      {/* Brand Header */}
      <div className="p-4 bg-persian-800 border-b border-persian-600/40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
          D
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-extrabold tracking-wide uppercase truncate">Dinusha</h1>
            <span className="bg-blue-500/30 text-blue-100 text-[10px] px-1.5 py-0.2 rounded-full border border-blue-400/30 font-medium">Pvt</span>
          </div>
          <p className="text-[10px] text-blue-200/80 font-semibold uppercase tracking-wider truncate">
            FactoryOps System
          </p>
        </div>
      </div>

      {/* User Info & Role Pill */}
      {user && (
        <div className="px-4 py-3 bg-persian-950/50 border-b border-persian-700/40 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-blue-300 font-mono uppercase tracking-wide truncate">
              {user.role.replace(/_/g, " ")}
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-black uppercase text-blue-300/60 px-3 pt-2 pb-1 tracking-wider">
          Operations & Monitoring
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-persian-600 text-white shadow-md shadow-persian-950/20"
                  : "text-blue-200 hover:text-white hover:bg-persian-800/80"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-persian-700/50 bg-persian-950/60">
        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-200 hover:text-white bg-persian-800/60 hover:bg-rose-900/60 transition-colors border border-persian-600/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
