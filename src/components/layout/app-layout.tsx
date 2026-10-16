import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SessionUser } from "@/lib/auth";

interface AppLayoutProps {
  user: SessionUser | null;
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  showLiveTag?: boolean;
}

export function AppLayout({
  user,
  children,
  headerTitle,
  headerSubtitle,
  showLiveTag = false,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden antialiased">
      {/* Global Persian Blue Sidebar */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          showLiveTag={showLiveTag}
        />
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
