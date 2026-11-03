import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";
import { getPendingBadges } from "@/lib/pending";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export async function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const badges = user.roles.includes("ADMIN") ? await getPendingBadges() : null;
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar roles={user.roles} badges={badges ?? undefined} />
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
