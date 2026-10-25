import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={user.role} />
      <div className="min-h-screen md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <Breadcrumbs />
          <UserMenu user={user} />
        </header>
        <main className="px-4 pb-24 pt-6 md:px-6 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
