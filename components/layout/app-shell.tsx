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
    <div className="app-shell-root min-h-screen">
      <Sidebar user={user} roles={user.roles} badges={badges} />
      <div className="min-h-screen md:py-2.5 md:pl-60 md:pr-2.5">
        <div className="app-canvas flex min-h-screen flex-col md:min-h-[calc(100vh-20px)] md:rounded-[18px] md:shadow-[-2px_0_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.85)]">
          <header className="relative z-30 flex h-12 items-center justify-between gap-4 px-4 pt-2 md:px-8 md:pt-3.5">
            <Breadcrumbs />
            <span className="hidden items-center gap-2 rounded-full bg-[#115740]/[0.075] px-3 py-1 text-[11.5px] font-medium text-[#115740] md:inline-flex">
              自强 · 弘毅 · 求是 · 拓新
            </span>
            <div className="md:hidden">
              <UserMenu user={user} />
            </div>
          </header>
          <main className="flex-1 px-4 pb-24 pt-2 md:px-8 md:pb-9 md:pt-2.5">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}
