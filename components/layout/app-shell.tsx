import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";
import { getPendingBadges, getTeamPendingRequests } from "@/lib/pending";
import { countPendingAdminRegistrations } from "@/lib/admin-users";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageTransition } from "@/components/layout/page-transition";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export async function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const isAdmin = user.roles.includes("ADMIN");
  const isStudent = user.roles.includes("STUDENT");
  const [adminBadges, teamRequests, adminUsers] = await Promise.all([
    isAdmin ? getPendingBadges() : Promise.resolve(null),
    isStudent ? getTeamPendingRequests(user.id) : Promise.resolve(0),
    isAdmin ? countPendingAdminRegistrations() : Promise.resolve(0),
  ]);
  const badges = {
    review: adminBadges?.review ?? 0,
    changes: adminBadges?.changes ?? 0,
    teamRequests,
    adminUsers,
  };
  return (
    <div className="app-canvas min-h-screen bg-background">
      {/* 顶部 2px 武大双色屋脊细线（珞珈蓝 → 珞珈绿） */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[2px] bg-gradient-to-r from-[#002554] via-[#0c3f4a] to-[#115740]" />
      <Sidebar roles={user.roles} badges={badges} />
      <div className="min-h-screen md:pl-60">
        <header className="app-shell-header sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#e5e0d5] px-4 md:px-6">
          <Breadcrumbs />
          <UserMenu user={user} />
        </header>
        <main className="px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
